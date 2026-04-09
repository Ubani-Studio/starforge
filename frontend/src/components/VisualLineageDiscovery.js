import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Visual Lineage Discovery
 * Maps the user's color palette to global visual movements.
 * Shows visual era, movement affinities, and hex color recommendations.
 * B&W. Sharp. Same aesthetic as LineageDiscoveries.
 */
const VisualLineageDiscovery = ({ colorPalette = [], userId = 'default_user' }) => {
  const [result, setResult] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState(null);
  const [expandedMovement, setExpandedMovement] = useState(null);

  // Auto-discover when palette changes
  useEffect(() => {
    if (colorPalette.length > 0) {
      handleDiscover();
    }
  }, [JSON.stringify(colorPalette)]);

  const handleDiscover = async () => {
    if (colorPalette.length === 0) return;
    setDiscovering(true);
    setError(null);
    try {
      const hexes = colorPalette.map(c => (typeof c === 'string' ? c : c.hex));
      const res = await axios.post('/api/expansion/visual-lineage', { palette: hexes, userId });
      if (res.data.success) {
        setResult(res.data);
      } else {
        setError(res.data.error || 'Visual lineage discovery failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Visual lineage discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  if (colorPalette.length === 0) {
    return null;
  }

  return (
    <div className="border border-brand-border p-6 mt-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-display-md text-brand-text">Visual Lineage</p>
          <p className="text-body text-brand-secondary mt-1">
            Your color palette mapped to global visual movements
          </p>
        </div>
        {result && (
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="text-body-sm text-brand-text underline"
          >
            {discovering ? 'Mapping...' : 'Remap'}
          </button>
        )}
      </div>

      {/* Loading */}
      {discovering && !result && (
        <p className="text-body text-brand-secondary">Mapping palette to movements...</p>
      )}

      {/* Error */}
      {error && (
        <div className="border border-brand-border p-4">
          <p className="text-body text-brand-secondary">{error}</p>
        </div>
      )}

      {/* Visual Era */}
      {result?.visualEra && (
        <div className="border border-brand-border p-4 mb-4">
          <p className="uppercase-label text-brand-secondary mb-2">Visual Era</p>
          <p className="text-body text-brand-text font-medium text-lg">
            {result.visualEra.movement}
          </p>
          <p className="text-body-sm text-brand-secondary mt-1">
            {result.visualEra.region} / {result.visualEra.era}
          </p>
          <p className="text-body-sm text-brand-text mt-2">
            {result.visualEra.context}
          </p>
          {result.visualEra.practitioners?.length > 0 && (
            <p className="text-body-sm text-brand-secondary mt-2">
              {result.visualEra.practitioners.join(' / ')}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-body-sm font-mono text-brand-text">
              {Math.round(result.visualEra.affinity * 100)}% affinity
            </span>
          </div>
        </div>
      )}

      {/* Movement Affinities */}
      {result?.movements?.length > 0 && (
        <div className="mb-4">
          <p className="uppercase-label text-brand-secondary mb-3">Movement Affinities</p>
          <div className="space-y-2">
            {result.movements.map((m, idx) => (
              <div key={m.id}>
                <button
                  onClick={() => setExpandedMovement(expandedMovement === m.id ? null : m.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-body-sm text-brand-text">{m.name}</p>
                      <span className="text-body-xs text-brand-secondary">{m.region}</span>
                      {m.boosted && (
                        <span className="text-body-xs text-brand-secondary opacity-60" title="Amplified by Project DNA or high-signal photos">*</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-mono text-brand-text">{m.affinity}%</span>
                      <span className="text-body-xs text-brand-secondary">{m.era}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-brand-border">
                    <div
                      className="h-full bg-brand-text transition-all duration-300"
                      style={{ width: `${m.affinity}%` }}
                    />
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedMovement === m.id && (
                  <div className="mt-2 pl-3 border-l border-brand-border space-y-2">
                    {/* Movement palette swatches */}
                    <div className="flex gap-1">
                      {m.palette.map((hex, i) => (
                        <div key={i} className="flex-1">
                          <div
                            className="h-6 border border-brand-border"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                          <p className="text-body-xs text-brand-secondary mt-0.5 text-center font-mono">
                            {hex}
                          </p>
                        </div>
                      ))}
                    </div>
                    {m.keywords?.length > 0 && (
                      <p className="text-body-xs text-brand-secondary">
                        {m.keywords.join(' / ')}
                      </p>
                    )}
                    <p className="text-body-xs text-brand-secondary">
                      {m.matchCount} color{m.matchCount !== 1 ? 's' : ''} matched
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hex Color Recommendations */}
      {result?.recommendations?.length > 0 && (
        <div className="border-t border-brand-border pt-4 mb-4">
          <p className="uppercase-label text-brand-secondary mb-3">Color Recommendations</p>
          <div className="space-y-3">
            {result.recommendations.map((rec, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-3">
                  {/* Current color swatch */}
                  <div className="text-center">
                    <div
                      className="w-10 h-10 border border-brand-border"
                      style={{ backgroundColor: rec.currentHex }}
                      title={rec.currentHex}
                    />
                    <p className="text-body-xs text-brand-secondary mt-0.5 font-mono">
                      {rec.currentHex}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="text-brand-secondary text-body-sm">&rarr;</span>

                  {/* Suggested color swatch */}
                  <div className="text-center">
                    <div
                      className="w-10 h-10 border-2 border-brand-text"
                      style={{ backgroundColor: rec.suggestedHex }}
                      title={rec.suggestedHex}
                    />
                    <p className="text-body-xs text-brand-text mt-0.5 font-mono font-medium">
                      {rec.suggestedHex}
                    </p>
                  </div>

                  {/* Context */}
                  <div className="flex-1">
                    <p className="text-body-sm text-brand-text">
                      {rec.movement} / {rec.region} / {rec.era}
                    </p>
                    <p className="text-body-xs text-brand-secondary mt-0.5">
                      {rec.practitioner} / {rec.context}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lineage Map */}
      {result?.lineage && (
        <div className="border-t border-brand-border pt-4">
          <p className="uppercase-label text-brand-secondary mb-2">Visual Lineage</p>
          <div className="space-y-2">
            {result.lineage.primary && (
              <p className="text-body text-brand-text font-medium">
                {result.lineage.primary}
              </p>
            )}
            {result.lineage.secondary && (
              <p className="text-body-sm text-brand-secondary">
                Secondary: {result.lineage.secondary}
              </p>
            )}
            {result.lineage.adjacent?.length > 0 && (
              <p className="text-body-sm text-brand-secondary">
                Adjacent: {result.lineage.adjacent.join(' / ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualLineageDiscovery;
