// Login page with Google OAuth
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const { login, loading } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-scale" style={{ padding: 48 }}>
        <div className="login-logo">E</div>
        <h1>Welcome to EVA Speak</h1>
        <p className="login-subtitle">
          AI-powered communication coaching. Master interviews, speaking, and vocal delivery.
        </p>

        <button className="btn btn-google btn-lg w-full" onClick={login} disabled={loading}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Checking...' : 'Continue with Google'}
        </button>

        <div className="login-divider">or</div>

        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          Sign in once and you're always logged in. Your practice history, scores, and progress are saved automatically.
        </p>

        <div style={{ marginTop: 32, display: 'flex', gap: 24, justifyContent: 'center' }}>
          {[
            { icon: '🎯', label: 'Interview Prep' },
            { icon: '⚡', label: 'Impromptu' },
            { icon: '🎙️', label: 'Vocal Coach' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
