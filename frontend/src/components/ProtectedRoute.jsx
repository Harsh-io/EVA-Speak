// Auth guard component — redirects unauthenticated users to login
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Login from '../pages/Login.jsx';

/**
 * ProtectedRoute — renders children only when the user is authenticated.
 * Shows a loading spinner while auth state is being resolved.
 * Falls back to the Login page for unauthenticated users.
 */
export default function ProtectedRoute({ children, fallback }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p className="text-muted">Loading EVA Speak...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || <Login />;
  }

  return children;
}
