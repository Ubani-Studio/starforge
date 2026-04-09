import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Archetype metadata for selector
const ARCHETYPES = [
  { designation: 'S-0', glyph: 'KETH', symbol: 'Θ', mode: 'Visionary' },
  { designation: 'T-1', glyph: 'STRATA', symbol: 'Σ', mode: 'Architect' },
  { designation: 'V-2', glyph: 'OMEN', symbol: 'Ψ', mode: 'Diviner' },
  { designation: 'L-3', glyph: 'SILT', symbol: 'Δ', mode: 'Sedimentary' },
  { designation: 'C-4', glyph: 'CULL', symbol: 'Ξ', mode: 'Editor' },
  { designation: 'N-5', glyph: 'LIMN', symbol: 'Λ', mode: 'Bridge' },
  { designation: 'H-6', glyph: 'TOLL', symbol: 'Ω', mode: 'Broadcaster' },
  { designation: 'P-7', glyph: 'VAULT', symbol: 'Φ', mode: 'Archivist' },
  { designation: 'D-8', glyph: 'WICK', symbol: 'Π', mode: 'Igniter' },
  { designation: 'F-9', glyph: 'ANVIL', symbol: 'Γ', mode: 'Fabricator' },
  { designation: 'R-10', glyph: 'SCHISM', symbol: 'Ζ', mode: 'Disruptor' },
  { designation: 'Ø', glyph: 'VOID', symbol: 'Ø', mode: 'Unclassified' },
];

const COLLAB_TYPE_STYLES = {
  natural_allies: { label: 'Natural Allies', accent: '#0A0A0A' },
  growth_catalyst: { label: 'Growth Catalyst', accent: '#2A2A2A' },
  creative_friction: { label: 'Creative Friction', accent: '#5A5A5A' },
  challenging: { label: 'Challenging', accent: '#8A8A8A' },
  neutral: { label: 'Neutral', accent: '#AAAAAA' },
};

