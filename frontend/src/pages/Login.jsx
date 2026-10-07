// Login page with Google OAuth + Email/Password
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const { login, loginWithEmail, register, loading, error: authError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const error = formError || authError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email || !password) {
      setFormError('Email and password are required.');
      return;
    }
    if (mode === 'register' && (!name || name.trim().length < 1)) {
      setFormError('Name is required.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err) {
      setFormError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || submitting;

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-scale" style={{ padding: 48 }}>
        <div className="login-logo">E</div>
        <h1>Welcome to EVA Speak</h1>
        <p className="login-subtitle">
          AI-powered communication coaching. Master interviews, speaking, and vocal delivery.
        </p>

        <button className="btn btn-google btn-lg w-full" onClick={login} disabled={isLoading}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? 'Please wait...' : 'Continue with Google'}
        </button>

        <div className="login-divider">or</div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={isLoading}>
            {isLoading ? '⏳ Please wait...' : mode === 'register' ? '🚀 Create Account' : '🔑 Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 20, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setFormError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 650, fontFamily: 'var(--font-sans)', fontSize: 'inherit', padding: 0 }}
              >
                Create one
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setFormError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 650, fontFamily: 'var(--font-sans)', fontSize: 'inherit', padding: 0 }}
              >
                Sign in
              </button>
            </>
          )}
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
