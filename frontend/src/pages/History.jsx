// User History page with session details, trend charts, and pagination
import React, { useState, useEffect, useCallback } from 'react';
import { getUserHistory, getUserStats } from '../utils/api.jsx';
import { api } from '../utils/api.jsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Results from './Results.jsx';

const MODE_ICONS = { interview: '🎯', impromptu: '⚡', vocal: '🎙️', analyze: '📊' };
const MODE_LABELS = { interview: 'Interview Practice', impromptu: 'Impromptu Speaking', vocal: 'Vocal Practice', analyze: 'Video Analysis' };
const PAGE_SIZE = 20;

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = useCallback(async (pageNum = 1, mode = 'all', append = false) => {
    const params = `?page=${pageNum}&limit=${PAGE_SIZE}${mode !== 'all' ? `&mode=${mode}` : ''}`;
    try {
      const data = await api.get(`/api/user/history${params}`);
      if (append) {
        setSessions(prev => [...prev, ...(data.sessions || [])]);
      } else {
        setSessions(data.sessions || []);
      }
      setTotalPages(data.pagination?.pages || 1);
      setPage(pageNum);
    } catch {
      if (!append) setSessions([]);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [, statsData] = await Promise.all([
          fetchHistory(1, activeFilter),
          getUserStats().catch(() => null),
        ]);
        setStats(statsData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchHistory, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchHistory(page + 1, activeFilter, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setDetailLoading(true);
    setSessionDetail(null);
    try {
      const detail = await api.get(`/api/user/sessions/${session._id}`);
      setSessionDetail(detail);
    } catch {
      setSessionDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedSession(null);
    setSessionDetail(null);
  };

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

  // Session detail modal
  if (selectedSession) {
    return (
      <div className="animate-in">
        <div style={{ marginBottom: 24 }}>
          <button className="btn btn-ghost" onClick={closeDetail}>← Back to History</button>
        </div>

        {detailLoading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <p className="text-muted">Loading session details...</p>
          </div>
        ) : sessionDetail?.report ? (
          <Results
            report={sessionDetail.report}
            mode={sessionDetail.mode}
            onBack={closeDetail}
            backLabel="← Back to History"
          />
        ) : (
          <div className="glass-card">
            <h3 style={{ marginBottom: 16 }}>
              {MODE_ICONS[selectedSession.mode] || '📊'} {MODE_LABELS[selectedSession.mode] || selectedSession.mode}
            </h3>
            <div className="metrics-grid mb-6">
              <div className="metric-card">
                <div className="metric-label">Score</div>
                <div className={`metric-value ${(selectedSession.score || 0) >= 70 ? 'good' : (selectedSession.score || 0) >= 50 ? 'warning' : 'bad'}`}>
                  {selectedSession.score ? `${Math.round(selectedSession.score)}/100` : '—'}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Duration</div>
                <div className="metric-value">{selectedSession.duration ? `${Math.round(selectedSession.duration)}s` : '—'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Date</div>
                <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                  {new Date(selectedSession.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
            {selectedSession.metadata?.questionText && (
              <div className="feedback-item mb-4"><strong>Question:</strong> {selectedSession.metadata.questionText}</div>
            )}
            {selectedSession.metadata?.topicText && (
              <div className="feedback-item mb-4"><strong>Topic:</strong> {selectedSession.metadata.topicText}</div>
            )}
            {selectedSession.metadata?.passageTitle && (
              <div className="feedback-item mb-4"><strong>Passage:</strong> {selectedSession.metadata.passageTitle} ({selectedSession.metadata.difficulty || 'medium'})</div>
            )}
            {sessionDetail?.feedback?.length > 0 && (
              <div className="feedback-panel mt-6">
                <h3>💡 Feedback</h3>
                <ul className="feedback-list">
                  {sessionDetail.feedback.map((item, i) => (
                    <li key={i} className="feedback-item">{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</li>
                  ))}
                </ul>
              </div>
            )}
            {sessionDetail?.scores && (
              <div className="metrics-grid mt-6">
                {Object.entries(sessionDetail.scores).filter(([k]) => !k.includes('weight')).map(([key, val]) => (
                  <div key={key} className="metric-card">
                    <div className="metric-label">{key.replace(/_/g, ' ')}</div>
                    <div className={`metric-value ${Number(val) >= 70 ? 'good' : Number(val) >= 50 ? 'warning' : 'bad'}`}>
                      {typeof val === 'number' ? Math.round(val) : val}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost mt-6" onClick={closeDetail}>← Back to History</button>
          </div>
        )}
      </div>
    );
  }

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
              <button key={tab.id} className={`tab-btn ${activeFilter === tab.id ? 'active' : ''}`} onClick={() => handleFilterChange(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Session List */}
          {sessions.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">📭</div>
              <h3>No sessions yet</h3>
              <p>Complete a practice session to see your history and progress here.</p>
            </div>
          ) : (
            <>
              <div className="history-list stagger">
                {sessions.map((session, i) => (
                  <div
                    key={session._id || i}
                    className="history-item"
                    onClick={() => handleSessionClick(session)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSessionClick(session)}
                  >
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
                        {session.metadata?.questionText && ` · ${session.metadata.questionText.slice(0, 50)}...`}
                        {session.metadata?.topicText && ` · ${session.metadata.topicText.slice(0, 50)}...`}
                        {session.metadata?.passageTitle && ` · ${session.metadata.passageTitle}`}
                      </p>
                    </div>
                    <div className="history-score">
                      {session.score ? `${Math.round(session.score)}/100` : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {page < totalPages && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <><div className="spinner" style={{ width: 16, height: 16 }} /> Loading...</>
                    ) : (
                      `Load More (page ${page + 1} of ${totalPages})`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
