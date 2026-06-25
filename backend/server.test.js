import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp, isAllowedOrigin, userFacingAnalysisError } from "./server.js";

async function withServer(run) {
  const server = createApp(async () => { throw new Error("should not run"); }).listen(0);
  await once(server, "listening");
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); await once(server, "close"); }
}

test("health reports API availability", async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.analysisAvailable, true);
  assert.equal(body.analysisRunning, false);
  assert.equal(body.analysisRuntimeSeconds, 0);
  assert.equal(body.rateLimit.limit > 0, true);
}));

test("analysis rejects a missing upload explicitly", async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/analyze/full`, { method: "POST", body: new FormData() });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_INPUT");
}));

test("saved API upload retains the mp4 extension passed to Python", async () => {
  let receivedPath;
  const server = createApp(async (videoPath) => {
    receivedPath = videoPath;
    return { report_id: "test" };
  }).listen(0);
  await once(server, "listening");
  try {
    const body = new FormData();
    body.append("video", new Blob(["video"], { type: "video/mp4" }), "01.Video.MP4");
    body.append("expectedText", "Test response");
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/analyze/full`, { method: "POST", body });
    assert.equal(response.status, 202);
    const started = await response.json();
    assert.match(started.jobId, /^[a-f0-9-]{36}$/i);
    let jobResponse;
    let jobBody;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      jobResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/jobs/${started.jobId}`);
      jobBody = await jobResponse.json();
      if (jobResponse.status !== 202) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(jobResponse.status, 200);
    assert.equal(jobBody.status, "complete");
    assert.equal(jobBody.report.report_id, "test");
    assert.equal(receivedPath.toLowerCase().endsWith(".mp4"), true);
  } finally { server.close(); await once(server, "close"); }
});

test("analysis rejects a non-mp4 original filename", async () => withServer(async (base) => {
  const body = new FormData();
  body.append("video", new Blob(["video"], { type: "video/quicktime" }), "video.mov");
  body.append("expectedText", "Test response");
  const response = await fetch(`${base}/api/analyze/full`, { method: "POST", body });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_INPUT");
}));

test("report ids cannot traverse the report directory", async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/reports/..%2Fsecret`);
  assert.equal(response.status, 400);
}));

test("analysis errors hide benign model runtime warnings", () => {
  const stderr = [
    "Warning: You are sending unauthenticated requests to the HF Hub.",
    "\u001b[0;93m2026-06-25 [W:onnxruntime:Default] Failed to detect devices under \"/sys/class/drm/card0\"",
  ].join("\n");
  const error = new Error("Command failed");
  error.killed = true;
  assert.equal(
    userFacingAnalysisError(error, "", stderr),
    "Analysis timed out on the hosted server. Try a shorter video or upgrade the Render instance.",
  );
});

test("cors allows production and preview Vercel origins", () => {
  assert.equal(isAllowedOrigin("https://eva-speak.vercel.app", []), true);
  assert.equal(isAllowedOrigin("https://eva-speak-4szwy2bhw-harshgrinds.vercel.app", []), true);
  assert.equal(isAllowedOrigin("https://not-eva-speak.vercel.app", []), false);
});
