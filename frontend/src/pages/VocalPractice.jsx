// Vocal Practice — Read-aloud with pronunciation & grammar feedback
import React, { useState, useCallback } from 'react';
import { getVocalPassage, submitVocalRecording, pollJobUntilDone } from '../utils/api.jsx';
import { useMediaRecorder } from '../hooks/useMediaRecorder.jsx';
import VideoRecorder from '../components/VideoRecorder.jsx';

const STAGES = { SELECT: 'select', READING: 'reading', ANALYZING: 'analyzing', FEEDBACK: 'feedback' };

const FALLBACK_PASSAGES = [
  {
    id: 'passage-1',
    title: 'The Art of Communication',
    difficulty: 'easy',
    text: "Good communication is the bridge between confusion and clarity. The most important thing in communication is hearing what isn't said. The way we communicate with others and with ourselves ultimately determines the quality of our lives.",
  },
  {
    id: 'passage-2',
    title: 'Innovation and Technology',
    difficulty: 'medium',
    text: "Innovation distinguishes between a leader and a follower. Technology is nothing. What's important is that you have a faith in people, that they're basically good and smart, and if you give them tools, they'll do wonderful things with them. The people who are crazy enough to think they can change the world are the ones who do.",
  },
  {
    id: 'passage-3',
    title: 'The Scientific Method',
    difficulty: 'hard',
    text: "The scientific method is an empirical method for acquiring knowledge that has characterized the development of science since at least the seventeenth century. It involves careful observation, applying rigorous skepticism about what is observed, given that cognitive assumptions can distort how one interprets the observation. Furthermore, it involves formulating hypotheses via induction, experimental and measurement-based testing of deductions drawn from the hypotheses, and refinement or elimination of the hypotheses based on the experimental findings.",
  },
  {
    id: 'passage-4',
    title: 'Leadership Principles',
    difficulty: 'medium',
    text: "A leader is best when people barely know he exists. When his work is done, his aim fulfilled, they will say: we did it ourselves. Leadership is not about being in charge. It is about taking care of those in your charge. The greatest leader is not necessarily the one who does the greatest things, but the one who gets people to do the greatest things.",
  },
];

