import React from 'react';
import DriftTimeline from './DriftTimeline';

const SEASON_DISPLAY = {
  expanding: { label: 'Expansion', description: 'Exploring new territory. Coherence dropping as you absorb new influences.' },
  consolidating: { label: 'Consolidation', description: 'Narrowing and deepening. Your identity is crystallizing.' },
  pivoting: { label: 'Pivot', description: 'Sharp direction change. Something fundamental is shifting.' },
  stable: { label: 'Stable', description: 'Identity holding steady. Your creative direction is consistent.' },
  unknown: { label: 'Emerging', description: 'Building initial identity profile.' },
};

/**
 * Identity drift panel with timeline visualization and summary cards.
 * Only renders when drift data and timeline are available.
 */
export default function DriftPanel({ drift, timeline, season }) {
  if (!timeline || timeline.length < 2) return null;

  const seasonInfo = SEASON_DISPLAY[season] || SEASON_DISPLAY.unknown;

  return (
    <div className="border border-brand-border p-6 mb-12">
      <div className="flex items-center justify-between mb-6">
        <p className="uppercase-label text-brand-secondary">Identity Drift</p>
        <div className="flex items-center gap-2">
          <span className="text-label text-brand-text font-medium">{seasonInfo.label}</span>
          <span className="w-2 h-2 rounded-full bg-brand-text" />
        </div>
      </div>

      {/* Summary cards */}
      {drift?.hasDrift && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-display-md text-brand-text">
              {drift.totalShiftPercent}%
            </p>
            <p className="text-label text-brand-secondary">
              shift ({drift.windowDays}d)
            </p>
          </div>
          <div>
            <p className="text-display-md text-brand-text">
              {drift.coherence?.trajectory || 'stable'}
            </p>
            <p className="text-label text-brand-secondary">coherence</p>
          </div>
          <div>
            <p className="text-display-md text-brand-text">
              {drift.primaryArchetype?.changed ? 'Changed' : 'Stable'}
            </p>
            <p className="text-label text-brand-secondary">archetype</p>
          </div>
        </div>
      )}

      {/* Timeline visualization */}
      <DriftTimeline snapshots={timeline} />

      {/* Season description */}
      <p className="text-body-sm text-brand-secondary mt-4 italic">
        {seasonInfo.description}
      </p>

      {/* Most shifted dimension */}
      {drift?.mostShifted && (
        <p className="text-body-sm text-brand-secondary mt-2">
          Biggest shift: <span className="text-brand-text">{drift.mostShifted.designation}</span>{' '}
          {drift.mostShifted.direction} by {(Math.abs(drift.mostShifted.shift) * 100).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
