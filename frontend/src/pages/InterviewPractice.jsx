// Interview Practice — Resume upload → RAG questions → live video answer → feedback
import React, { useState, useCallback } from 'react';
import { uploadResume, generateInterviewQuestions, submitInterviewAnswer, pollJobUntilDone } from '../utils/api.jsx';
import { useMediaRecorder } from '../hooks/useMediaRecorder.jsx';
import VideoRecorder from '../components/VideoRecorder.jsx';

const STAGES = { UPLOAD: 'upload', GENERATING: 'generating', QUESTION: 'question', RECORDING: 'recording', ANALYZING: 'analyzing', FEEDBACK: 'feedback' };

export default function InterviewPractice() {
  const [stage, setStage] = useState(STAGES.UPLOAD);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [allFeedbacks, setAllFeedbacks] = useState([]);

  const recorder = useMediaRecorder({
    maxDurationMs: 180000, // 3 min per answer
    onStop: (blob) => handleAnswerRecorded(blob),
  });

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setError('');
    setStage(STAGES.GENERATING);
    setStatus('Uploading resume and generating questions...');
    try {
      const uploadResult = await uploadResume(resumeFile);
      setResumeId(uploadResult.resumeId);
      setStatus('Resume processed! Generating interview questions with AI...');
      const questionsResult = await generateInterviewQuestions(uploadResult.resumeId, 5);
      setQuestions(questionsResult.questions || []);
      setCurrentQIndex(0);
      setStage(STAGES.QUESTION);
      setStatus('');
    } catch (err) {
      setError(err.message);
      setStage(STAGES.UPLOAD);
    }
  };

  const handleStartAnswer = async () => {
    setStage(STAGES.RECORDING);
    await recorder.startStream();
  };

  const handleAnswerRecorded = async (blob) => {
    setStage(STAGES.ANALYZING);
    setStatus('Analyzing your response...');
    setError('');
    try {
      const question = questions[currentQIndex];
      const result = await submitInterviewAnswer(question.id, blob);
      if (result.jobId) {
        const jobResult = await pollJobUntilDone(result.jobId, {
          onProgress: (sec) => setStatus(`Analyzing your response (${sec}s)...`),
        });
        setFeedback(jobResult.report || jobResult);
      } else {
        setFeedback(result);
      }
      setAllFeedbacks(prev => [...prev, { question, feedback: result.report || result }]);
      setStage(STAGES.FEEDBACK);
      setStatus('');
    } catch (err) {
      setError(err.message);
      setStage(STAGES.QUESTION);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    recorder.resetRecording();
    recorder.stopStream();
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
      setStage(STAGES.QUESTION);
    } else {
      setStage(STAGES.UPLOAD); // All questions done
    }
  };

  const currentQuestion = questions[currentQIndex];

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Interview Practice</p>
        <h1>AI-Powered Mock Interview</h1>
        <p className="subtitle">Upload your resume to get personalized interview questions. Answer on video and receive instant AI coaching.</p>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}
      {status && stage !== STAGES.QUESTION && <div className="alert alert-info mb-6">⏳ {status}</div>}

      {/* Stage: Resume Upload */}
      {stage === STAGES.UPLOAD && (
        <div className="glass-card" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 16 }}>📄 Upload Your Resume</h3>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Upload a PDF or DOCX resume. Our AI will analyze it and generate targeted interview questions.
          </p>
          <div
            className={`file-upload-zone ${resumeFile ? '' : ''}`}
            onClick={() => document.getElementById('resume-input').click()}
          >
            <input
              id="resume-input"
              type="file"
              accept=".pdf,.docx,.doc"
              style={{ display: 'none' }}
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              {resumeFile ? resumeFile.name : 'Click to upload resume'}
            </div>
            <div className="upload-hint">
              {resumeFile
                ? `${(resumeFile.size / 1024).toFixed(1)} KB`
                : 'Supports PDF and DOCX files'}
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg w-full mt-6"
            onClick={handleResumeUpload}
            disabled={!resumeFile}
          >
            🚀 Generate Interview Questions
          </button>

          {allFeedbacks.length > 0 && (
            <div className="mt-8">
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Previous Session Results</h4>
              {allFeedbacks.map((item, i) => (
                <div key={i} className="feedback-item mb-4">
                  <strong>Q{i + 1}:</strong> {item.question?.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage: Generating */}
      {stage === STAGES.GENERATING && (
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
          <h3>Generating Questions</h3>
          <p className="text-muted mt-4">{status}</p>
        </div>
      )}

      {/* Stage: Question Display */}
      {(stage === STAGES.QUESTION || stage === STAGES.RECORDING) && currentQuestion && (
        <div className="two-col">
          <div>
            <div className="question-card mb-6">
              <div className="question-number">
                Question {currentQIndex + 1} of {questions.length}
              </div>
              <div className="question-text">{currentQuestion.text}</div>
              {currentQuestion.context && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                  💡 Based on: {currentQuestion.context}
                </p>
              )}
            </div>
            <div className="progress-bar" style={{ height: 4, marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Progress: {currentQIndex + 1} / {questions.length}
            </p>
          </div>

          <div>
            <VideoRecorder
              stream={recorder.stream}
              blob={recorder.blob}
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
              elapsed={recorder.elapsed}
              maxDurationMs={180000}
              onStartRecording={recorder.startRecording}
              onStopRecording={recorder.stopRecording}
              onResetRecording={recorder.resetRecording}
              onStartStream={handleStartAnswer}
            />
            {recorder.blob && (
              <button
                className="btn btn-primary btn-lg w-full mt-4"
                onClick={() => handleAnswerRecorded(recorder.blob)}
              >
                ✨ Submit & Get Feedback
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage: Analyzing */}
      {stage === STAGES.ANALYZING && (
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
          <h3>Analyzing Your Response</h3>
          <p className="text-muted mt-4">{status || 'Processing speech and visual metrics...'}</p>
        </div>
      )}

      {/* Stage: Feedback */}
      {stage === STAGES.FEEDBACK && feedback && (
        <div className="animate-in">
          <div className="two-col">
            <div>
              <div className="feedback-panel">
                <h3>📋 AI Feedback</h3>
                <ul className="feedback-list">
                  {(feedback.feedback || feedback.tips || []).map((item, i) => (
                    <li key={i} className="feedback-item">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</li>
                  ))}
                </ul>
              </div>

              {feedback.scores && (
                <div className="metrics-grid mt-6">
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
            </div>

            <div>
              {feedback.sample_answer && (
                <div className="sample-answer">
                  <h4>✅ Sample Answer</h4>
                  <p>{feedback.sample_answer}</p>
                </div>
              )}

              {feedback.improvement_tips && (
                <div className="glass-card mt-6">
                  <h4 style={{ color: 'var(--warning)', marginBottom: 12 }}>💡 Improvement Tips</h4>
                  <ul className="feedback-list">
                    {feedback.improvement_tips.map((tip, i) => (
                      <li key={i} className="feedback-item tip">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleNextQuestion}>
                {currentQIndex + 1 < questions.length ? '→ Next Question' : '🎉 Finish Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
