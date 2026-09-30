// Vocal practice routes — passage generation, reading submission
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

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => done(null, `vocal-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

const PASSAGES = {
  easy: [
    { id: 'easy-1', title: 'Clear Communication', text: 'Good communication is the bridge between confusion and clarity. The most important thing in communication is hearing what is not said. Every word matters when you speak with purpose and intention.' },
    { id: 'easy-2', title: 'Daily Habits', text: 'Success is the sum of small efforts repeated day in and day out. What you do every day matters more than what you do once in a while. Build habits that move you toward your goals.' },
    { id: 'easy-3', title: 'Teamwork', text: 'Alone we can do so little. Together we can do so much. Great things in business are never done by one person. They are done by a team of people who trust and support each other.' },
  ],
  medium: [
    { id: 'med-1', title: 'The Art of Persuasion', text: 'Persuasion is not about manipulating others into agreement. It is the art of presenting your ideas so clearly and compellingly that others naturally see the merit in your perspective. The most persuasive people listen more than they speak, understand before seeking to be understood, and frame their arguments in terms of shared benefits rather than personal gain.' },
    { id: 'med-2', title: 'Innovation and Risk', text: 'Innovation requires a willingness to experiment and accept failure as part of the process. The greatest breakthroughs in history came from individuals and teams who dared to challenge conventional wisdom. They understood that the risk of standing still far outweighed the risk of trying something new and potentially revolutionary.' },
    { id: 'med-3', title: 'Digital Transformation', text: 'The rapid pace of digital transformation is reshaping every industry and profession. Organizations that embrace technology as an enabler of human potential, rather than a replacement for it, will thrive in the coming decades. The key is to balance automation with creativity and data with empathy.' },
  ],
  hard: [
    { id: 'hard-1', title: 'Epistemological Foundations', text: 'The epistemological foundations of scientific inquiry rest upon the systematic observation and falsification of hypotheses through reproducible experimentation. The demarcation problem, which seeks to distinguish genuine scientific theories from pseudoscientific claims, remains one of the most contentious philosophical questions. Karl Popper argued that falsifiability constitutes the criterion of demarcation, while Thomas Kuhn emphasized the sociological aspects of paradigm shifts within scientific communities.' },
    { id: 'hard-2', title: 'Quantum Computing', text: 'Quantum computing leverages the principles of quantum mechanics, including superposition and entanglement, to perform computations that would be intractable for classical computers. Unlike classical bits, which exist in a definitive state of either zero or one, quantum bits or qubits can exist in a coherent superposition of both states simultaneously. This parallelism enables quantum algorithms to solve certain categories of problems exponentially faster than their classical counterparts.' },
  ],
};

const router = Router();

// Get a passage by difficulty
router.get('/passage', requireAuth, (req, res) => {
  const difficulty = ['easy', 'medium', 'hard'].includes(req.query.difficulty)
    ? req.query.difficulty
    : 'medium';
  const pool = PASSAGES[difficulty];
  const passage = pool[Math.floor(Math.random() * pool.length)];
  res.json({ ...passage, difficulty });
});

// Submit vocal recording
router.post('/submit', requireAuth, audioUpload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;
  const { passageId } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Audio/video recording is required.' });

  // Find passage text for expected text comparison
  const allPassages = [...PASSAGES.easy, ...PASSAGES.medium, ...PASSAGES.hard];
  const passage = allPassages.find(p => p.id === passageId);
  const expectedText = passage?.text || '';

  try {
    const result = await new Promise((resolve, reject) => {
      execFile(python, ['-m', 'app.api_bridge', filePath, '--expected-text', expectedText], {
        cwd: root,
        timeout: Number(process.env.EVA_ANALYSIS_TIMEOUT_MS || 300000),
        maxBuffer: 20 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new Error('Analysis returned invalid response.')); }
      });
    });

    // Save session
    const session = await Session.create({
      userId: req.userId,
      mode: 'vocal',
      score: result.scores?.fluency_score || result.scores?.interview_readiness_score,
      duration: result.vision_metrics?.duration_seconds || 0,
      metadata: {
        passageId,
        passageTitle: passage?.title || 'Unknown',
        difficulty: passage ? Object.entries(PASSAGES).find(([, ps]) => ps.includes(passage))?.[0] : 'medium',
        expectedText,
      },
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
    console.error('Vocal submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze recording.' });
  }
});

export default router;
