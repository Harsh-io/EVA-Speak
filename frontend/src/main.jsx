// EVA Speak — Main Application Shell
import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InterviewPractice from './pages/InterviewPractice.jsx';
import ImpromptuSpeaking from './pages/ImpromptuSpeaking.jsx';
import VocalPractice from './pages/VocalPractice.jsx';
import AnalyzeVideo from './pages/AnalyzeVideo.jsx';
import History from './pages/History.jsx';
import Results from './pages/Results.jsx';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  interview: 'Interview Practice',
  impromptu: 'Impromptu Speaking',
  vocal: 'Vocal Practice',
  analyze: 'Analyze Video',
  history: 'My History',
  results: 'Results',
};

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [resultsData, setResultsData] = useState(null);

  const navigate = useCallback((page, data = null) => {
    setActivePage(page);
    if (page === 'results' && data) setResultsData(data);
    window.scrollTo(0, 0);
    const path = page === 'dashboard' ? '/' : `/${page}`;
    window.history.replaceState(null, '', path);
  }, []);

  // Loading state
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

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  // Render active page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'interview': return <InterviewPractice onNavigate={navigate} />;
      case 'impromptu': return <ImpromptuSpeaking onNavigate={navigate} />;
      case 'vocal': return <VocalPractice onNavigate={navigate} />;
      case 'analyze': return <AnalyzeVideo onNavigate={navigate} />;
      case 'history': return <History onNavigate={navigate} />;
      case 'results': return <Results report={resultsData?.report} mode={resultsData?.mode} question={resultsData?.question} onBack={() => navigate(resultsData?.backPage || 'dashboard')} primaryLabel={resultsData?.primaryLabel || 'New Session'} onPrimary={() => navigate(resultsData?.backPage || 'dashboard')} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <Header
        title={PAGE_TITLES[activePage] || 'EVA Speak'}
        actions={
          <button className="btn btn-ghost" onClick={() => navigate('history')}>
            ?? History
          </button>
        }
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
