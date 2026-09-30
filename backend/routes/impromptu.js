// Impromptu speaking routes — topic generation, speech submission
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';
import Session from '../models/Session.js';

const root = process.env.EVA_ROOT || path.resolve(process.cwd());
const uploadDir = path.join(root, 'Data', 'api-uploads');
const python = process.env.EVA_PYTHON
  || (process.platform === 'win32' ? path.join(root, '.venv', 'Scripts', 'python.exe') : 'python3');

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => done(null, `impromptu-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

const TOPICS = [
  { category: 'Leadership', text: 'What makes a great leader in times of crisis?' },
  { category: 'Technology', text: 'How will artificial intelligence change education in the next decade?' },
  { category: 'Personal Growth', text: 'Describe a failure that taught you more than any success.' },
  { category: 'Society', text: 'Should social media platforms be held responsible for misinformation?' },
  { category: 'Business', text: 'What is the most important quality for an entrepreneur to have?' },
  { category: 'Innovation', text: 'If you could solve one problem with technology, what would it be?' },
  { category: 'Communication', text: 'Why is active listening more important than speaking?' },
  { category: 'Career', text: 'How do you handle disagreements with colleagues professionally?' },
  { category: 'Ethics', text: 'Is it ever acceptable to break a rule if the outcome benefits many people?' },
  { category: 'Creativity', text: 'How does creativity contribute to problem-solving in the workplace?' },
  { category: 'Global Issues', text: 'What is the single most pressing challenge facing humanity today?' },
  { category: 'Education', text: 'Should universities focus more on practical skills or theoretical knowledge?' },
  { category: 'Teamwork', text: 'What is the hardest part about working in a team, and how do you overcome it?' },
  { category: 'Motivation', text: 'What motivates people more: fear of failure or desire for success?' },
  { category: 'Change', text: 'How should organizations handle resistance to change?' },
  { category: 'Culture', text: 'How does cultural diversity strengthen a team?' },
  { category: 'Decision Making', text: 'Describe a time you had to make a decision with incomplete information.' },
  { category: 'Work-Life Balance', text: 'Is work-life balance a myth in today\'s connected world?' },
  { category: 'Communication', text: 'How can someone become a more persuasive speaker?' },
  { category: 'Future', text: 'What skill will be most valuable in the job market 10 years from now?' },
];

// Track recently served topics per user to avoid repeats
const recentTopics = new Map();

const router = Router();

// Get a random topic
router.get('/topic', requireAuth, (req, res) => {
  const userId = req.userId.toString();
  const recent = recentTopics.get(userId) || [];
  const available = TOPICS.filter((_, i) => !recent.includes(i));
  const pool = available.length > 0 ? available : TOPICS;
  const index = TOPICS.indexOf(pool[Math.floor(Math.random() * pool.length)]);
  const topic = TOPICS[index];

  // Remember last 5 topics for this user
  recent.push(index);
  if (recent.length > 5) recent.shift();
  recentTopics.set(userId, recent);

  res.json({
    id: `topic-${index}-${Date.now()}`,
    text: topic.text,
    category: topic.category,
  });
});

// Submit impromptu speech
router.post('/submit', requireAuth, videoUpload.single('video'), async (req, res) => {
  const filePath = req.file?.path;
  const { topicId } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Video recording is required.' });

  try {
    // Use the full pipeline for analysis
    const result = await new Promise((resolve, reject) => {
      // For impromptu, we use a generic expected text since there's no script
      execFile(python, ['-m', 'app.api_bridge', filePath, '--expected-text', 'impromptu free speech response'], {
        cwd: root,
        timeout: Number(process.env.EVA_ANALYSIS_TIMEOUT_MS || 300000),
        maxBuffer: 20 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new Error('Analysis returned invalid response.')); }
      });
    });

    // Find the topic text
    const topicIndex = topicId ? parseInt(topicId.split('-')[1]) : -1;
    const topicText = TOPICS[topicIndex]?.text || 'Impromptu topic';

    // Save session
    const session = await Session.create({
      userId: req.userId,
      mode: 'impromptu',
      score: result.scores?.interview_readiness_score || result.scores?.fluency_score,
      duration: result.vision_metrics?.duration_seconds || 60,
      metadata: { topicId, topicText },
      report: result,
      feedback: result.feedback || [],
      scores: result.scores,
    });

    invalidateCache(req.userId.toString());
    await rm(filePath, { force: true });

    res.json({
      sessionId: session._id,
      ...result,
    });
  } catch (err) {
    if (filePath) await rm(filePath, { force: true });
    console.error('Impromptu submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze speech.' });
  }
});

export default router;
