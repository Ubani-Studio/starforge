import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Catalog Insights Component
 * Displays aggregate analysis across entire music library
 * Shows taste coherence, genre distribution, evolution, Influence Genealogy
 */
const CatalogInsights = ({ userId = 'default_user' }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogMode, setCatalogMode] = useState('hybrid'); // 'hybrid' | 'dj' | 'original'
  const [genreView, setGenreView] = useState('simplified'); // 'simplified' | 'detailed'

  useEffect(() => {
    fetchAnalysis();
  }, [userId, catalogMode, genreView]);

  const fetchAnalysis = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await axios.get('/api/library/catalog/analyze', {
        params: {
          user_id: userId,
          refresh: forceRefresh,
          mode: catalogMode,
          granularity: genreView
        }
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
      }
    } catch (error) {
      console.error('Error fetching catalog analysis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalysis(true);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-text mb-3"></div>
        <p className="text-body-sm text-brand-secondary">Analyzing your catalog...</p>
      </div>
    );
  }

  if (!analysis || !analysis.available) {
    return (
      <div className="card">
        <p className="text-body-sm text-brand-secondary text-center">
          {analysis?.message || 'No tracks available for analysis. Upload some music to get started!'}
        </p>
      </div>
    );
  }

  const { aggregateStats, tasteCoherence, genreDistribution, distributions, evolution, fromCache, lastAnalysis } = analysis;

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-brand-text font-medium mb-1">Catalog Analysis</h3>
            <p className="text-body-xs text-brand-secondary">
              {analysis.trackCount} tracks analyzed
              {fromCache && ` • From cache`}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-between items-center border-b border-brand-border">
          <div className="flex gap-0">
            <button
              onClick={() => setCatalogMode('hybrid')}
              className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
                catalogMode === 'hybrid'
                  ? 'text-brand-text border-b-2 border-brand-text'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setCatalogMode('dj')}
              className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
                catalogMode === 'dj'
                  ? 'text-brand-text border-b-2 border-brand-text'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              DJ Library
            </button>
            <button
              onClick={() => setCatalogMode('original')}
              className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
                catalogMode === 'original'
                  ? 'text-brand-text border-b-2 border-brand-text'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              My Music
            </button>
          </div>

          {/* Genre View Toggle */}
          <div className="flex gap-2 px-4">
            <button
              onClick={() => setGenreView('simplified')}
              className={`px-3 py-1 text-xs transition-all ${
                genreView === 'simplified'
                  ? 'text-brand-text bg-brand-border'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              Simplified
            </button>
            <button
              onClick={() => setGenreView('detailed')}
              className={`px-3 py-1 text-xs transition-all ${
                genreView === 'detailed'
                  ? 'text-brand-text bg-brand-border'
                  : 'text-brand-secondary hover:text-brand-text'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      {aggregateStats && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">SONIC SIGNATURE</h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* BPM Range */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">BPM Range</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.minBpm && aggregateStats.maxBpm
                  ? `${aggregateStats.minBpm.toFixed(0)} - ${aggregateStats.maxBpm.toFixed(0)}`
                  : 'N/A'}
              </p>
              {aggregateStats.preferredBpmMin && aggregateStats.preferredBpmMax && (
                <p className="text-body-xs text-brand-secondary mt-2">
                  Preference: {aggregateStats.preferredBpmMin} - {aggregateStats.preferredBpmMax}
                  {aggregateStats.preferredBpmCoverage && ` (${aggregateStats.preferredBpmCoverage}%)`}
                </p>
              )}
              <p className="text-body-xs text-brand-secondary mt-2">
                Avg: {aggregateStats.avgBpm ? aggregateStats.avgBpm.toFixed(1) : 'N/A'}
              </p>
            </div>

            {/* Energy Level */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">Energy Level</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.avgEnergy !== undefined
                  ? `${(aggregateStats.avgEnergy * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
              {aggregateStats.avgEnergy !== undefined && (
                <div className="mt-3 h-2 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${aggregateStats.avgEnergy * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Valence */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">Valence (Mood)</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.avgValence !== undefined
                  ? `${(aggregateStats.avgValence * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
              {aggregateStats.avgValence !== undefined && (
                <p className="text-body-xs text-brand-secondary mt-2">
                  {aggregateStats.avgValence > 0.6 ? 'Positive' : aggregateStats.avgValence > 0.4 ? 'Neutral' : 'Dark'}
                </p>
              )}
            </div>

            {/* Total Duration */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">Total Duration</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.totalDuration
                  ? `${(aggregateStats.totalDuration / 3600).toFixed(1)} hrs`
                  : 'N/A'}
              </p>
            </div>

            {/* Avg Track Length */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">Avg Track Length</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.avgDuration
                  ? `${Math.floor(aggregateStats.avgDuration / 60)}:${Math.floor(aggregateStats.avgDuration % 60).toString().padStart(2, '0')}`
                  : 'N/A'}
              </p>
            </div>

            {/* Total Plays */}
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-2">Total Plays</p>
              <p className="text-display-sm text-brand-text">
                {aggregateStats.totalPlayCount !== undefined ? aggregateStats.totalPlayCount : 'N/A'}
              </p>
            </div>

            {/* Library Diversity */}
            {aggregateStats.diversityScore !== undefined && (
              <div className="border border-brand-border p-4">
                <p className="text-body-xs text-brand-secondary mb-2">Library Diversity</p>
                <p className="text-display-sm text-brand-text">
                  {aggregateStats.diversityScore}%
                </p>
                <p className="text-body-xs text-brand-secondary mt-2">
                  {aggregateStats.diversityCategory || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library Diversity */}
      {aggregateStats && aggregateStats.diversityScore !== undefined && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">LIBRARY DIVERSITY</h4>

          <div className="border border-brand-border p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-body-sm text-brand-text">Overall Diversity</p>
              <p className="text-display-sm text-brand-text">{aggregateStats.diversityScore}%</p>
            </div>
            <div className="h-3 bg-brand-border overflow-hidden">
              <div
                className="h-full bg-brand-text"
                style={{ width: `${aggregateStats.diversityScore}%` }}
              />
            </div>
            <p className="text-body-xs text-brand-secondary mt-2">
              {aggregateStats.diversityCategory || 'N/A'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-brand-border p-4">
              <div className="flex justify-between mb-2">
                <p className="text-body-xs text-brand-secondary">Genre Diversity</p>
                <p className="text-body-xs text-brand-text">
                  {aggregateStats.genreDiversity !== undefined ? `${aggregateStats.genreDiversity}%` : 'N/A'}
                </p>
              </div>
              {aggregateStats.genreDiversity !== undefined && (
                <>
                  <div className="h-2 bg-brand-border overflow-hidden">
                    <div
                      className="h-full bg-brand-text"
                      style={{ width: `${aggregateStats.genreDiversity}%` }}
                    />
                  </div>
                  <p className="text-body-xs text-brand-secondary mt-2">
                    {aggregateStats.genreDiversity > 70 ? 'Eclectic across genres' :
                     aggregateStats.genreDiversity > 50 ? 'Balanced genre exploration' :
                     'Focused on core genres'}
                  </p>
                </>
              )}
            </div>

            <div className="border border-brand-border p-4">
              <div className="flex justify-between mb-2">
                <p className="text-body-xs text-brand-secondary">BPM Diversity</p>
                <p className="text-body-xs text-brand-text">
                  {aggregateStats.bpmDiversity !== undefined ? `${aggregateStats.bpmDiversity}%` : 'N/A'}
                </p>
              </div>
              {aggregateStats.bpmDiversity !== undefined && (
                <>
                  <div className="h-2 bg-brand-border overflow-hidden">
                    <div
                      className="h-full bg-brand-text"
                      style={{ width: `${aggregateStats.bpmDiversity}%` }}
                    />
                  </div>
                  <p className="text-body-xs text-brand-secondary mt-2">
                    {aggregateStats.bpmDiversity > 70 ? 'Wide tempo variety' :
                     aggregateStats.bpmDiversity > 50 ? 'Moderate tempo range' :
                     'Focused tempo preference'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Taste Coherence */}
      {tasteCoherence && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">Taste Coherence</h4>

          <div className="border border-brand-border p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-body-sm text-brand-text">Overall Coherence</p>
              <p className="text-display-sm text-brand-text">
                {tasteCoherence.overall !== undefined ? `${(tasteCoherence.overall * 100).toFixed(0)}%` : 'N/A'}
              </p>
            </div>
            {tasteCoherence.overall !== undefined && (
              <>
                <div className="h-3 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${tasteCoherence.overall * 100}%` }}
                  />
                </div>
                <p className="text-body-xs text-brand-secondary mt-2">
                  {tasteCoherence.interpretation || 'N/A'}
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-brand-border p-4">
              <div className="flex justify-between mb-2">
                <p className="text-body-xs text-brand-secondary">BPM Consistency</p>
                <p className="text-body-xs text-brand-text">
                  {tasteCoherence.bpmConsistency !== undefined ? `${(tasteCoherence.bpmConsistency * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              {tasteCoherence.bpmConsistency !== undefined && (
                <div className="h-2 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${tasteCoherence.bpmConsistency * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="border border-brand-border p-4">
              <div className="flex justify-between mb-2">
                <p className="text-body-xs text-brand-secondary">Energy Consistency</p>
                <p className="text-body-xs text-brand-text">
                  {tasteCoherence.energyConsistency !== undefined ? `${(tasteCoherence.energyConsistency * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              {tasteCoherence.energyConsistency !== undefined && (
                <div className="h-2 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${tasteCoherence.energyConsistency * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="border border-brand-border p-4">
              <div className="flex justify-between mb-2">
                <p className="text-body-xs text-brand-secondary">Key Coherence</p>
                <p className="text-body-xs text-brand-text">
                  {tasteCoherence.keyCoherence !== undefined ? `${(tasteCoherence.keyCoherence * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              {tasteCoherence.keyCoherence !== undefined && (
                <div className="h-2 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${tasteCoherence.keyCoherence * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Genre Distribution */}
      {genreDistribution && genreDistribution.length > 0 && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">GENRE DISTRIBUTION</h4>

          <div className="space-y-3">
            {genreDistribution.map((genre, i) => (
              <div key={i} className="border border-brand-border p-3">
                <div className="flex justify-between mb-2">
                  <p className="text-body-sm text-brand-text">{genre.genre || 'Unknown'}</p>
                  <p className="text-body-sm text-brand-secondary">
                    {genre.count || 0} tracks ({genre.percentage || 0}%)
                  </p>
                </div>
                <div className="h-2 bg-brand-border overflow-hidden">
                  <div
                    className="h-full bg-brand-text"
                    style={{ width: `${genre.percentage || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BPM Distribution */}
      {distributions && distributions.bpm && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">BPM DISTRIBUTION</h4>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-brand-border p-3">
              <p className="text-body-xs text-brand-secondary mb-1">25th Percentile</p>
              <p className="text-body-sm text-brand-text">
                {distributions.bpm.percentiles?.p25 ? distributions.bpm.percentiles.p25.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="border border-brand-border p-3">
              <p className="text-body-xs text-brand-secondary mb-1">Median</p>
              <p className="text-body-sm text-brand-text">
                {distributions.bpm.percentiles?.p50 ? distributions.bpm.percentiles.p50.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="border border-brand-border p-3">
              <p className="text-body-xs text-brand-secondary mb-1">75th Percentile</p>
              <p className="text-body-sm text-brand-text">
                {distributions.bpm.percentiles?.p75 ? distributions.bpm.percentiles.p75.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>

          {distributions.bpm.histogram && distributions.bpm.histogram.length > 0 && (
            <div className="border border-brand-border p-4">
              <p className="text-body-xs text-brand-secondary mb-3">Histogram</p>
              <div className="flex items-end gap-1 h-32">
                {distributions.bpm.histogram.map((bin, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div
                      className="bg-brand-text/50 hover:bg-brand-text transition-colors"
                      style={{ height: `${(bin.count / Math.max(...distributions.bpm.histogram.map(b => b.count))) * 100}%` }}
                      title={`${bin.range}: ${bin.count} tracks`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Temporal Evolution */}
      {evolution && evolution.available && (
        <div className="card">
          <h4 className="uppercase-label text-brand-secondary mb-4">TASTE EVOLUTION</h4>

          {evolution.trends && evolution.trends.available && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-brand-border p-4">
                <p className="text-body-xs text-brand-secondary mb-2">BPM Trend</p>
                <p className="text-body-sm text-brand-text capitalize">
                  {evolution.trends.bpmTrend || 'N/A'}
                </p>
              </div>
              <div className="border border-brand-border p-4">
                <p className="text-body-xs text-brand-secondary mb-2">Energy Trend</p>
                <p className="text-body-sm text-brand-text capitalize">
                  {evolution.trends.energyTrend || 'N/A'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {evolution.timeline && evolution.timeline.slice(-6).map((month, i) => (
              <div key={i} className="border border-brand-border p-3 flex justify-between text-body-xs">
                <span className="text-brand-secondary">{month.month || 'Unknown'}</span>
                <span className="text-brand-text">{month.trackCount || 0} tracks</span>
                <span className="text-brand-secondary">
                  {month.avgBpm ? month.avgBpm.toFixed(0) : 'N/A'} BPM • {month.avgEnergy ? (month.avgEnergy * 100).toFixed(0) : 'N/A'}% energy
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogInsights;
