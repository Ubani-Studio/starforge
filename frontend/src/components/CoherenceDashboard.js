import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CrossModalCoherence from './CrossModalCoherence';

/**
 * Coherence Dashboard - Main View
 * Central hub showing Audio DNA + Visual DNA + Cross-Modal Alignment
 * Makes aesthetic coherence the centerpiece of the experience
 */
const CoherenceDashboard = ({ userId = 'default_user' }) => {
  const [audioDNA, setAudioDNA] = useState(null);
  const [visualDNA, setVisualDNA] = useState(null);
  const [tizitaData, setTizitaData] = useState(null);
  const [connectingTizita, setConnectingTizita] = useState(false);
  const [tasteCoherence, setTasteCoherence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('hybrid'); // 'hybrid' | 'dj' | 'original'

  useEffect(() => {
    fetchAllData();
  }, [userId, analysisMode]);

  // Sync visual DNA when tizita connects (without refetching audio)
  useEffect(() => {
    if (tizitaData && !tizitaData.error) {
      setVisualDNA(tizitaData.visualDNA);
    }
  }, [tizitaData]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Audio DNA + Taste Coherence in PARALLEL
      const [audioResponse, coherenceResponse] = await Promise.all([
        axios.get(`/api/deep/audio/influence-genealogy?user_id=${userId}&mode=${analysisMode}`),
        axios.get(`/api/audio/taste/coherence?user_id=${userId}`)
      ]);

      if (audioResponse.data.success) {
        setAudioDNA(audioResponse.data.genealogy);
      }
      if (coherenceResponse.data.success) {
        setTasteCoherence(coherenceResponse.data);
      }

    } catch (error) {
      console.error('Error fetching DNA data:', error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTizita = async () => {
    setConnectingTizita(true);

    try {
      // Fetch profile, top photos, and visual DNA in PARALLEL
      const [profileRes, photosRes, dnaRes] = await Promise.all([
        axios.get('/api/deep/tizita/profile'),
        axios.get('/api/deep/tizita/top-photos', {
          params: {
            limit: 50,
            minScore: 0.5
          }
        }),
        axios.get('/api/deep/tizita/visual-dna')
      ]);

      const connectedData = {
        profile: profileRes.data.profile,
        photos: photosRes.data.photos,
        visualDNA: dnaRes.data.visualDNA
      };

      setTizitaData(connectedData);
      setVisualDNA(connectedData.visualDNA);
    } catch (error) {
      console.error('Failed to connect to Tizita:', error);
      setTizitaData({
        error: true,
        visualDNA: {
          styleDescription: 'Connection failed',
          confidence: 0
        }
      });
    } finally {
      setConnectingTizita(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mb-4"></div>
          <p className="text-brand-secondary">Analyzing your aesthetic DNA...</p>
        </div>
      </div>
    );
  }

  const hasData = audioDNA || visualDNA;

  if (!hasData) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <h1 className="text-display-xl text-brand-text mb-8">Aesthetic DNA</h1>
        <p className="text-body text-brand-secondary mb-8">
          Upload music and connect Tizita to analyze your aesthetic DNA across audio and visual domains.
        </p>
        <div className="grid grid-cols-2 gap-6 text-left">
          <div className="border border-brand-border p-6">
            <h3 className="text-brand-text font-medium mb-2">Audio DNA</h3>
            <p className="text-body-sm text-brand-secondary">
              Upload tracks or import Rekordbox library to analyze your sonic palette, taste coherence, and genre lineage.
            </p>
          </div>
          <div className="border border-brand-border p-6">
            <h3 className="text-brand-text font-medium mb-2">Visual DNA</h3>
            <p className="text-body-sm text-brand-secondary">
              Connect Tizita to analyze your photo aesthetics, color palettes, and visual themes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-display-xl text-brand-text mb-4">Aesthetic DNA</h1>
        <div className="mb-12" />

        {/* Quick Stats */}
        <div className="flex gap-8 mb-8">
          {audioDNA && (
            <div>
              <p className="uppercase-label text-brand-secondary mb-1">Audio Tracks</p>
              <p className="text-display-md text-brand-text">{audioDNA.trackCount || 0}</p>
            </div>
          )}
          {visualDNA && (
            <div>
              <p className="uppercase-label text-brand-secondary mb-1">Visual Samples</p>
              <p className="text-display-md text-brand-text">{visualDNA.photoCount || 0}</p>
            </div>
          )}
          {tasteCoherence && (
            <div>
              <p className="uppercase-label text-brand-secondary mb-1">Taste Coherence</p>
              <p className="text-display-md text-brand-text">
                {(tasteCoherence.coherence?.overall * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Audio DNA + Visual DNA */}
      <div className="grid grid-cols-2 gap-8">
        {/* Audio DNA Card */}
        <div className="border border-brand-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-display-sm text-brand-text">Audio DNA</h3>

            {/* Mode Selector */}
            <div className="flex gap-0 border-b border-brand-border">
              <button
                onClick={() => setAnalysisMode('original')}
                className={`px-3 py-1 text-xs capitalize tracking-wider transition-all ${
                  analysisMode === 'original'
                    ? 'text-brand-text border-b-2 border-brand-text'
                    : 'text-brand-secondary hover:text-brand-text'
                }`}
              >
                MY MUSIC
              </button>
              <button
                onClick={() => setAnalysisMode('dj')}
                className={`px-3 py-1 text-xs capitalize tracking-wider transition-all ${
                  analysisMode === 'dj'
                    ? 'text-brand-text border-b-2 border-brand-text'
                    : 'text-brand-secondary hover:text-brand-text'
                }`}
              >
                DJ LIBRARY
              </button>
              <button
                onClick={() => setAnalysisMode('hybrid')}
                className={`px-3 py-1 text-xs capitalize tracking-wider transition-all ${
                  analysisMode === 'hybrid'
                    ? 'text-brand-text border-b-2 border-brand-text'
                    : 'text-brand-secondary hover:text-brand-text'
                }`}
              >
                HYBRID
              </button>
            </div>
          </div>

          {audioDNA ? (
            <div className="space-y-4">
              {/* Primary Genre */}
              {audioDNA.primaryGenre && (
                <div>
                  <p className="uppercase-label text-brand-secondary mb-2">Primary Genre</p>
                  <p className="text-brand-text font-medium">{audioDNA.primaryGenre.name}</p>
                  <p className="text-body-xs text-brand-secondary mt-1">
                    {audioDNA.primaryGenre.cultural_context}
                  </p>
                </div>
              )}

              {/* Top Influences */}
              {audioDNA.influences && audioDNA.influences.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-border">
                  <p className="uppercase-label text-brand-secondary mb-3">Genre Distribution</p>
                  <div className="space-y-2">
                    {audioDNA.influences.slice(0, 5).map((influence, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-body-sm mb-1">
                          <span className="text-brand-text">{influence.genre.name}</span>
                          <span className="text-brand-secondary">{influence.percentage}%</span>
                        </div>
                        <div className="h-2 bg-brand-border overflow-hidden">
                          <div
                            className="h-full bg-brand-text transition-all"
                            style={{ width: `${influence.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sonic Signature */}
              {audioDNA.influences && audioDNA.influences.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-border">
                  <p className="uppercase-label text-brand-secondary mb-2">Sonic Signature</p>
                  <div className="grid grid-cols-2 gap-3 text-body-sm">
                    <div>
                      <p className="text-brand-secondary">Avg BPM</p>
                      <p className="text-brand-text font-medium">
                        {Math.round(
                          audioDNA.influences.reduce((sum, i) => sum + (i.avgBpm || 0), 0) /
                          audioDNA.influences.length
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-brand-secondary">Avg Energy</p>
                      <p className="text-brand-text font-medium">
                        {(
                          audioDNA.influences.reduce((sum, i) => sum + (i.avgEnergy || 0), 0) /
                          audioDNA.influences.length * 100
                        ).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-brand-secondary">Avg Valence</p>
                      <p className="text-brand-text font-medium">
                        {(
                          audioDNA.influences.reduce((sum, i) => sum + (i.avgValence || 0), 0) /
                          audioDNA.influences.length * 100
                        ).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-brand-secondary">Genres</p>
                      <p className="text-brand-text font-medium">{audioDNA.influences.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-body-sm text-brand-secondary italic">
              Upload tracks to analyze your audio DNA
            </p>
          )}
        </div>

        {/* Visual DNA Card */}
        <div className="border border-brand-border p-6">
          <h3 className="text-display-sm text-brand-text mb-4">Visual DNA</h3>

          {!tizitaData || tizitaData.error ? (
            <div className="space-y-4">
              <p className="text-body-sm text-brand-secondary mb-6">
                Direct access to your Tizita photo collection
              </p>
              <button
                onClick={handleConnectTizita}
                disabled={connectingTizita}
                className="btn-primary w-full"
              >
                {connectingTizita ? 'Connecting...' : 'Connect Tizita'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Style Description */}
              {tizitaData.visualDNA?.styleDescription && (
                <p className="text-body text-brand-text mb-4">
                  {tizitaData.visualDNA.styleDescription}
                </p>
              )}

              {/* Color Palette */}
              {tizitaData.visualDNA?.colorPalette && tizitaData.visualDNA.colorPalette.length > 0 && (
                <div className="mb-4">
                  <p className="uppercase-label text-brand-secondary mb-2">Color Palette</p>
                  <div className="flex gap-2">
                    {tizitaData.visualDNA.colorPalette.map((color, idx) => (
                      <div key={idx} className="flex-1">
                        <div
                          className="h-12 border border-brand-border"
                          style={{ backgroundColor: color.hex }}
                          title={`${color.name} (${color.hex})`}
                        />
                        <p className="text-body-sm text-brand-secondary mt-1 text-center">
                          {color.hex}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Themes */}
              {visualDNA?.themes && visualDNA.themes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-border">
                  <p className="uppercase-label text-brand-secondary mb-2">Visual Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {visualDNA.themes.slice(0, 8).map((theme, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-brand-border text-brand-text text-body-xs"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="text-body-sm text-brand-secondary pt-4 border-t border-brand-border">
                {tizitaData.profile?.stats?.total_photos || 0} photos analyzed •{' '}
                {tizitaData.profile?.stats?.highlight_count || 0} highlights
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Taste Coherence Section */}
      {tasteCoherence && tasteCoherence.coherence && (
        <div className="border border-brand-border p-6">
          <h3 className="text-display-sm text-brand-text mb-4">Taste Coherence</h3>
          <p className="text-body-sm text-brand-secondary mb-4">{tasteCoherence.interpretation?.description}</p>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(tasteCoherence.coherence).map(([key, value]) => {
              if (key === 'overall') return null;
              return (
                <div key={key} className="border border-brand-border p-4">
                  <p className="text-body-xs text-brand-secondary mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-display-sm text-brand-text">{(value * 100).toFixed(0)}%</p>
                  <div className="h-2 bg-brand-border overflow-hidden mt-2">
                    <div
                      className="h-full bg-brand-text"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Modal Coherence */}
      {audioDNA && visualDNA && (
        <div>
          <CrossModalCoherence userId={userId} />
        </div>
      )}

      {/* Call to Action */}
      <div className="border border-brand-border p-6">
        <p className="text-body text-brand-text mb-3">
          Your aesthetic DNA is your creative fingerprint. Use it to maintain coherence across everything you create.
        </p>
        <div className="flex gap-4">
          <button className="btn-primary">
            View Influence Genealogy
          </button>
          <button className="btn-secondary">
            Filter Library by Coherence
          </button>
          <button className="btn-secondary">
            Export & Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoherenceDashboard;