export default function RelationalPanel() {
  const [userProfile, setUserProfile] = useState(null);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch user's own profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await axios.get(`${API}/twin-os/context/default_user`);
      if (res.data?.subtaste?.primary) {
        setUserProfile({
          archetypePrimary: res.data.subtaste.primary.designation,
          archetypeSecondary: res.data.subtaste.secondary?.designation,
          distribution: res.data.subtaste.distribution,
          audio: res.data.audio,
          visual: res.data.visual,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const analyzeDuo = async (archetype) => {
    if (!userProfile) return;
    setSelectedArchetype(archetype);
    setLoading(true);
    setAnalysis(null);

    try {
      // Build a synthetic profile for the selected archetype
      // Use a distribution that strongly peaks at this archetype
      const syntheticDist = {};
      ARCHETYPES.forEach(a => {
        syntheticDist[a.designation] = a.designation === archetype.designation ? 0.7 : 0.025;
      });

      const res = await axios.post(`${API}/relational/duo`, {
        profile1: userProfile,
        profile2: {
          archetypePrimary: archetype.designation,
          distribution: syntheticDist,
        },
      });

      if (res.data?.success) {
        setAnalysis(res.data);
      }
    } catch (err) {
      console.error('Duo analysis failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-brand-border rounded w-1/3" />
        <div className="h-40 bg-brand-border rounded" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="border border-brand-border p-12 text-center">
        <p className="text-body text-brand-secondary">
          Complete your identity profile in the Nommo tab first.
        </p>
      </div>
    );
  }

  const userArch = ARCHETYPES.find(a => a.designation === userProfile.archetypePrimary);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-display-md text-brand-text mb-2">Relational Intelligence</h2>
        <p className="text-body text-brand-secondary">
          Explore creative chemistry between archetypes. Select a collaborator type to analyze complementarity.
        </p>
      </div>

      {/* Your Profile Summary */}
      <div className="border border-brand-border p-6">
        <p className="uppercase-label text-brand-secondary mb-4">Your Identity</p>
        <div className="flex items-baseline gap-3">
          <span className="text-display-lg text-brand-text">{userArch?.symbol}</span>
          <div>
            <p className="text-body text-brand-text font-medium">{userArch?.glyph}</p>
            <p className="text-label text-brand-secondary">{userArch?.designation} — {userArch?.mode}</p>
          </div>
        </div>
      </div>

      {/* Archetype Selector Grid */}
      <div>
        <p className="uppercase-label text-brand-secondary mb-4">Compare With</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {ARCHETYPES.filter(a => a.designation !== userProfile.archetypePrimary && a.designation !== 'Ø').map(arch => (
            <button
              key={arch.designation}
              onClick={() => analyzeDuo(arch)}
              disabled={loading}
              className={`border p-3 text-center transition-all ${
                selectedArchetype?.designation === arch.designation
                  ? 'border-brand-text bg-brand-text text-white'
                  : 'border-brand-border hover:border-brand-text text-brand-text'
              } ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span className="text-display-sm block">{arch.symbol}</span>
              <span className="text-label block mt-1">{arch.glyph}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Results */}
      {loading && (
        <div className="border border-brand-border p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-brand-border rounded w-1/4" />
            <div className="h-4 bg-brand-border rounded w-2/3" />
            <div className="h-4 bg-brand-border rounded w-1/2" />
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-8">
          {/* Complementarity Score */}
          <div className="border border-brand-text p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-display-lg text-brand-text">{analysis.profile1Summary?.glyph}</span>
                <span className="text-display-sm text-brand-secondary">×</span>
                <span className="text-display-lg text-brand-text">{analysis.profile2Summary?.glyph}</span>
              </div>
              <div className="text-right">
                <p className="text-display-xl text-brand-text">{analysis.complementarity}%</p>
                <p className="text-label text-brand-secondary">complementarity</p>
              </div>
            </div>

            {/* Collaboration Type */}
            {analysis.collaborationType && (
              <div className="border-t border-brand-border pt-4">
                <p className="text-label text-brand-secondary mb-1">
                  {COLLAB_TYPE_STYLES[analysis.collaborationType.type]?.label || analysis.collaborationType.type}
                </p>
                <p className="text-body text-brand-text">
                  {analysis.collaborationType.description}
                </p>
              </div>
            )}
          </div>

          {/* Dynamics Breakdown */}
          {analysis.relational?.dynamics?.length > 0 && (
            <div className="border border-brand-border p-6">
              <p className="uppercase-label text-brand-secondary mb-4">Dynamics</p>
              <div className="space-y-3">
                {analysis.relational.dynamics.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        d.type === 'collaborate' ? 'bg-brand-text'
                        : d.type === 'growth' ? 'bg-brand-text opacity-70'
                        : d.type === 'tension' ? 'bg-brand-text opacity-50'
                        : 'bg-brand-secondary'
                      }`} />
                      <span className="text-body text-brand-text capitalize">{d.type}</span>
                      <span className="text-label text-brand-secondary">
                        {d.from} → {d.to}
                      </span>
                    </div>
                    <span className={`text-label font-mono ${d.score > 0 ? 'text-brand-text' : 'text-brand-secondary'}`}>
                      {d.score > 0 ? '+' : ''}{d.score}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-brand-border mt-4 pt-3 flex justify-between">
                <span className="text-label text-brand-secondary">Net relational score</span>
                <span className="text-body text-brand-text font-mono">
                  {analysis.relational.score > 0 ? '+' : ''}{analysis.relational.score}
                </span>
              </div>
            </div>
          )}

          {/* Distribution Overlap */}
          {analysis.distributionOverlap && (
            <div className="border border-brand-border p-6">
              <p className="uppercase-label text-brand-secondary mb-4">Taste Overlap</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-body text-brand-text">
                  {(analysis.distributionOverlap.similarity * 100).toFixed(0)}% similarity
                </span>
              </div>
              {/* Similarity bar */}
              <div className="w-full h-2 bg-brand-border">
                <div
                  className="h-full bg-brand-text transition-all duration-500"
                  style={{ width: `${analysis.distributionOverlap.similarity * 100}%` }}
                />
              </div>
              <p className="text-label text-brand-secondary mt-2">
                {analysis.distributionOverlap.interpretation}
              </p>
            </div>
          )}

          {/* Creative Mode Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-brand-border p-4">
              <p className="text-label text-brand-secondary mb-1">You</p>
              <p className="text-body text-brand-text">{analysis.profile1Summary?.creativeMode}</p>
              <p className="text-label text-brand-secondary">{analysis.profile1Summary?.designation}</p>
            </div>
            <div className="border border-brand-border p-4">
              <p className="text-label text-brand-secondary mb-1">Collaborator</p>
              <p className="text-body text-brand-text">{analysis.profile2Summary?.creativeMode}</p>
              <p className="text-label text-brand-secondary">{analysis.profile2Summary?.designation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state — no archetype selected yet */}
      {!analysis && !loading && (
        <div className="border border-dashed border-brand-border p-12 text-center">
          <p className="text-body text-brand-secondary">
            Select an archetype above to analyze creative chemistry.
          </p>
        </div>
      )}
    </div>
  );
}
