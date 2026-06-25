import { execFile } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadDir = path.join(root, "Data", "api-uploads");
const reportDir = path.join(root, "Data", "reports");
await mkdir(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, done) => {
      const extension = path.extname(file.originalname).toLowerCase();
      done(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});
const python = process.env.EVA_PYTHON
  || (process.platform === "win32" ? path.join(root, ".venv", "Scripts", "python.exe") : "python3");
let analysisRunning = false;
let analysisStartedAt = null;
let lastSuccessfulReport = null;
const jobs = new Map();
const jobTtlMs = Number(process.env.EVA_JOB_TTL_MS || 30 * 60 * 1000);
const rateLimitWindowMs = Number(process.env.EVA_RATE_WINDOW_MS || 10 * 60 * 1000);
const rateLimitLimit = Number(process.env.EVA_RATE_LIMIT || 20);
const analysisLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  limit: rateLimitLimit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipFailedRequests: true,
  message: (_req, res) => {
    const retryAfter = Number(res.getHeader("Retry-After") || 0);
    return {
      error: `Rate limit reached. Wait ${retryAfter || Math.ceil(rateLimitWindowMs / 1000)} seconds before starting another analysis.`,
      code: "RATE_LIMITED",
      retryAfterSeconds: retryAfter || Math.ceil(rateLimitWindowMs / 1000),
    };
  },
});

function stripAnsi(value) {
  return String(value || "").replace(/\u001b\[[0-9;]*m/g, "");
}

function userFacingAnalysisError(error, stdout, stderr) {
  const combinedOutput = stripAnsi(`${stderr || ""}\n${stdout || ""}`);
  const meaningfulLines = combinedOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("You are sending unauthenticated requests to the HF Hub"))
    .filter((line) => !line.includes("[W:onnxruntime:"))
    .filter((line) => !line.includes("/sys/class/drm/card0"));

  for (const line of meaningfulLines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.error) return parsed.error;
    } catch {
      // Keep looking for a machine-readable error line.
    }
  }

  if (error?.killed || error?.signal === "SIGTERM") {
    return "Analysis timed out on the hosted server. Try a shorter video or upgrade the Render instance.";
  }
  return meaningfulLines.join("\n") || error?.message || "Analysis failed.";
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return false;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:"
      && url.hostname.endsWith(".vercel.app")
      && (url.hostname === "eva-speak.vercel.app" || url.hostname.startsWith("eva-speak-"))
    );
  } catch {
    return false;
  }
}

function runAnalysis(videoPath, expectedText) {
  return new Promise((resolve, reject) => {
    execFile(python, ["-m", "app.api_bridge", videoPath, "--expected-text", expectedText], {
      cwd: root, timeout: Number(process.env.EVA_ANALYSIS_TIMEOUT_MS || 900000), maxBuffer: 20 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) return reject(new Error(userFacingAnalysisError(error, stdout, stderr)));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("Analysis returned an invalid response.")); }
    });
  });
}

