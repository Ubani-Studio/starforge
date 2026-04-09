import React from 'react';

/**
 * Archetype color map for visualization.
 * Monochrome palette with subtle differentiation.
 */
const ARCHETYPE_COLORS = {
  'S-0': '#0A0A0A', // Keth — darkest
  'T-1': '#1A1A1A', // Strata
  'V-2': '#2A2A2A', // Omen
  'L-3': '#3A3A3A', // Silt
  'C-4': '#4A4A4A', // Cull
  'N-5': '#5A5A5A', // Limn
  'H-6': '#6A6A6A', // Toll
  'P-7': '#7A7A7A', // Vault
  'D-8': '#8A8A8A', // Wick
  'F-9': '#9A9A9A', // Anvil
  'R-10': '#AAAAAA', // Schism
  'Ø': '#CACACA',     // Void
};

const SEASON_LABELS = {
  expanding: 'Expansion',
  consolidating: 'Consolidation',
  pivoting: 'Pivot',
  stable: 'Stable',
  unknown: '',
};

/**
 * CSS-only timeline visualization of archetype distribution over time.
 * Each snapshot renders as a stacked bar. Coherence shown as dot overlay.
 */
export default function DriftTimeline({ snapshots = [] }) {
  if (snapshots.length === 0) return null;

  // Get all archetype designations present across all snapshots
  const allDesignations = new Set();
  snapshots.forEach(s => {
    Object.keys(s.distribution || {}).forEach(d => allDesignations.add(d));
  });
  const designations = [...allDesignations].sort();

  // Find max coherence for scaling
  const maxCoherence = Math.max(...snapshots.map(s => s.coherenceScore || 0), 1);

  // Group snapshots by month for labeling
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-2">
      {/* Timeline bars */}
      <div className="flex items-end gap-1" style={{ height: '120px' }}>
        {snapshots.map((snapshot, i) => {
          const dist = snapshot.distribution || {};
          const entries = designations
            .map(d => ({ designation: d, value: dist[d] || 0 }))
            .filter(e => e.value > 0)
            .sort((a, b) => b.value - a.value);

          return (
            <div
              key={snapshot.id || i}
              className="flex-1 flex flex-col justify-end group relative"
              style={{ minWidth: '12px', maxWidth: '40px' }}
            >
              {/* Stacked bar */}
              <div className="w-full flex flex-col-reverse">
                {entries.map(entry => (
                  <div
                    key={entry.designation}
                    style={{
                      height: `${Math.max(2, entry.value * 100)}px`,
                      backgroundColor: ARCHETYPE_COLORS[entry.designation] || '#CCC',
                    }}
                    className="w-full transition-all duration-300"
                  />
                ))}
              </div>

              {/* Coherence dot overlay */}
              {snapshot.coherenceScore != null && (
                <div
                  className="absolute w-2 h-2 rounded-full bg-brand-text border border-white"
                  style={{
                    bottom: `${(snapshot.coherenceScore / maxCoherence) * 100}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-brand-text text-white text-label px-2 py-1 rounded whitespace-nowrap">
                  {snapshot.archetypePrimary || '?'}
                  {snapshot.coherenceScore != null && ` · ${(snapshot.coherenceScore * 100).toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex gap-1">
        {snapshots.map((snapshot, i) => {
          // Only show label for first snapshot and every ~4th after
          const showLabel = i === 0 || i === snapshots.length - 1 ||
            (snapshots.length > 6 && i % Math.ceil(snapshots.length / 5) === 0);

          return (
            <div
              key={snapshot.id || i}
              className="flex-1 text-center"
              style={{ minWidth: '12px', maxWidth: '40px' }}
            >
              {showLabel && (
                <span className="text-label text-brand-secondary">
                  {formatDate(snapshot.createdAt)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Season labels */}
      {snapshots.some(s => s.season && s.season !== 'unknown') && (
        <div className="flex gap-1 mt-1">
          {snapshots.map((snapshot, i) => {
            // Show season label only when it changes
            const prevSeason = i > 0 ? snapshots[i - 1]?.season : null;
            const showSeason = snapshot.season && snapshot.season !== 'unknown' && snapshot.season !== prevSeason;

            return (
              <div
                key={snapshot.id || i}
                className="flex-1"
                style={{ minWidth: '12px', maxWidth: '40px' }}
              >
                {showSeason && (
                  <span className="text-label text-brand-secondary italic">
                    {SEASON_LABELS[snapshot.season] || ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
