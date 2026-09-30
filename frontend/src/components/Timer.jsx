// Countdown timer ring component
import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function Timer({ durationSeconds = 60, running = false, onComplete }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef(null);
  const startedRef = useRef(null);

  useEffect(() => {
    if (running) {
      setRemaining(durationSeconds);
      startedRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedRef.current) / 1000);
        const newRemaining = Math.max(0, durationSeconds - elapsed);
        setRemaining(newRemaining);
        if (newRemaining <= 0) {
          clearInterval(intervalRef.current);
          onComplete?.();
        }
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, durationSeconds, onComplete]);

  const progress = running ? (remaining / durationSeconds) : 1;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - progress);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  const getColor = () => {
    if (remaining <= 10) return 'var(--error)';
    if (remaining <= 20) return 'var(--warning)';
    return 'var(--accent-primary)';
  };

  return (
    <div className="countdown-timer">
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="70" cy="70" r="52"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="6"
          />
          <circle
            cx="70" cy="70" r="52"
            fill="none"
            stroke={getColor()}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2rem',
            fontWeight: 700,
            color: getColor(),
            lineHeight: 1,
          }}>
            {minutes}:{seconds}
          </span>
        </div>
      </div>
      <span className="countdown-label">
        {running ? (remaining <= 10 ? 'Almost done!' : 'Time remaining') : 'Ready'}
      </span>
    </div>
  );
}