export function createApp(analyze = runAnalysis) {
  const app = express();
  app.set("trust proxy", 1);
  const allowedOrigins = String(process.env.EVA_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const originAllowed = isAllowedOrigin(origin, allowedOrigins);
    if (originAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_req, res) => res.json({
    status: "ok",
    analysisAvailable: !analysisRunning,
    analysisRunning,
    analysisStartedAt,
    analysisRuntimeSeconds: analysisStartedAt
      ? Math.round((Date.now() - Date.parse(analysisStartedAt)) / 1000)
      : 0,
    rateLimit: { limit: rateLimitLimit, windowMs: rateLimitWindowMs },
  }));

  function rememberJob(job) {
    jobs.set(job.id, job);
    setTimeout(() => jobs.delete(job.id), jobTtlMs).unref?.();
  }

  function startAnalysisJob({ uploadedPath, inputFile, expectedText, useFallback }) {
    const job = {
      id: randomUUID(),
      status: "running",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputFile,
      error: null,
      report: null,
      degraded: false,
      warning: null,
    };
    rememberJob(job);

    analysisRunning = true;
    analysisStartedAt = new Date().toISOString();
    Promise.resolve()
      .then(async () => {
        const report = await analyze(uploadedPath, expectedText);
        lastSuccessfulReport = report;
        job.status = "complete";
        job.report = report;
      })
      .catch((error) => {
        if (useFallback && lastSuccessfulReport) {
          job.status = "complete";
          job.report = lastSuccessfulReport;
          job.degraded = true;
          job.warning = `Live analysis failed; returning the last successful report. ${error.message}`;
          return;
        }
        job.status = "failed";
        job.error = error.message || "Analysis failed.";
      })
      .finally(async () => {
        job.updatedAt = new Date().toISOString();
        analysisRunning = false;
        analysisStartedAt = null;
        await rm(uploadedPath, { force: true });
      });
    return job;
  }

  app.post("/api/analyze/full", analysisLimiter, upload.single("video"), async (req, res) => {
    const uploadedPath = req.file?.path;
    if (!req.file) return res.status(400).json({ error: "An MP4 video is required.", code: "INVALID_INPUT" });
    if (path.extname(req.file.originalname).toLowerCase() !== ".mp4") {
      await rm(uploadedPath, { force: true });
      return res.status(400).json({ error: "Only MP4 videos are supported.", code: "INVALID_INPUT" });
    }
    console.info("Uploaded file:", req.file.originalname);
    console.info("Saved file:", req.file.filename);
    console.info("Stage 2 will receive:", path.resolve(req.file.path));
    console.info("Detected extension:", path.extname(req.file.path).toLowerCase());
    const expectedText = String(req.body.expectedText || "").trim();
    if (!expectedText || expectedText.length > 5000) {
      await rm(uploadedPath, { force: true });
      return res.status(400).json({ error: "Expected text must contain 1 to 5000 characters.", code: "INVALID_INPUT" });
    }
    if (analysisRunning) {
      await rm(uploadedPath, { force: true });
      const runtimeSeconds = analysisStartedAt
        ? Math.round((Date.now() - Date.parse(analysisStartedAt)) / 1000)
        : 0;
      return res.status(503).json({
        error: `An analysis is already running (${runtimeSeconds}s elapsed). Try again after it finishes.`,
        code: "ANALYSIS_BUSY",
        retryAfterSeconds: 30,
        analysisStartedAt,
        analysisRuntimeSeconds: runtimeSeconds,
      });
    }
    const job = startAnalysisJob({
      uploadedPath,
      inputFile: req.file.originalname,
      expectedText,
      useFallback: req.query.fallback === "last",
    });
    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      statusUrl: `/api/jobs/${job.id}`,
      message: "Analysis started. Poll the job status for results.",
    });
  });
  app.get("/api/jobs/:id", (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid job id." });
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found.", code: "JOB_NOT_FOUND" });
    if (job.status === "running") {
      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        retryAfterSeconds: 3,
      });
    }
    if (job.status === "failed") {
      return res.status(500).json({
        jobId: job.id,
        status: job.status,
        error: job.error,
        code: "ANALYSIS_FAILED",
        fallbackAvailable: Boolean(lastSuccessfulReport),
      });
    }
    return res.json({
      jobId: job.id,
      status: job.status,
      report: job.report,
      degraded: job.degraded,
      warning: job.warning,
    });
  });
  app.get("/api/reports/:id", async (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid report id." });
    try { res.type("json").send(await readFile(path.join(reportDir, `${req.params.id}.json`), "utf8")); }
    catch { res.status(404).json({ error: "Report not found." }); }
  });
  const webDir = path.join(root, "dist");
  app.use(express.static(webDir));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(webDir, "index.html")));
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Video exceeds the 100 MB limit.", code: "FILE_TOO_LARGE" });
    res.status(500).json({ error: "Unexpected server error.", code: "SERVER_ERROR" });
  });
  return app;
}

export { isAllowedOrigin, userFacingAnalysisError };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, () => console.log(`EVA Speak API listening on http://localhost:${port}`));
}