export default function VocalPractice() {
  const [stage, setStage] = useState(STAGES.SELECT);
  const [passage, setPassage] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const recorder = useMediaRecorder({ maxDurationMs: 120000 });

  const handleSelectPassage = async () => {
    setError('');
    try {
      const result = await getVocalPassage(difficulty);
      setPassage(result);
    } catch {
      const filtered = FALLBACK_PASSAGES.filter(p => p.difficulty === difficulty);
      const selected = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : FALLBACK_PASSAGES[0];
      setPassage(selected);
    }
    setStage(STAGES.READING);
  };

  const handleStartReading = async () => {
    await recorder.startStream();
    await recorder.startRecording();
  };

  const handleSubmit = async () => {
    if (!recorder.blob || !passage) return;
    setStage(STAGES.ANALYZING);
    setStatus('Analyzing pronunciation and vocal delivery...');
    setError('');
    try {
      const result = await submitVocalRecording(passage.id, recorder.blob);
      if (result.jobId) {
        const jobResult = await pollJobUntilDone(result.jobId, {
          onProgress: (sec) => setStatus(`Analyzing (${sec}s)...`),
        });
        setFeedback(jobResult.report || jobResult);
      } else {
        setFeedback(result);
      }
      setStage(STAGES.FEEDBACK);
      setStatus('');
    } catch (err) {
      setError(err.message);
      setStage(STAGES.READING);
    }
  };

  const handleNewPassage = () => {
    recorder.resetRecording();
    recorder.stopStream();
    setFeedback(null);
    setPassage(null);
    setStage(STAGES.SELECT);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Vocal Practice</p>
        <h1>Read Aloud & Improve</h1>
        <p className="subtitle">Read text passages aloud and get AI feedback on pronunciation, grammar, vocal clarity, and delivery.</p>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}

      {/* Stage: Select Difficulty */}
      {stage === STAGES.SELECT && (
        <div className="glass-card" style={{ maxWidth: 500 }}>
          <h3 style={{ marginBottom: 20 }}>🎙️ Choose Difficulty</h3>
          <div className="tabs" style={{ marginBottom: 20 }}>
            {['easy', 'medium', 'hard'].map(level => (
              <button
                key={level}
                className={`tab-btn ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-muted mb-6">
            {difficulty === 'easy' && 'Short, simple sentences. Great for warming up.'}
            {difficulty === 'medium' && 'Moderate complexity with varied vocabulary.'}
            {difficulty === 'hard' && 'Complex sentences with technical vocabulary.'}
          </p>
          <button className="btn btn-primary btn-lg w-full" onClick={handleSelectPassage}>
            📖 Get a Passage
          </button>
        </div>
      )}

      {/* Stage: Reading */}
      {stage === STAGES.READING && passage && (
        <div className="two-col">
          <div>
            <div className="glass-card mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>📖 {passage.title}</h3>
                <span className={`badge ${passage.difficulty === 'easy' ? 'badge-new' : passage.difficulty === 'hard' ? 'badge-ai' : 'badge-new'}`}>
                  {passage.difficulty}
                </span>
              </div>
              <div className="read-aloud-text">
                {passage.text}
              </div>
              <p className="text-muted mt-4" style={{ fontSize: '0.82rem' }}>
                💡 Read the text above clearly and at a natural pace. Focus on pronunciation and expression.
              </p>
            </div>
            {recorder.blob && (
              <button className="btn btn-primary btn-lg w-full" onClick={handleSubmit}>
                ✨ Analyze My Reading
              </button>
            )}
          </div>
          <div>
            <VideoRecorder
              stream={recorder.stream}
              blob={recorder.blob}
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
              elapsed={recorder.elapsed}
              maxDurationMs={120000}
              onStartRecording={handleStartReading}
              onStopRecording={recorder.stopRecording}
              onResetRecording={recorder.resetRecording}
              onStartStream={recorder.startStream}
            />
          </div>
        </div>
      )}

      {/* Stage: Analyzing */}
      {stage === STAGES.ANALYZING && (
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
          <h3>Analyzing Your Reading</h3>
          <p className="text-muted mt-4">{status}</p>
        </div>
      )}

      {/* Stage: Feedback */}
      {stage === STAGES.FEEDBACK && feedback && (
        <div className="animate-in">
          {feedback.scores && (
            <div className="metrics-grid mb-6 stagger">
              {Object.entries(feedback.scores).filter(([k]) => !k.includes('weight')).map(([key, val]) => (
                <div key={key} className="metric-card">
                  <div className="metric-label">{key.replace(/_/g, ' ')}</div>
                  <div className={`metric-value ${Number(val) >= 70 ? 'good' : Number(val) >= 50 ? 'warning' : 'bad'}`}>
                    {typeof val === 'number' ? Math.round(val) : val}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="two-col">
            <div>
              {/* Highlighted recognized text */}
              {feedback.recognized_text && (
                <div className="glass-card mb-6">
                  <h4 style={{ marginBottom: 12 }}>📝 Your Reading (Transcribed)</h4>
                  <div className="read-aloud-text" style={{ fontSize: '1rem' }}>
                    {feedback.recognized_text}
                  </div>
                </div>
              )}

              <div className="feedback-panel">
                <h3>📋 AI Feedback</h3>
                <ul className="feedback-list">
                  {(feedback.feedback || []).map((item, i) => (
                    <li key={i} className="feedback-item">{typeof item === 'string' ? item : item.text}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              {feedback.speech_metrics?.comparison && (
                <div className="glass-card mb-6">
                  <h4 style={{ marginBottom: 12 }}>📊 Pronunciation Analysis</h4>
                  <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="metric-card">
                      <div className="metric-label">Accuracy</div>
                      <div className="metric-value good">
                        {Math.round(feedback.speech_metrics.comparison.pronunciation_accuracy_score || 0)}%
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">WER</div>
                      <div className="metric-value">
                        {(feedback.speech_metrics.comparison.wer || 0).toFixed(3)}
                      </div>
                    </div>
                  </div>
                  {feedback.speech_metrics.comparison.missing_words?.length > 0 && (
                    <div className="mt-4">
                      <span className="bar-chart-label">Missing words:</span>
                      <div className="pill-list mt-4">
                        {feedback.speech_metrics.comparison.missing_words.map((w, i) => (
                          <span key={i} className="pill" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary btn-lg w-full" onClick={handleNewPassage}>
                📖 Try Another Passage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
