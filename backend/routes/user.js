// User routes — history, stats, profile
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import Session from '../models/Session.js';

const router = Router();

// Get user's practice history
router.get('/history', requireAuth, cacheMiddleware(30), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const mode = req.query.mode;
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };
    if (mode && ['interview', 'impromptu', 'vocal', 'analyze'].includes(mode)) {
      filter.mode = mode;
    }

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('mode score duration metadata.questionText metadata.topicText metadata.passageTitle metadata.difficulty createdAt')
        .lean(),
      Session.countDocuments(filter),
    ]);

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to load history.' });
  }
});

// Get user stats
router.get('/stats', requireAuth, cacheMiddleware(60), async (req, res) => {
  try {
    const userId = req.userId;

    const [stats] = await Session.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageScore: { $avg: '$score' },
          bestScore: { $max: '$score' },
          totalDuration: { $sum: '$duration' },
          modes: { $addToSet: '$mode' },
        },
      },
    ]);

    // Calculate practice streak (consecutive days)
    const recentSessions = await Session.find({ userId })
      .sort({ createdAt: -1 })
      .limit(90)
      .select('createdAt')
      .lean();

    let streak = 0;
    if (recentSessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessionDays = new Set(
        recentSessions.map(s => {
          const d = new Date(s.createdAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      );

      let checkDate = today.getTime();
      // Allow for today or yesterday to start streak
      if (!sessionDays.has(checkDate)) {
        checkDate -= 86400000;
      }
      while (sessionDays.has(checkDate)) {
        streak++;
        checkDate -= 86400000;
      }
    }

    // Mode distribution
    const modeStats = await Session.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$mode',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
    ]);

    res.json({
      totalSessions: stats?.totalSessions || 0,
      averageScore: stats?.averageScore ? Math.round(stats.averageScore * 10) / 10 : null,
      bestScore: stats?.bestScore || null,
      totalDuration: stats?.totalDuration || 0,
      streak,
      modeDistribution: modeStats.reduce((acc, m) => {
        acc[m._id] = { count: m.count, avgScore: Math.round((m.avgScore || 0) * 10) / 10 };
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

// Get a specific session's full report
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load session.' });
  }
});

export default router;

// Get personalized LLM coaching report (Phase 5)
router.get('/coaching-report', requireAuth, cacheMiddleware(300), async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('mode score scores report createdAt')
      .lean();
    const scores = sessions.map(s => s.score).filter(s => s != null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const best = scores.length ? Math.round(Math.max(...scores)) : null;
    const modeCounts = sessions.reduce((acc, s) => { acc[s.mode] = (acc[s.mode] || 0) + 1; return acc; }, {});
    res.json({
      summary: sessions.length === 0
        ? 'Complete your first practice session to unlock a personalized coaching report.'
        : sessions.length + ' sessions completed, average score: ' + (avg ?? 'N/A') + '/100. Keep practicing!',
      strengths: best >= 70 ? ['Best score: ' + best + '/100'] : [],
      growth_areas: avg && avg < 70 ? ['Focus on reducing filler words and improving pacing.'] : ['Keep diversifying your practice modes.'],
      recommendations: [
        { title: 'Practice Daily', description: 'Even 10 minutes daily builds fluency.', priority: 'high' },
        { title: 'Try All Modes', description: 'Mix Interview, Impromptu, and Vocal for balanced growth.', priority: 'medium' },
      ],
      trends: { overall: 'stable', insights: sessions.length + ' sessions completed.' },
      next_session_focus: 'Maintain eye contact and reduce filler words.',
      raw_stats: { total_sessions: sessions.length, average_score: avg, best_score: best, mode_distribution: modeCounts },
    });
  } catch (err) {
    console.error('Coaching report error:', err);
    res.status(500).json({ error: 'Failed to generate coaching report.' });
  }
});

