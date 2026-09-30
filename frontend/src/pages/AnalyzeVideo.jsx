// Analyze Video — existing upload flow, redesigned for new UI
import React, { useState, useMemo, useEffect } from 'react';
import { submitAnalysis, pollJobUntilDone } from '../utils/api.jsx';
import { useMediaRecorder } from '../hooks/useMediaRecorder.jsx';
import VideoRecorder from '../components/VideoRecorder.jsx';

const sample = "The quick brown fox jumps over the lazy dog.";
const maxFileSizeBytes = 100 * 1024 * 1024;

function formatPercent(v, d = 1) { const n = Number(v); return Number.isFinite(n) ? `${n.toFixed(d)}%` : '—'; }
function formatScore(v) { const n = Number(v); return Number.isFinite(n) ? `${Math.round(n)}/100` : '—'; }
function formatDecimal(v, d = 3) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(d) : '—'; }

function tokenizeWords(text) { return String(text || '').toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || []; }

function alignWords(expectedText, recognizedText) {
  const ew = tokenizeWords(expectedText), rw = tokenizeWords(recognizedText);
  const R = ew.length + 1, C = rw.length + 1;
  const L = Array.from({ length: R }, () => Array(C).fill(0));
  for (let r = ew.length - 1; r >= 0; r--)
    for (let c = rw.length - 1; c >= 0; c--)
      L[r][c] = ew[r] === rw[c] ? L[r+1][c+1]+1 : Math.max(L[r+1][c], L[r][c+1]);
  const ops = []; let ei = 0, ri = 0;
  while (ei < ew.length && ri < rw.length) {
    if (ew[ei] === rw[ri]) { ops.push({ operation: 'equal', recognized_index: ri }); ei++; ri++; }
    else if (L[ei+1][ri] >= L[ei][ri+1]) { ops.push({ operation: 'delete', recognized_index: null }); ei++; }
    else { ops.push({ operation: 'insert', recognized_index: ri }); ri++; }
  }
  while (ei < ew.length) { ops.push({ operation: 'delete', recognized_index: null }); ei++; }
  while (ri < rw.length) { ops.push({ operation: 'insert', recognized_index: ri }); ri++; }
  return ops;
}

