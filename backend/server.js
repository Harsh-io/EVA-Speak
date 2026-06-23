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
const python = process.env.EVA_PYTHON || path.join(root, ".venv", "Scripts", "python.exe");
let analysisRunning = false;
let lastSuccessfulReport = null;

function runAnalysis(videoPath, expectedText) {
  return new Promise((resolve, reject) => {
    execFile(python, ["-m", "app.api_bridge", videoPath, "--expected-text", expectedText], {
      cwd: root, timeout: Number(process.env.EVA_ANALYSIS_TIMEOUT_MS || 900000), maxBuffer: 20 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr.trim() || error.message));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("Analysis returned an invalid response.")); }
    });
  });
}

export function createApp(analyze = runAnalysis) {
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/analyze", rateLimit({
    windowMs: Number(process.env.EVA_RATE_WINDOW_MS || 15 * 60 * 1000),
    limit: Number(process.env.EVA_RATE_LIMIT || 5), standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Rate limit reached. Wait before starting another analysis.", code: "RATE_LIMITED" },
  }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", analysisAvailable: !analysisRunning }));
  app.post("/api/analyze/full", upload.single("video"), async (req, res) => {
    const uploadedPath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ error: "An MP4 video is required.", code: "INVALID_INPUT" });
      if (path.extname(req.file.originalname).toLowerCase() !== ".mp4") return res.status(400).json({ error: "Only MP4 videos are supported.", code: "INVALID_INPUT" });
      console.info("Uploaded file:", req.file.originalname);
      console.info("Saved file:", req.file.filename);
      console.info("Stage 2 will receive:", path.resolve(req.file.path));
      console.info("Detected extension:", path.extname(req.file.path).toLowerCase());
      const expectedText = String(req.body.expectedText || "").trim();
      if (!expectedText || expectedText.length > 5000) return res.status(400).json({ error: "Expected text must contain 1 to 5000 characters.", code: "INVALID_INPUT" });
      if (analysisRunning) return res.status(503).json({ error: "An analysis is already running. Try again shortly.", code: "ANALYSIS_BUSY" });
      analysisRunning = true;
      try {
        const report = await analyze(uploadedPath, expectedText);
        lastSuccessfulReport = report;
        return res.json({ report, degraded: false });
      } catch (error) {
        if (req.query.fallback === "last" && lastSuccessfulReport) {
          return res.status(206).json({ report: lastSuccessfulReport, degraded: true, warning: `Live analysis failed; returning the last successful report. ${error.message}` });
        }
        return res.status(502).json({ error: error.message, code: "ANALYSIS_FAILED", fallbackAvailable: Boolean(lastSuccessfulReport) });
      } finally { analysisRunning = false; }
    } finally { if (uploadedPath) await rm(uploadedPath, { force: true }); }
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, () => console.log(`EVA Speak API listening on http://localhost:${port}`));
}
