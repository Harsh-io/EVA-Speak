// Top application header bar with page title and user avatar
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Header({ title, actions }) {
  const { user, logout } = useAuth();

  return (
    <header className="top-header">
      <div className="top-header-title-group">
        <h2 className="top-header-title">{title || 'EVA Speak'}</h2>
      </div>

      <div className="top-header-actions">
        {actions}

        {user && (
          <div className="header-user-menu">
            <button className="header-avatar-btn" title={`Signed in as ${user.name}`}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="header-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="header-avatar-placeholder">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
