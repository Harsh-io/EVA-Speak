// Dashboard — landing page with live stats and feature cards
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useApi } from '../hooks/useApi.js';
import MetricCard, { scoreQuality } from '../components/MetricCard.jsx';

const FEATURES = [
  {
    id: 'interview',
    icon: '🎯',
    title: 'Interview Practice',
    description: 'Upload your resume, get AI-generated interview questions, answer on video, and receive instant personalized feedback with sample answers.',
    badge: 'AI-Powered',
    badgeClass: 'badge-ai',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
  },
  {
    id: 'impromptu',
    icon: '⚡',
    title: 'Impromptu Speaking',
    description: 'Get a random topic, speak for 60 seconds, and receive real-time feedback on fluency, filler words, pacing, and eye contact.',
    badge: 'New',
    badgeClass: 'badge-new',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.06) 100%)',
  },
  {
    id: 'vocal',
    icon: '🎙️',
    title: 'Vocal Practice',
    description: 'Read text passages aloud and get detailed feedback on pronunciation, grammar, vocal metrics, and delivery with AI coaching tips.',
    badge: 'New',
    badgeClass: 'badge-new',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(52,211,153,0.06) 100%)',
  },
  {
    id: 'analyze',
    icon: '📊',
    title: 'Analyze Video',
    description: 'Upload an MP4 recording for full speech and visual analysis — word accuracy, speech rate, eye contact, head stability, and more.',
    badge: null,
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(96,165,250,0.06) 100%)',
  },
];

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : null;
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome to EVA Speak';

  // Load live stats — cached for 60 seconds
  const { data: stats, loading: statsLoading } = useApi('/api/user/stats', {
    immediate: !!user,
    cache: true,
    cacheTtl: 60000,
  });

  const hasStats = stats && stats.totalSessions > 0;

  return (
    <div className="animate-in">
      {/* Hero greeting */}
      <div className="page-header" style={{ marginBottom: hasStats ? 24 : 40 }}>
        <p className="eyebrow">Dashboard</p>
        <h1>{greeting} 👋</h1>
        <p className="subtitle">
          Choose a practice mode to improve your communication skills with AI-powered feedback.
        </p>
      </div>

      {/* Live stats row — only shown when user has sessions */}
      {user && (
        <div className={`metrics-grid mb-8 stagger${statsLoading ? ' loading-shimmer' : ''}`}
             style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <MetricCard
            label="Total Sessions"
            value={statsLoading ? null : (stats?.totalSessions ?? 0)}
            icon="📚"
          />
          <MetricCard
            label="Average Score"
            value={statsLoading ? null : (stats?.averageScore != null ? Math.round(stats.averageScore) : null)}
            suffix={stats?.averageScore != null ? '/100' : ''}
            icon="🏆"
            quality={stats?.averageScore != null ? scoreQuality(stats.averageScore) : undefined}
          />
          <MetricCard
            label="Best Score"
            value={statsLoading ? null : (stats?.bestScore != null ? Math.round(stats.bestScore) : null)}
            suffix={stats?.bestScore != null ? '/100' : ''}
            icon="⭐"
            quality={stats?.bestScore != null ? scoreQuality(stats.bestScore) : undefined}
          />
          <MetricCard
            label="Practice Streak"
            value={statsLoading ? null : (stats?.streak ?? 0)}
            suffix={stats?.streak ? ' days' : ''}
            icon="🔥"
          />
        </div>
      )}

      {/* Mode distribution quick glance */}
      {hasStats && stats.modeDistribution && (
        <div className="glass-card mb-8" style={{ padding: '16px 24px' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Your Activity</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {Object.entries(stats.modeDistribution).map(([mode, mData]) => (
              <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>
                  {mode === 'interview' ? '🎯' : mode === 'impromptu' ? '⚡' : mode === 'vocal' ? '🎙️' : '📊'}
                </span>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1 }}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {mData.count} {mData.count === 1 ? 'session' : 'sessions'}
                    {mData.avgScore ? ` · avg ${Math.round(mData.avgScore)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature cards */}
      <p className="eyebrow mb-4">Practice Modes</p>
      <div className="feature-grid stagger">
        {FEATURES.map(feature => (
          <div
            key={feature.id}
            className="feature-card"
            style={{ background: feature.gradient }}
            onClick={() => onNavigate(feature.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate(feature.id)}
          >
            <div className="feature-card-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            {feature.badge && (
              <span className={`badge ${feature.badgeClass}`}>{feature.badge}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
