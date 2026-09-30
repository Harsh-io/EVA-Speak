// API client with built-in caching for EVA Speak
import { cacheGet, cacheSet } from './cache.jsx';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, { body, formData, cache = false, cacheTtl, signal } = {}) {
  const url = `${API_BASE}${path}`;

  // Check cache for GET requests
  if (cache && method === 'GET') {
    const cached = await cacheGet(url);
    if (cached) return cached;
  }

  const headers = {};
  let fetchBody;

  if (formData) {
    fetchBody = formData; // Let browser set Content-Type with boundary
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: fetchBody,
    credentials: 'include', // Send cookies for auth
    signal,
  });

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok && response.status !== 202) {
    throw new ApiError(
      data?.error || data?.message || `Request failed (${response.status})`,
      response.status,
      data
    );
  }

  // Cache successful GET responses
  if (cache && method === 'GET') {
    await cacheSet(url, data, cacheTtl);
  }

  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, opts) => request('POST', path, opts),
  put: (path, opts) => request('PUT', path, opts),
  delete: (path, opts) => request('DELETE', path, opts),
};

// ── Auth endpoints ────────────────────────────────────────────
export function getAuthUser() {
  return api.get('/api/auth/me', { cache: true, cacheTtl: 60000 });
}

export function logoutUser() {
  return api.post('/api/auth/logout');
}

// ── Analysis endpoints ────────────────────────────────────────
export function submitAnalysis(videoFile, expectedText, fallback = false) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('expectedText', expectedText);
  const qs = fallback ? '?fallback=last' : '';
  return api.post(`/api/analyze/full${qs}`, { formData });
}

export function getJobStatus(jobId) {
  return api.get(`/api/jobs/${jobId}`);
}

export function getHealthStatus() {
  return api.get('/api/health', { cache: true, cacheTtl: 10000 });
}

// ── RAG Interview endpoints ───────────────────────────────────
export function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);
  return api.post('/api/interview/upload-resume', { formData });
}

export function generateInterviewQuestions(resumeId, count = 5) {
  return api.post('/api/interview/generate-questions', { body: { resumeId, count } });
}

export function submitInterviewAnswer(questionId, videoFile) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('questionId', questionId);
  return api.post('/api/interview/submit-answer', { formData });
}

// ── Impromptu Speaking endpoints ──────────────────────────────
export function getImpromptuTopic() {
  return api.get('/api/impromptu/topic');
}

export function submitImpromptuSpeech(topicId, videoFile) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('topicId', topicId);
  return api.post('/api/impromptu/submit', { formData });
}

// ── Vocal Practice endpoints ──────────────────────────────────
export function getVocalPassage(difficulty = 'medium') {
  return api.get(`/api/vocal/passage?difficulty=${difficulty}`);
}

export function submitVocalRecording(passageId, audioFile) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('passageId', passageId);
  return api.post('/api/vocal/submit', { formData });
}

// ── User History endpoints ────────────────────────────────────
export function getUserHistory(page = 1, limit = 20) {
  return api.get(`/api/user/history?page=${page}&limit=${limit}`, { cache: true, cacheTtl: 30000 });
}

export function getUserStats() {
  return api.get('/api/user/stats', { cache: true, cacheTtl: 30000 });
}

// ── Polling helper ────────────────────────────────────────────
export async function pollJobUntilDone(jobId, { onProgress, maxWaitMs = 8 * 60 * 1000, intervalMs = 3000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    await new Promise(r => setTimeout(r, intervalMs));
    const data = await getJobStatus(jobId);
    if (data.status === 'running') {
      onProgress?.(Math.round((Date.now() - startedAt) / 1000));
      continue;
    }
    if (data.status === 'failed') {
      throw new ApiError(data.error || 'Analysis failed.', 500, data);
    }
    return data;
  }
  throw new ApiError('Analysis timed out. Try a shorter video.', 408);
}

export function getCoachingReport() {
  return api.get('/api/user/coaching-report', { cache: true, cacheTtl: 300000 });
}
