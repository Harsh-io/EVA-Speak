import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "./server.js";

async function withServer(run) {
  const server = createApp(async () => { throw new Error("should not run"); }).listen(0);
  await once(server, "listening");
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); await once(server, "close"); }
}

test("health reports API availability", async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", analysisAvailable: true });
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
    assert.equal(response.status, 200);
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
