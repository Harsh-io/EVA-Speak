// Video recorder component with preview
import React, { useEffect, useRef, useMemo } from 'react';

export default function VideoRecorder({
  stream,
  blob,
  isRecording,
  isPaused,
  elapsed,
  maxDurationMs = 120000,
  onStartRecording,
  onStopRecording,
  onResetRecording,
  onStartStream,
  compact = false,
}) {
  const liveVideoRef = useRef(null);
  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const elapsedSec = Math.floor(elapsed / 1000);
  const remaining = Math.max(0, Math.ceil((maxDurationMs - elapsed) / 1000));
  const progress = Math.min(100, (elapsed / maxDurationMs) * 100);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={compact ? '' : 'glass-card no-hover'} style={compact ? {} : { padding: 0, overflow: 'hidden' }}>
      <div className="video-container">
        {blob && previewUrl ? (
          <video src={previewUrl} controls playsInline />
        ) : stream ? (
          <video ref={liveVideoRef} autoPlay muted playsInline />
        ) : (
          <div className="video-overlay" style={{ pointerEvents: 'auto', cursor: 'pointer', background: 'var(--bg-tertiary)' }} onClick={onStartStream}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.6 }}>📷</div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Click to enable camera</p>
            </div>
          </div>
        )}
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            {isPaused ? 'PAUSED' : `REC ${formatTime(elapsedSec)}`}
          </div>
        )}
      </div>

      {isRecording && (
        <div style={{ padding: '8px 16px' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%`, background: progress > 85 ? 'var(--error)' : undefined }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatTime(elapsedSec)}</span>
            <span style={{ fontSize: '0.75rem', color: progress > 85 ? 'var(--error)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatTime(remaining)}</span>
          </div>
        </div>
      )}

      <div className="video-controls">
        {!stream && !blob && (
          <button className="btn btn-secondary" onClick={onStartStream}>
            📷 Enable Camera
          </button>
        )}
        {stream && !isRecording && !blob && (
          <button className="btn btn-primary" onClick={onStartRecording}>
            ⏺ Start Recording
          </button>
        )}
        {isRecording && (
          <button className="btn btn-danger" onClick={onStopRecording}>
            ⏹ Stop Recording
          </button>
        )}
        {blob && (
          <>
            <button className="btn btn-secondary" onClick={onResetRecording}>
              ↺ Re-record
            </button>
          </>
        )}
      </div>
    </div>
  );
}
