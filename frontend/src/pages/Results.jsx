// Results — shared analysis results display used across practice modes
import React, { useState } from 'react';
import MetricCard, { scoreQuality } from '../components/MetricCard.jsx';
import BarChart from '../components/BarChart.jsx';

function formatPercent(v, d = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(d)}%` : '—';
}
function formatScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const RESULT_TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'speech', label: '🗣️ Speech' },
  { id: 'visual', label: '👁️ Visual' },
  { id: 'feedback', label: '💡 Feedback' },
];

/**
 * Results — renders a complete analysis report across four tabs.
 *
 * @param {object}   report            - The full analysis report object
 * @param {string}   [mode]            - Practice mode for context ('interview'|'impromptu'|'vocal'|'analyze')
 * @param {object}   [question]        - Current interview question (if mode === 'interview')
 * @param {Function} [onBack]          - Callback to go back to the previous stage
 * @param {string}   [backLabel]       - Label for the back button
 * @param {Function} [onPrimary]       - Callback for the primary CTA button
 * @param {string}   [primaryLabel]    - Label for the primary CTA button
 */
export default function Results({
  report,
  mode = 'analyze',
  question,
  onBack,
  backLabel = '← Back',
  onPrimary,
  primaryLabel = 'New Session',
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!report) return null;

  const speech = report.speech_metrics || {};
  const vision = report.vision_metrics || {};
  const scores = report.scores || {};

  // Build score bar chart data
  const scoreChartData = Object.entries(scores)
    .filter(([k, v]) => !k.includes('weight') && typeof v === 'number')
    .map(([key, val]) => ({
      name: key.replace(/_score$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: Math.round(val),
    }));

  // Build face direction chart
  const faceDir = vision.face_direction_distribution_percent
    ? Object.entries(vision.face_direction_distribution_percent).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.max(0, Math.min(100, Number(value) || 0)),
      }))
    : [];

  const overallScore = formatScore(
    scores.interview_readiness_score ?? scores.overall_score ?? scores.fluency_score
  );

  return (
    <div className="animate-in">
      {/* Header bar */}
      <div className="results-header">
        <div>
          <p className="eyebrow">{mode === 'interview' ? 'Interview Feedback' : mode === 'vocal' ? 'Vocal Feedback' : mode === 'impromptu' ? 'Impromptu Feedback' : 'Analysis Report'}</p>
          <h2 className="results-title">
            {overallScore !== null ? `${overallScore}/100` : 'Results'}
            {overallScore !== null && (
              <span className={`results-score-badge ${overallScore >= 70 ? 'good' : overallScore >= 50 ? 'warning' : 'bad'}`}>
                {overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Needs Work'}
              </span>
            )}
          </h2>
          {question && <p className="text-muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>Q: {question.text}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {/* Download report */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `eva-report-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📥 Download
          </button>
          {onBack && <button className="btn btn-ghost" onClick={onBack}>{backLabel}</button>}
        </div>
      </div>

      {/* Warnings */}
      {report.warnings?.map((w, i) => (
        <div key={i} className="alert alert-warning mb-4">{w}</div>
      ))}

      {/* Tabs */}
      <div className="tabs mb-6">
        {RESULT_TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="animate-in">
          <div className="metrics-grid mb-6 stagger">
            <MetricCard
              label="Interview Readiness"
              value={formatScore(scores.interview_readiness_score)}
              suffix="/100"
              quality={scoreQuality(scores.interview_readiness_score)}
              icon="🎯"
              glowing
            />
            <MetricCard
              label="Fluency"
              value={formatScore(scores.fluency_score)}
              suffix="/100"
              quality={scoreQuality(scores.fluency_score)}
              icon="🗣️"
            />
            <MetricCard
              label="Pronunciation"
              value={formatScore(speech.comparison?.pronunciation_accuracy_score)}
              suffix="/100"
              quality={scoreQuality(speech.comparison?.pronunciation_accuracy_score)}
              icon="🎙️"
            />
            <MetricCard
              label="Eye Contact"
              value={vision.estimated_eye_contact_percent ? Math.round(vision.estimated_eye_contact_percent) : null}
              suffix="%"
              quality={scoreQuality(vision.estimated_eye_contact_percent, 70, 50)}
              icon="👁️"
            />
          </div>

          {scoreChartData.length > 0 && (
            <div className="glass-card mb-6">
              <h3 style={{ marginBottom: 20 }}>Score Breakdown</h3>
              <BarChart data={scoreChartData} colorCoded maxValue={100} height={220} />
            </div>
          )}

          {/* LLM-enhanced fields */}
          {(report.strengths?.length > 0 || report.areas_to_improve?.length > 0) && (
            <div className="two-col">
              {report.strengths?.length > 0 && (
                <div className="glass-card">
                  <h4 style={{ color: 'var(--success)', marginBottom: 12 }}>✅ Strengths</h4>
                  <ul className="feedback-list">
                    {report.strengths.map((s, i) => <li key={i} className="feedback-item">{s}</li>)}
                  </ul>
                </div>
              )}
              {report.areas_to_improve?.length > 0 && (
                <div className="glass-card">
                  <h4 style={{ color: 'var(--warning)', marginBottom: 12 }}>🎯 Areas to Improve</h4>
                  <ul className="feedback-list">
                    {report.areas_to_improve.map((a, i) => <li key={i} className="feedback-item">{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Speech ────────────────────────────────── */}
      {activeTab === 'speech' && (
        <div className="animate-in">
          <div className="metrics-grid mb-6 stagger">
            <MetricCard label="Words per Minute" value={speech.speech_rate?.words_per_minute ?? null} icon="⚡" />
            <MetricCard
              label="Speech Rate"
              value={speech.speech_rate?.speech_rate_category ?? '—'}
              icon="📈"
            />
            <MetricCard
              label="Confidence"
              value={speech.confidence?.average_word_confidence
                ? `${Math.round(Number(speech.confidence.average_word_confidence) * 100)}%`
                : null}
              icon="💪"
            />
            <MetricCard label="Long Pauses" value={speech.pauses?.long_pause_count ?? null} icon="⏸️" />
            <MetricCard label="Filler Words" value={speech.fillers?.total_filler_words ?? null} icon="🤔" />
            <MetricCard label="Repetitions" value={speech.repetitions?.repetition_count ?? null} icon="🔄" />
          </div>

          {/* Text comparison */}
          {report.recognized_text && (
            <div className="glass-card mb-6">
              <div className="two-col">
                <div>
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>Expected Text</h4>
                  <div className="read-aloud-text" style={{ fontSize: '0.92rem' }}>{report.expected_text || '—'}</div>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>Recognized Text</h4>
                  <div className="read-aloud-text" style={{ fontSize: '0.92rem' }}>{report.recognized_text}</div>
                </div>
              </div>
              {(speech.comparison?.wer != null || speech.comparison?.cer != null) && (
                <div className="metrics-grid mt-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <MetricCard label="WER" value={speech.comparison?.wer != null ? Number(speech.comparison.wer).toFixed(3) : null} />
                  <MetricCard label="CER" value={speech.comparison?.cer != null ? Number(speech.comparison.cer).toFixed(3) : null} />
                  <MetricCard label="Sentiment" value={speech.sentiment?.label || '—'} />
                </div>
              )}
            </div>
          )}

          {/* Filler breakdown */}
          {speech.fillers?.filler_breakdown && Object.keys(speech.fillers.filler_breakdown).length > 0 && (
            <div className="glass-card">
              <h4 style={{ marginBottom: 16 }}>Filler Word Breakdown</h4>
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(speech.fillers.filler_breakdown).map(([label, rawVal]) => {
                  const val = Math.max(0, Math.min(100, Number(rawVal) || 0));
                  return (
                    <div key={label} className="bar-chart-row">
                      <div className="bar-chart-header">
                        <span className="bar-chart-label">{label}</span>
                        <span className="bar-chart-value">{val.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Visual ────────────────────────────────── */}
      {activeTab === 'visual' && (
        <div className="animate-in">
          <div className="metrics-grid mb-6 stagger">
            <MetricCard
              label="Face Detected"
              value={vision.face_detected_ratio != null ? Math.round(Number(vision.face_detected_ratio) * 100) : null}
              suffix="%"
              quality={scoreQuality(Number(vision.face_detected_ratio) * 100, 70, 50)}
              icon="🙂"
            />
            <MetricCard
              label="Eye Contact"
              value={vision.estimated_eye_contact_percent != null ? Math.round(vision.estimated_eye_contact_percent) : null}
              suffix="%"
              quality={scoreQuality(vision.estimated_eye_contact_percent, 70, 50)}
              icon="👁️"
            />
            <MetricCard
              label="Head Stability"
              value={formatScore(vision.head_stability_score)}
              suffix="/100"
              quality={scoreQuality(vision.head_stability_score)}
              icon="🎯"
            />
            <MetricCard
              label="Dominant Direction"
              value={vision.dominant_face_direction ?? '—'}
              icon="↔️"
            />
            <MetricCard
              label="Expression"
              value={vision.facial_expression_estimate?.dominant ?? '—'}
              icon="😊"
            />
            <MetricCard
              label="Looking Away"
              value={vision.looking_away_event_count ?? null}
              icon="👀"
            />
          </div>

          {faceDir.length > 0 && (
            <div className="glass-card">
              <h4 style={{ marginBottom: 20 }}>Face Direction Distribution</h4>
              <BarChart data={faceDir} unit="%" maxValue={100} height={200} colorCoded />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Feedback ──────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="animate-in">
          <div className="two-col">
            <div>
              {/* Main feedback */}
              <div className="feedback-panel mb-6">
                <h3>💡 Coaching Feedback</h3>
                {report.feedback?.length ? (
                  <ul className="feedback-list">
                    {report.feedback.map((item, i) => (
                      <li key={i} className="feedback-item">
                        {typeof item === 'string' ? item : item.text || JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No feedback available.</p>
                )}
              </div>

              {/* Improvement tips */}
              {report.improvement_tips?.length > 0 && (
                <div className="glass-card">
                  <h4 style={{ color: 'var(--warning)', marginBottom: 12 }}>🎯 Improvement Tips</h4>
                  <ul className="feedback-list">
                    {report.improvement_tips.map((tip, i) => (
                      <li key={i} className="feedback-item tip">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              {/* Sample answer (interview mode) */}
              {report.sample_answer && (
                <div className="sample-answer mb-6">
                  <h4>✅ Sample Answer</h4>
                  <p>{report.sample_answer}</p>
                </div>
              )}

              {/* Overall assessment */}
              {report.overall_assessment && (
                <div className="glass-card mb-6">
                  <h4 style={{ marginBottom: 8 }}>📝 Overall Assessment</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{report.overall_assessment}</p>
                </div>
              )}

              {/* Limitations */}
              {report.limitations?.length > 0 && (
                <div className="glass-card">
                  <h4 style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}>⚠️ Known Limitations</h4>
                  <ul className="feedback-list">
                    {report.limitations.map((item, i) => (
                      <li key={i} className="feedback-item warning">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          {onPrimary && (
            <div style={{ marginTop: 32 }}>
              <button className="btn btn-primary btn-lg" onClick={onPrimary}>{primaryLabel}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