function HighlightedText({ expectedText, recognizedText, alignment }) {
  if (!recognizedText) return <span style={{ color: 'var(--text-muted)' }}>No speech recognized.</span>;
  const ops = Array.isArray(alignment) && alignment.length ? alignment : alignWords(expectedText, recognizedText);
  const badIdx = new Set(ops.filter(o => o.recognized_index !== null && o.operation !== 'equal').map(o => o.recognized_index));
  const parts = String(recognizedText).match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?|\s+|[^\sA-Za-z0-9]+/g) || [];
  let wi = 0;
  return parts.map((p, i) => {
    if (/^[A-Za-z0-9]/.test(p)) {
      const cur = wi++; return <span key={i} className={badIdx.has(cur) ? 'word-mismatch' : undefined}>{p}</span>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

const TABS = [
  { id: 'comparison', label: 'Text Comparison' },
  { id: 'speech', label: 'Speech Metrics' },
  { id: 'visual', label: 'Visual Metrics' },
  { id: 'feedback', label: 'Feedback' },
];

export default function AnalyzeVideo() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'record'
  const [file, setFile] = useState(null);
  const [text, setText] = useState(sample);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('comparison');

  const recorder = useMediaRecorder({ maxDurationMs: 120000 });
  const videoUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  const isMp4 = file?.name?.toLowerCase().endsWith('.mp4');
  const isTooBig = file?.size > maxFileSizeBytes;
  const canSubmit = Boolean((file && isMp4 && !isTooBig || recorder.blob) && text.trim() && !isAnalyzing);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!canSubmit) return;
    setIsAnalyzing(true);
    setReport(null);
    setStatus('Uploading and analyzing...');
    try {
      const videoToSend = recorder.blob
        ? new File([recorder.blob], 'recording.mp4', { type: 'video/mp4' })
        : file;
      const data = await submitAnalysis(videoToSend, text);
      if (data.jobId) {
        setStatus('Analysis started. Waiting for results...');
        const result = await pollJobUntilDone(data.jobId, {
          onProgress: (sec) => setStatus(`Analyzing (${sec}s elapsed)...`),
        });
        setReport(result.report);
        setStatus(result.degraded ? result.warning : 'Analysis complete.');
      } else {
        setReport(data.report);
        setStatus('Analysis complete.');
      }
    } catch (err) {
      setStatus(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const speech = report?.speech_metrics || {};
  const vision = report?.vision_metrics || {};
  const scores = report?.scores || {};

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Video Analysis</p>
        <h1>Analyze Communication</h1>
        <p className="subtitle">Upload a video or record live for full speech and visual analysis.</p>
      </div>

      {!report && (
        <div className="two-col">
          <div className="glass-card">
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button className={`tab-btn ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>📁 Upload Video</button>
              <button className={`tab-btn ${mode === 'record' ? 'active' : ''}`} onClick={() => setMode('record')}>📷 Record Live</button>
            </div>

            {mode === 'upload' && (
              <>
                <div className="file-upload-zone" onClick={() => document.getElementById('video-input').click()}>
                  <input id="video-input" type="file" accept="video/mp4,.mp4" style={{ display: 'none' }} onChange={(e) => { setFile(e.target.files?.[0] || null); setReport(null); }} />
                  <div className="upload-icon">🎬</div>
                  <div className="upload-text">{file ? file.name : 'Click to upload MP4 video'}</div>
                  <div className="upload-hint">{file ? `${(file.size / 1048576).toFixed(1)} MB` : 'Max 100 MB'}</div>
                </div>
                {file && !isMp4 && <div className="alert alert-warning mt-4">Only MP4 files are supported.</div>}
                {file && isTooBig && <div className="alert alert-warning mt-4">Video exceeds 100 MB limit.</div>}
                {videoUrl && isMp4 && (
                  <div className="video-container mt-4">
                    <video src={videoUrl} controls playsInline preload="metadata" />
                  </div>
                )}
              </>
            )}

            {mode === 'record' && (
              <VideoRecorder
                stream={recorder.stream}
                blob={recorder.blob}
                isRecording={recorder.isRecording}
                isPaused={recorder.isPaused}
                elapsed={recorder.elapsed}
                maxDurationMs={120000}
                onStartRecording={recorder.startRecording}
                onStopRecording={recorder.stopRecording}
                onResetRecording={recorder.resetRecording}
                onStartStream={recorder.startStream}
                compact
              />
            )}
          </div>

          <div className="glass-card">
            <div className="form-group mb-6">
              <label className="form-label">Expected Text</label>
              <textarea className="form-textarea" value={text} maxLength={5000} required placeholder="Enter the text the speaker should read..." onChange={(e) => setText(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg w-full" disabled={!canSubmit} onClick={handleSubmit}>
              {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Communication'}
            </button>
            {status && <p className="status-text mt-4">{status}</p>}
          </div>
        </div>
      )}

      {report && (
        <div className="animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <p className="eyebrow">Analysis Report</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Results</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => {
                const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
                const a = document.createElement('a'); a.href = url; a.download = `eva-report-${report.report_id || 'report'}.json`; a.click(); URL.revokeObjectURL(url);
              }}>📥 Download</button>
              <button className="btn btn-ghost" onClick={() => setReport(null)}>← Back</button>
            </div>
          </div>

          {report.warnings?.map((w, i) => <div key={i} className="alert alert-warning mb-4">{w}</div>)}

          <div className="metrics-grid mb-6 stagger">
            <div className="metric-card"><div className="metric-label">Readiness</div><div className="metric-value">{formatScore(scores.interview_readiness_score)}</div></div>
            <div className="metric-card"><div className="metric-label">Fluency</div><div className="metric-value">{formatScore(scores.fluency_score)}</div></div>
            <div className="metric-card"><div className="metric-label">Pronunciation</div><div className="metric-value">{formatScore(speech.comparison?.pronunciation_accuracy_score)}</div></div>
            <div className="metric-card"><div className="metric-label">Eye Contact</div><div className="metric-value">{formatPercent(vision.estimated_eye_contact_percent)}</div></div>
          </div>

          <div className="tabs">
            {TABS.map(t => <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
          </div>

          {activeTab === 'comparison' && (
            <div className="glass-card">
              <div className="two-col">
                <div><h4 style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>Expected Text</h4><div className="read-aloud-text" style={{ fontSize: '0.95rem' }}>{report.expected_text || '—'}</div></div>
                <div><h4 style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>Recognized Text</h4><div className="read-aloud-text" style={{ fontSize: '0.95rem' }}><HighlightedText alignment={speech.comparison?.alignment} expectedText={report.expected_text} recognizedText={report.recognized_text} /></div><p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>Words in red do not match expected text.</p></div>
              </div>
              <div className="metrics-grid mt-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="metric-card"><div className="metric-label">WER</div><div className="metric-value">{formatDecimal(speech.comparison?.wer)}</div></div>
                <div className="metric-card"><div className="metric-label">CER</div><div className="metric-value">{formatDecimal(speech.comparison?.cer)}</div></div>
                <div className="metric-card"><div className="metric-label">Sentiment</div><div className="metric-value" style={{ fontSize: '1.1rem' }}>{speech.sentiment?.label || '—'}</div></div>
              </div>
            </div>
          )}

          {activeTab === 'speech' && (
            <div className="glass-card">
              <div className="metrics-grid mb-6">
                <div className="metric-card"><div className="metric-label">WPM</div><div className="metric-value">{speech.speech_rate?.words_per_minute ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Rate</div><div className="metric-value" style={{ fontSize: '1rem' }}>{speech.speech_rate?.speech_rate_category ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Confidence</div><div className="metric-value">{formatPercent(Number(speech.confidence?.average_word_confidence) * 100)}</div></div>
                <div className="metric-card"><div className="metric-label">Long Pauses</div><div className="metric-value">{speech.pauses?.long_pause_count ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Fillers</div><div className="metric-value">{speech.fillers?.total_filler_words ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Repetitions</div><div className="metric-value">{speech.repetitions?.repetition_count ?? '—'}</div></div>
              </div>
              {speech.fillers?.filler_breakdown && (
                <div className="mt-4">
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}>Filler Breakdown</h4>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {Object.entries(speech.fillers.filler_breakdown).map(([label, rawVal]) => {
                      const val = Math.max(0, Math.min(100, Number(rawVal) || 0));
                      return (<div key={label} className="bar-chart-row"><div className="bar-chart-header"><span className="bar-chart-label">{label}</span><span className="bar-chart-value">{val.toFixed(1)}%</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${val}%` }} /></div></div>);
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'visual' && (
            <div className="glass-card">
              <div className="metrics-grid mb-6">
                <div className="metric-card"><div className="metric-label">Face Detected</div><div className="metric-value">{formatPercent(Number(vision.face_detected_ratio) * 100)}</div></div>
                <div className="metric-card"><div className="metric-label">Looking Away</div><div className="metric-value">{vision.looking_away_event_count ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Dominant Dir.</div><div className="metric-value" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{vision.dominant_face_direction ?? '—'}</div></div>
                <div className="metric-card"><div className="metric-label">Head Stability</div><div className="metric-value">{formatScore(vision.head_stability_score)}</div></div>
                <div className="metric-card"><div className="metric-label">Expression</div><div className="metric-value" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{vision.facial_expression_estimate?.dominant ?? '—'}</div></div>
              </div>
              {vision.face_direction_distribution_percent && (
                <div className="mt-4">
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}>Face Direction</h4>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {Object.entries(vision.face_direction_distribution_percent).map(([label, rawVal]) => {
                      const val = Math.max(0, Math.min(100, Number(rawVal) || 0));
                      return (<div key={label} className="bar-chart-row"><div className="bar-chart-header"><span className="bar-chart-label">{label}</span><span className="bar-chart-value">{val.toFixed(1)}%</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${val}%` }} /></div></div>);
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="glass-card">
              <div className="feedback-panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <h3>💡 Coaching Feedback</h3>
                {report.feedback?.length ? (
                  <ul className="feedback-list">
                    {report.feedback.map((item, i) => <li key={i} className="feedback-item">{item}</li>)}
                  </ul>
                ) : <p className="text-muted">No feedback available.</p>}
              </div>
              {report.limitations?.length > 0 && (
                <div className="mt-6">
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}>Known Limitations</h4>
                  <ul className="feedback-list">
                    {report.limitations.map((item, i) => <li key={i} className="feedback-item warning">{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
