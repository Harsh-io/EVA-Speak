// Sidebar navigation component
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

const navItems = [
  { section: 'Overview' },
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { section: 'Practice Modes' },
  { id: 'interview', icon: '🎯', label: 'Interview Practice' },
  { id: 'impromptu', icon: '⚡', label: 'Impromptu Speaking' },
  { id: 'vocal', icon: '🎙️', label: 'Vocal Practice' },
  { id: 'analyze', icon: '📊', label: 'Analyze Video' },
  { section: 'Account' },
  { id: 'history', icon: '📈', label: 'My History' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">E</div>
        <span className="sidebar-brand-text">EVA Speak</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          if (item.section) {
            return (
              <div className="sidebar-section-label" key={`section-${index}`}>
                {item.section}
              </div>
            );
          }
          return (
            <button
              key={item.id}
              className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.picture ? (
              <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              user.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <button className="btn-ghost" onClick={logout} title="Sign out" style={{ padding: '6px 8px', fontSize: '0.75rem' }}>
            ↗
          </button>
        </div>
      )}
    </aside>
  );
}
