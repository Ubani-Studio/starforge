import React, { useState } from 'react';
import './App.css';
import CoherenceDashboard from './components/CoherenceDashboard';
import NommoPanel from './components/NommoPanel';
import LibraryPage from './components/LibraryPage';
import RelationalPanel from './components/RelationalPanel';

// Detect quiz callback — if subtaste_user_id param is present, open Nommo tab
const getInitialView = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('subtaste_user_id')) return 'genesis';
  return 'dashboard';
};

function App() {
  const [activeView, setActiveView] = useState(getInitialView);
  const [twinData, setTwinData] = useState(null);

  const handleTwinGenerated = (data) => {
    setTwinData(data);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="border-b border-brand-border py-8">
        <div className="max-w-container mx-auto px-8">
          <h1 className="text-display-lg text-brand-text">
            Ori
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-container mx-auto px-8 py-16">
        {/* Navigation */}
        <nav className="flex gap-6 mb-12 border-b border-brand-border pb-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`pb-4 uppercase-label transition-all ${
              activeView === 'dashboard'
                ? 'border-b-2 border-brand-text text-brand-text'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            Aesthetic DNA
          </button>
          <button
            onClick={() => setActiveView('library')}
            className={`pb-4 uppercase-label transition-all ${
              activeView === 'library'
                ? 'border-b-2 border-brand-text text-brand-text'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            Music Library
          </button>
          <button
            onClick={() => setActiveView('genesis')}
            className={`pb-4 uppercase-label transition-all ${
              activeView === 'genesis'
                ? 'border-b-2 border-brand-text text-brand-text'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            Nommo
          </button>
          <button
            onClick={() => setActiveView('relational')}
            className={`pb-4 uppercase-label transition-all ${
              activeView === 'relational'
                ? 'border-b-2 border-brand-text text-brand-text'
                : 'text-brand-secondary hover:text-brand-text'
            }`}
          >
            Relational
          </button>
        </nav>

        {/* View Content */}
        <div className="animate-fadeIn">
          {activeView === 'dashboard' && (
            <CoherenceDashboard userId="default_user" />
          )}

          {activeView === 'library' && (
            <LibraryPage />
          )}

          {activeView === 'genesis' && (
            <NommoPanel
              onTwinGenerated={handleTwinGenerated}
            />
          )}

          {activeView === 'relational' && (
            <RelationalPanel />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
