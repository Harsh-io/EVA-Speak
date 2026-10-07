// Impromptu Speaking — Random topic → 60s record → feedback
import React, { useState, useCallback } from 'react';
import { getImpromptuTopic, submitImpromptuSpeech, pollJobUntilDone } from '../utils/api.jsx';
import { useMediaRecorder } from '../hooks/useMediaRecorder.jsx';
import VideoRecorder from '../components/VideoRecorder.jsx';
import Timer from '../components/Timer.jsx';

const STAGES = { IDLE: 'idle', TOPIC: 'topic', SPEAKING: 'speaking', ANALYZING: 'analyzing', FEEDBACK: 'feedback' };

const FALLBACK_TOPICS = [
  "If you could have dinner with any historical figure, who would it be and why?",
  "What's the most important skill everyone should learn, and how would you teach it?",
  "Describe a challenge you overcame that changed your perspective on life.",
  "If you were CEO of a major tech company for a day, what would you change?",
  "What advice would you give to your 18-year-old self?",
  "Explain a complex concept you understand well to a complete beginner.",
  "What does success mean to you, and how has that definition evolved?",
  "If you could solve one global problem overnight, what would it be?",
  "Describe your ideal work environment and why it brings out your best.",
  "What's one unpopular opinion you hold, and why do you believe in it?",
  "Tell me about a time when you had to adapt quickly to an unexpected situation.",
  "If you could instantly master any language, which would you choose and why?",
];

export default function ImpromptuSpeaking() {
  const [stage, setStage] = useState(STAGES.IDLE);
  const [topic, setTopic] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);

  const recorder = useMediaRecorder({
    maxDurationMs: 65000, // 65s to account for processing lag
  });

  const handleGetTopic = async () => {
    setError('');
    setFeedback(null);
    try {
      const result = await getImpromptuTopic();
      setTopic(result);
      setStage(STAGES.TOPIC);
    } catch {
      // Use fallback topics if API not available
      const randomTopic = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
      setTopic({ id: `local-${Date.now()}`, text: randomTopic, category: 'General' });
      setStage(STAGES.TOPIC);
    }
  };

  const handleStartSpeaking = async () => {
    await recorder.startStream();
    await recorder.startRecording();
    setTimerRunning(true);
    setStage(STAGES.SPEAKING);
  };

  const handleTimerComplete = useCallback(() => {
    setTimerRunning(false);
    recorder.stopRecording();
  }, [recorder]);

  const handleStopEarly = () => {
    setTimerRunning(false);
    recorder.stopRecording();
  };

  const handleSubmit = async () => {
    if (!recorder.blob) return;
    setStage(STAGES.ANALYZING);
    setStatus('Analyzing your impromptu speech...');
    setError('');
    try {
      const result = await submitImpromptuSpeech(topic.id, recorder.blob);
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
      setStage(STAGES.TOPIC);
    }
  };

  const handleNewTopic = () => {
    recorder.resetRecording();
    recorder.stopStream();
    setFeedback(null);
    setTimerRunning(false);
    setStage(STAGES.IDLE);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Impromptu Speaking</p>
        <h1>Think Fast, Speak Well</h1>
        <p className="subtitle">Get a random topic, speak for 60 seconds, and receive instant AI feedback on your delivery.</p>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}

      {/* Stage: Idle */}
      {stage === STAGES.IDLE && (
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚡</div>
          <h3 style={{ marginBottom: 8 }}>Ready for a Challenge?</h3>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            You'll receive a random topic and have 60 seconds to speak about it. 
            Focus on structure, clarity, and confidence.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleGetTopic}>
            🎲 Get a Topic
          </button>
        </div>
      )}

      {/* Stage: Topic Revealed */}
      {stage === STAGES.TOPIC && topic && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="topic-card mb-6">
            <div className="topic-label">{topic.category || 'Your Topic'}</div>
            <div className="topic-text">{topic.text}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p className="text-muted mb-6">
              Take a moment to collect your thoughts, then hit start. You'll have 60 seconds.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleStartSpeaking}>
              🎤 Start Speaking
            </button>
            <button className="btn btn-ghost mt-4" onClick={handleGetTopic} style={{ display: 'block', margin: '12px auto 0' }}>
              🔄 Different Topic
            </button>
          </div>
        </div>
      )}

      {/* Stage: Speaking */}
      {stage === STAGES.SPEAKING && (
        <div className="two-col">
          <div>
            <div className="topic-card mb-6">
              <div className="topic-label">Your Topic</div>
              <div className="topic-text" style={{ fontSize: '1.2rem' }}>{topic?.text}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Timer durationSeconds={60} running={timerRunning} onComplete={handleTimerComplete} />
            </div>
            {recorder.blob && (
              <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleSubmit}>
                ✨ Get Feedback
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
              maxDurationMs={65000}
              onStartRecording={recorder.startRecording}
              onStopRecording={handleStopEarly}
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
          <h3>Analyzing Your Speech</h3>
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
            <div className="feedback-panel">
              <h3>📋 Speech Feedback</h3>
              <ul className="feedback-list">
                {(feedback.feedback || []).map((item, i) => (
                  <li key={i} className="feedback-item">{typeof item === 'string' ? item : item.text}</li>
                ))}
              </ul>
            </div>
            <div>
              {feedback.speech_metrics && (
                <div className="glass-card mb-6">
                  <h4 style={{ marginBottom: 12 }}>🗣️ Speech Metrics</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {feedback.speech_metrics.speech_rate && (
                      <div className="bar-chart-row">
                        <div className="bar-chart-header">
                          <span className="bar-chart-label">Words per minute</span>
                          <span className="bar-chart-value">{feedback.speech_metrics.speech_rate.words_per_minute}</span>
                        </div>
                      </div>
                    )}
                    {feedback.speech_metrics.fillers && (
                      <div className="bar-chart-row">
                        <div className="bar-chart-header">
                          <span className="bar-chart-label">Filler words</span>
                          <span className="bar-chart-value">{feedback.speech_metrics.fillers.total_filler_words}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button className="btn btn-primary btn-lg w-full" onClick={handleNewTopic}>
                🎲 Try Another Topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
