import React, { useState } from 'react';
import MusicLibrary from './MusicLibrary';
import AudioAnalysisCompact from './AudioAnalysisCompact';
import CatalogInsights from './CatalogInsights';
import InfluenceGenealogyPanel from './InfluenceGenealogyPanel';

/**
 * Library Page
 * Complete music library management and analysis
 * Combines track library, catalog insights, and influence genealogy
 */
const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [libraryKey, setLibraryKey] = useState(0);

  const handleUploadSuccess = () => {
    // Force MusicLibrary to re-fetch by changing its key
    setLibraryKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'library', label: 'Track Library' },
    { id: 'insights', label: 'Catalog Analysis' },
    { id: 'genealogy', label: 'Influence Genealogy' }
  ];

  return (
    <div className="min-h-screen bg-brand-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-xl text-brand-text mb-8">Music Library</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-brand-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-sm tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'text-brand-text border-b-2 border-brand-primary'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'library' && (
            <div className="space-y-6">
              <AudioAnalysisCompact
                onUploadSuccess={handleUploadSuccess}
              />
              <MusicLibrary
                key={libraryKey}
                userId="default_user"
                onTrackSelect={setSelectedTrack}
              />
            </div>
          )}

          {activeTab === 'insights' && (
            <CatalogInsights userId="default_user" />
          )}

          {activeTab === 'genealogy' && (
            <InfluenceGenealogyPanel userId="default_user" />
          )}
        </div>

        {/* Track Detail Sidebar (if track selected) */}
        {selectedTrack && (
          <div className="fixed right-0 top-0 h-full w-96 bg-brand-bg border-l border-brand-border p-6 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-display-md">Track Details</h3>
              <button
                onClick={() => setSelectedTrack(null)}
                className="text-brand-secondary hover:text-brand-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="uppercase-label text-brand-secondary mb-1">Filename</p>
                <p className="text-body-sm text-brand-text break-words">{selectedTrack.filename}</p>
              </div>

              {selectedTrack.bpm && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">BPM</p>
                  <p className="text-body-sm text-brand-text">{selectedTrack.bpm.toFixed(1)}</p>
                </div>
              )}

              {selectedTrack.key && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Key</p>
                  <p className="text-body-sm text-brand-text">{selectedTrack.key}</p>
                </div>
              )}

              {selectedTrack.energy !== null && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Energy</p>
                  <p className="text-body-sm text-brand-text">{(selectedTrack.energy * 100).toFixed(0)}%</p>
                  <div className="mt-2 h-2 bg-brand-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary"
                      style={{ width: `${selectedTrack.energy * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedTrack.duration_seconds && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Duration</p>
                  <p className="text-body-sm text-brand-text">
                    {Math.floor(selectedTrack.duration_seconds / 60)}:
                    {Math.floor(selectedTrack.duration_seconds % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              )}

              {selectedTrack.rekordbox_play_count > 0 && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Play Count</p>
                  <p className="text-body-sm text-brand-text">{selectedTrack.rekordbox_play_count} plays</p>
                </div>
              )}

              {selectedTrack.rekordbox_star_rating > 0 && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Star Rating</p>
                  <p className="text-body-sm text-brand-text">
                    {(() => {
                      const stars = Math.round(selectedTrack.rekordbox_star_rating / 51);
                      return '★'.repeat(stars) + '☆'.repeat(5 - stars);
                    })()}
                  </p>
                </div>
              )}

              {selectedTrack.source && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Source</p>
                  <p className="text-body-sm text-brand-text capitalize">{selectedTrack.source}</p>
                </div>
              )}

              {selectedTrack.rekordbox_comments && !selectedTrack.rekordbox_comments.includes('www.mediahuman.com') && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-1">Comments</p>
                  <p className="text-body-sm text-brand-text">{selectedTrack.rekordbox_comments}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
