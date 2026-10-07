// User Profile — account info, activity summary, preferences
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useApi } from '../hooks/useApi.js';
import MetricCard, { scoreQuality } from '../components/MetricCard.jsx';

const MODE_ICONS = { interview: '🎯', impromptu: '⚡', vocal: '🎙️', analyze: '📊' };
const MODE_LABELS = { interview: 'Interview', impromptu: 'Impromptu', vocal: 'Vocal', analyze: 'Analysis' };

export default function Profile() {
  const { user, logout } = useAuth();

  const { data: stats, loading: statsLoading } = useApi('/api/user/stats', {
    immediate: !!user,
    cache: true,
    cacheTtl: 60000,
  });

  const { data: coaching, loading: coachingLoading } = useApi('/api/user/coaching-report', {
    immediate: !!user,
    cache: true,
    cacheTtl: 300000,
  });

  if (!user) return null;

  const hasStats = stats && stats.totalSessions > 0;
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';
  const totalMinutes = stats?.totalDuration ? Math.round(stats.totalDuration / 60) : 0;

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Your Account</p>
        <h1>Profile</h1>
        <p className="subtitle">View your account information, practice statistics, and coaching insights.</p>
      </div>

      {/* User Info Card */}
      <div className="two-col mb-8">
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 'var(--radius-xl)',
            background: 'var(--accent-gradient)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 900, color: 'white',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {user.picture ? (
              <img src={user.picture} alt={user.name} referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
              {user.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 2 }}>
              {user.email}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              Member since {memberSince}
            </p>
          </div>
          <button className="btn btn-danger" onClick={logout} style={{ flexShrink: 0 }}>
            Sign Out
          </button>
        </div>

        {/* Quick Stats */}
        <div className="glass-card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>📊 Quick Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessions</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {statsLoading ? '...' : (stats?.totalSessions ?? 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Practice Time</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {statsLoading ? '...' : `${totalMinutes}m`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: stats?.averageScore >= 70 ? 'var(--success)' : stats?.averageScore >= 50 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {statsLoading ? '...' : (stats?.averageScore ? Math.round(stats.averageScore) : '—')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Streak</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {statsLoading ? '...' : `${stats?.streak ?? 0}d`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Mode */}
      {hasStats && stats.modeDistribution && (
        <div className="glass-card mb-8">
          <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 700 }}>🎯 Performance by Mode</h3>
          <div className="metrics-grid stagger">
            {Object.entries(stats.modeDistribution).map(([mode, mData]) => (
              <div key={mode} className="metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{MODE_ICONS[mode] || '📊'}</span>
                  <span className="metric-label" style={{ margin: 0 }}>{MODE_LABELS[mode] || mode}</span>
                </div>
                <div className="metric-value" style={{ marginBottom: 4 }}>{mData.count} {mData.count === 1 ? 'session' : 'sessions'}</div>
                {mData.avgScore != null && (
                  <div className="metric-sub">Avg: <span style={{ fontWeight: 700, color: mData.avgScore >= 70 ? 'var(--success)' : mData.avgScore >= 50 ? 'var(--warning)' : 'var(--error)' }}>{Math.round(mData.avgScore)}/100</span></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaching Insights */}
      {coaching && (
        <div className="glass-card mb-8">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>💡 Coaching Insights</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 20 }}>
            {coaching.summary}
          </p>

          {coaching.strengths?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>✅ Strengths</h4>
              <ul className="feedback-list">
                {coaching.strengths.map((s, i) => <li key={i} className="feedback-item">{s}</li>)}
              </ul>
            </div>
          )}

          {coaching.growth_areas?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>🎯 Growth Areas</h4>
              <ul className="feedback-list">
                {coaching.growth_areas.map((a, i) => <li key={i} className="feedback-item">{a}</li>)}
              </ul>
            </div>
          )}

          {coaching.recommendations?.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>📋 Recommendations</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {coaching.recommendations.map((rec, i) => (
                  <div key={i} className="feedback-item" style={{ borderLeftColor: rec.priority === 'high' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    <strong>{rec.title}</strong> — {rec.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasStats && !statsLoading && (
        <div className="empty-state glass-card">
          <div className="empty-icon">📭</div>
          <h3>No Activity Yet</h3>
          <p>Complete your first practice session to see detailed stats and personalized coaching insights here.</p>
        </div>
      )}
    </div>
  );
}
