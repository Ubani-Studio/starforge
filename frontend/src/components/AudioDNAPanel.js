import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Audio DNA Panel
 * Displays Sonic Palette - the audio equivalent of Visual DNA color palette
 * Shows frequency bands, tonal characteristics, and sonic signature
 */
const AudioDNAPanel = ({ embedded = false, audioData, rekordboxData, tizitaData }) => {
  const [sonicPalette, setSonicPalette] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState('combined'); // 'combined', 'dj_collection', 'my_music'

  useEffect(() => {
    fetchSonicPalette();
  }, [context]);

  const fetchSonicPalette = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/deep/audio/sonic-palette', {
        params: { context }
      });

      if (response.data.success) {
        setSonicPalette(response.data.sonicPalette);
      }
    } catch (err) {
      console.error('Failed to fetch sonic palette:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshSonicPalette = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/deep/audio/sonic-palette/refresh', {
        context
      });

      if (response.data.success) {
        setSonicPalette(response.data.sonicPalette);
      }
    } catch (err) {
      console.error('Failed to refresh sonic palette:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't show panel if no audio data available
  if (!audioData && !rekordboxData) {
    return null;
  }

  if (loading && !sonicPalette) {
    return (
      <div className="mt-6 border border-brand-border p-6 text-center">
        <p className="text-brand-secondary">Analyzing sonic palette...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 border border-brand-border p-6">
        <p className="uppercase-label text-brand-secondary mb-3">Audio DNA</p>
        <p className="text-body-sm text-brand-secondary">{error}</p>
        <button
          onClick={fetchSonicPalette}
          className="mt-4 btn-secondary w-full"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!sonicPalette) {
    return null;
  }

  // Get prominence color for frequency bar
  const getProminenceColor = (prominence) => {
    if (prominence >= 0.3) return 'bg-blue-500';
    if (prominence >= 0.2) return 'bg-purple-500';
    return 'bg-pink-500';
  };

  return (
    <div className={embedded ? '' : 'mt-6 border border-brand-border p-6'}>
      {!embedded && (
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="uppercase-label text-brand-text mb-1">Audio DNA</p>
            <p className="text-body-sm text-brand-secondary">
              Sonic palette extracted from {sonicPalette.trackCount} tracks
            </p>
          </div>
          <button
            onClick={refreshSonicPalette}
            disabled={loading}
            className="text-body-sm text-brand-secondary hover:text-brand-text transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Context Filter */}
      {rekordboxData && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setContext('combined')}
            className={`px-3 py-1 text-body-sm border ${
              context === 'combined'
                ? 'border-brand-text text-brand-text bg-brand-border'
                : 'border-brand-border text-brand-secondary'
            }`}
          >
            All Music
          </button>
          <button
            onClick={() => setContext('dj_collection')}
            className={`px-3 py-1 text-body-sm border ${
              context === 'dj_collection'
                ? 'border-brand-text text-brand-text bg-brand-border'
                : 'border-brand-border text-brand-secondary'
            }`}
          >
            DJ Collection
          </button>
          <button
            onClick={() => setContext('my_music')}
            className={`px-3 py-1 text-body-sm border ${
              context === 'my_music'
                ? 'border-brand-text text-brand-text bg-brand-border'
                : 'border-brand-border text-brand-secondary'
            }`}
          >
            Personal Music
          </button>
        </div>
      )}

      {/* Style Description */}
      {sonicPalette.styleDescription && (
        <div className="mb-6">
          <p className="text-body text-brand-text">
            {sonicPalette.styleDescription}
          </p>
          {sonicPalette.tonalCharacteristics && (
            <p className="text-body-sm text-brand-secondary mt-2">
              {sonicPalette.tonalCharacteristics}
            </p>
          )}
        </div>
      )}

      {/* Sonic Palette (Frequency Bars) */}
      {sonicPalette.sonicPalette && sonicPalette.sonicPalette.length > 0 && (
        <div className="mb-6">
          <p className="uppercase-label text-brand-secondary mb-3">Sonic Palette</p>
          <div className="space-y-3">
            {sonicPalette.sonicPalette.map((band, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-body-sm font-medium text-brand-text capitalize">
                      {band.band.replace('_', ' ')}
                    </span>
                    <span className="text-body-xs text-brand-secondary ml-2">
                      {band.frequency_range}
                    </span>
                  </div>
                  <span className="text-body-sm text-brand-text">
                    {Math.round(band.prominence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-brand-border h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProminenceColor(band.prominence)} transition-all duration-300`}
                    style={{ width: `${band.prominence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dominant Frequencies */}
      {sonicPalette.dominantFrequencies && sonicPalette.dominantFrequencies.length > 0 && (
        <div className="mb-6 pt-6 border-t border-brand-border">
          <p className="uppercase-label text-brand-secondary mb-3">Dominant Frequencies</p>
          <div className="flex gap-2">
            {sonicPalette.dominantFrequencies.map((freq, idx) => (
              <div
                key={idx}
                className="flex-1 border border-brand-border p-3 text-center"
              >
                <p className="text-body-sm font-medium text-brand-text capitalize mb-1">
                  {freq.band.replace('_', ' ')}
                </p>
                <p className="text-body-xs text-brand-secondary">
                  {freq.prominence}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Stats */}
      <div className="pt-6 border-t border-brand-border text-body-sm text-brand-secondary">
        {sonicPalette.totalAnalyzed} tracks analyzed •{' '}
        {sonicPalette.highQualityCount} high-energy •{' '}
        {Math.round((sonicPalette.confidence || 0) * 100)}% confidence
        {sonicPalette.cached && (
          <>
            {' • '}
            <span className="text-brand-secondary italic">cached</span>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioDNAPanel;
