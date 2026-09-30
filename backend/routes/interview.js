// Interview routes — Resume upload, RAG question generation, answer submission
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';
import Resume from '../models/Resume.js';
import Session from '../models/Session.js';

const root = process.env.EVA_ROOT || path.resolve(process.cwd());
const uploadDir = path.join(root, 'Data', 'api-uploads');
const python = process.env.EVA_PYTHON
  || (process.platform === 'win32' ? path.join(root, '.venv', 'Scripts', 'python.exe') : 'python3');

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => done(null, `resume-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.doc'].includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are supported.'));
  },
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => done(null, `interview-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

function runPython(scriptArgs) {
  return new Promise((resolve, reject) => {
    execFile(python, scriptArgs, {
      cwd: root,
      timeout: Number(process.env.EVA_ANALYSIS_TIMEOUT_MS || 300000),
      maxBuffer: 20 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      try { resolve(JSON.parse(stdout)); }
      catch { reject(new Error('Invalid response from AI pipeline.')); }
    });
  });
}

const router = Router();

// Upload resume and process it through RAG pipeline
router.post('/upload-resume', requireAuth, resumeUpload.single('resume'), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: 'Resume file is required.' });

  try {
    // Create resume record
    const resume = await Resume.create({
      userId: req.userId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      text: '', // Will be filled by Python pipeline
      status: 'processing',
    });

    // Run Python RAG pipeline to parse and embed resume
    const result = await runPython(['-m', 'app.rag_bridge', 'parse-resume', filePath, '--resume-id', resume._id.toString()]);

    resume.text = result.text || '';
    resume.pineconeNamespace = result.namespace || resume._id.toString();
    resume.chunkCount = result.chunkCount || 0;
    resume.status = 'ready';
    await resume.save();

    res.json({
      resumeId: resume._id,
      status: 'ready',
      chunkCount: resume.chunkCount,
      message: 'Resume processed successfully.',
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    if (filePath) await rm(filePath, { force: true });
    res.status(500).json({ error: err.message || 'Failed to process resume.' });
  }
});

// Generate interview questions from resume
router.post('/generate-questions', requireAuth, async (req, res) => {
  const { resumeId, count = 5 } = req.body;
  if (!resumeId) return res.status(400).json({ error: 'Resume ID is required.' });

  try {
    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found.' });
    if (resume.status !== 'ready') return res.status(400).json({ error: 'Resume is still processing.' });

    const result = await runPython([
      '-m', 'app.rag_bridge', 'generate-questions',
      '--resume-id', resumeId,
      '--count', String(Math.min(10, Math.max(1, count))),
    ]);

    res.json({
      questions: result.questions || [],
      resumeId,
    });
  } catch (err) {
    console.error('Question generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate questions.' });
  }
});

// Submit video answer for a question
router.post('/submit-answer', requireAuth, videoUpload.single('video'), async (req, res) => {
  const filePath = req.file?.path;
  const { questionId } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Video recording is required.' });

  try {
    const result = await runPython([
      '-m', 'app.rag_bridge', 'analyze-answer',
      filePath,
      '--question-id', questionId || 'unknown',
    ]);

    // Save session
    const session = await Session.create({
      userId: req.userId,
      mode: 'interview',
      score: result.scores?.interview_readiness_score || result.scores?.overall_score,
      duration: result.duration || 0,
      metadata: { questionId, questionText: result.question_text },
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
    console.error('Answer submission error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze answer.' });
  }
});

export default router;
