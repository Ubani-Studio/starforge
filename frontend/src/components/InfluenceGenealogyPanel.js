import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InfluenceGenealogyTree from './InfluenceGenealogyTree';

/**
 * Influence Genealogy Panel
 * Elite tier feature wrapper with subscription gating
 */
const InfluenceGenealogyPanel = ({ userId = 'default_user' }) => {
  const [subscriptionTier, setSubscriptionTier] = useState(null);
  const [genealogyData, setGenealogyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('hybrid'); // 'hybrid' | 'dj' | 'original'

  useEffect(() => {
    fetchSubscriptionAndGenealogy();
  }, [userId, analysisMode]);

  const fetchSubscriptionAndGenealogy = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subscription tier
      const subResponse = await axios.get(`/api/subscription/status?user_id=${userId}`);
      setSubscriptionTier(subResponse.data.tier);

      // Only fetch genealogy if Elite tier
      if (subResponse.data.tier === 'elite') {
        const genealogyResponse = await axios.get(
          `/api/deep/audio/influence-genealogy?user_id=${userId}&mode=${analysisMode}`
        );
        
        if (genealogyResponse.data.success) {
          setGenealogyData(genealogyResponse.data.genealogy);
        } else {
          setError(genealogyResponse.data.error || 'Failed to analyze genealogy');
        }
      }
    } catch (err) {
      console.error('Error fetching genealogy:', err);
      
      // Handle 403 specifically (feature not available)
      if (err.response?.status === 403) {
        setError(null); // Don't show error, show upgrade prompt instead
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSubscriptionAndGenealogy();
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center border border-brand-border">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-3"></div>
        <p className="text-body-sm text-brand-secondary">Analyzing your influence genealogy...</p>
      </div>
    );
  }

  // Elite tier feature - show upgrade prompt for non-Elite users
  if (subscriptionTier !== 'elite') {
    return (
      <div className="p-8 border border-brand-border bg-gradient-to-br from-purple-950/20 to-brand-bg">
        <div className="max-w-lg mx-auto text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-brand-text mb-3">
            Influence Genealogy
          </h3>
          
          <p className="text-body-sm text-brand-secondary mb-6 leading-relaxed">
            Discover the lineage of your taste. Map your music collection to historical genre 
            movements and see how your sonic palette evolved through cultural eras.
          </p>

          <div className="mb-6 p-4 bg-brand-border/30 border border-brand-border">
            <p className="uppercase-label text-brand-secondary mb-2">Elite Feature Includes</p>
            <ul className="text-body-xs text-brand-secondary space-y-2 text-left">
              <li>• Sonic signature matching across 27+ genres</li>
              <li>• Historical lineage mapping (1950s → 2026)</li>
              <li>• Visual genealogy tree with ancestor/descendant genres</li>
              <li>• Cultural context and origin locations</li>
              <li>• Instagram-worthy export for sharing</li>
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm uppercase tracking-wider transition-colors"
          >
            Upgrade to Elite - $50/mo
          </button>

          <p className="text-body-xs text-brand-secondary mt-4">
            Currently on {subscriptionTier === 'pro' ? 'Pro' : 'Personal'} tier
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 border border-red-500/30 bg-red-950/20">
        <p className="text-body-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-xs capitalize tracking-wider border border-brand-border hover:border-brand-primary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Success state - render tree
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-brand-text font-medium mb-1">Influence Genealogy</h3>
          <p className="text-body-xs text-brand-secondary">Elite Feature</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-xs capitalize tracking-wider border border-brand-border hover:border-brand-primary transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Analysis Mode Selector */}
      <div className="flex gap-0 mb-4 border-b border-brand-border">
        <button
          onClick={() => setAnalysisMode('hybrid')}
          className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
            analysisMode === 'hybrid'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-brand-secondary hover:text-brand-text'
          }`}
        >
          Hybrid
        </button>
        <button
          onClick={() => setAnalysisMode('dj')}
          className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
            analysisMode === 'dj'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-brand-secondary hover:text-brand-text'
          }`}
        >
          DJ Library
        </button>
        <button
          onClick={() => setAnalysisMode('original')}
          className={`px-4 py-2 text-xs capitalize tracking-wider transition-all ${
            analysisMode === 'original'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-brand-secondary hover:text-brand-text'
          }`}
        >
          My Music
        </button>
      </div>

      {/* Mode Description */}
      <div className="mb-6 p-4 border border-brand-border bg-brand-bg">
        <p className="text-body-xs text-brand-secondary">
          {analysisMode === 'hybrid' && (
            "Analyzing both your DJ library (what you play) and your original music (what you create) to show how your curation taste influences your production style."
          )}
          {analysisMode === 'dj' && (
            "Analyzing your DJ library based on play counts, ratings, and genre tags - revealing your curation taste and what works in sets."
          )}
          {analysisMode === 'original' && (
            "Analyzing your original productions using full audio analysis (energy, valence, spectral features) - revealing your creative signature."
          )}
        </p>
      </div>

      <InfluenceGenealogyTree genealogyData={genealogyData} />
    </div>
  );
};

export default InfluenceGenealogyPanel;
