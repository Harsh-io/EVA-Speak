// User History page with trend charts
import React, { useState, useEffect } from 'react';
import { getUserHistory, getUserStats } from '../utils/api.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';

const MODE_ICONS = { interview: '🎯', impromptu: '⚡', vocal: '🎙️', analyze: '📊' };
const MODE_LABELS = { interview: 'Interview Practice', impromptu: 'Impromptu Speaking', vocal: 'Vocal Practice', analyze: 'Video Analysis' };

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [historyData, statsData] = await Promise.all([
          getUserHistory().catch(() => ({ sessions: [] })),
          getUserStats().catch(() => null),
        ]);
        setSessions(historyData.sessions || []);
        setStats(statsData);
      } catch {
        // Non-critical, UI shows empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = activeFilter === 'all' ? sessions : sessions.filter(s => s.mode === activeFilter);

  // Chart data
  const chartData = [...sessions]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-20)
    .map(s => ({
      date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.score || 0,
      mode: s.mode,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem' }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{payload[0]?.payload?.date}</p>
        <p style={{ color: 'var(--accent-primary)' }}>Score: {payload[0]?.value}</p>
      </div>
    );
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <p className="eyebrow">Your Progress</p>
        <h1>Practice History</h1>
        <p className="subtitle">Track your improvement over time across all practice modes.</p>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner" />
          <p className="text-muted">Loading history...</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="metrics-grid mb-6 stagger">
              <div className="metric-card">
                <div className="metric-label">Total Sessions</div>
                <div className="metric-value">{stats.totalSessions || 0}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Score</div>
                <div className={`metric-value ${(stats.averageScore || 0) >= 70 ? 'good' : (stats.averageScore || 0) >= 50 ? 'warning' : 'bad'}`}>
                  {stats.averageScore ? Math.round(stats.averageScore) : '—'}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Best Score</div>
                <div className="metric-value good">{stats.bestScore || '—'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Practice Streak</div>
                <div className="metric-value">{stats.streak || 0} days</div>
              </div>
            </div>
          )}

          {/* Score Trend Chart */}
          {chartData.length > 1 && (
            <div className="glass-card mb-6">
              <h3 style={{ marginBottom: 20 }}>📈 Score Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGradient)" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="tabs mb-6">
            {[
              { id: 'all', label: 'All' },
              { id: 'interview', label: '🎯 Interview' },
              { id: 'impromptu', label: '⚡ Impromptu' },
              { id: 'vocal', label: '🎙️ Vocal' },
              { id: 'analyze', label: '📊 Analysis' },
            ].map(tab => (
              <button key={tab.id} className={`tab-btn ${activeFilter === tab.id ? 'active' : ''}`} onClick={() => setActiveFilter(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Session List */}
          {filtered.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">📭</div>
              <h3>No sessions yet</h3>
              <p>Complete a practice session to see your history and progress here.</p>
            </div>
          ) : (
            <div className="history-list stagger">
              {filtered.map((session, i) => (
                <div key={session._id || i} className="history-item">
                  <div className="history-icon">
                    {MODE_ICONS[session.mode] || '📊'}
                  </div>
                  <div className="history-meta">
                    <h4>{MODE_LABELS[session.mode] || session.mode}</h4>
                    <p>
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {session.duration && ` · ${Math.round(session.duration)}s`}
                    </p>
                  </div>
                  <div className="history-score">
                    {session.score ? `${Math.round(session.score)}/100` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
