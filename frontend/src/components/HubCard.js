import React, { useRef } from 'react';

/**
 * HubCard — Compact identity signal card with expand/collapse.
 * Shows a key stat when collapsed, reveals full content when expanded.
 * Controlled by parent (accordion pattern).
 */
const HubCard = ({
  label,
  stat,
  statLabel,
  connected = false,
  onConnect,
  connectLabel = 'Connect',
  children,
  expanded = false,
  onToggle,
  accentElement,
}) => {
  const contentRef = useRef(null);

  return (
    <div
      className={`border bg-brand-surface transition-all duration-300 ${
        expanded ? 'border-brand-text' : 'border-brand-border hover:border-brand-secondary'
      } ${connected ? 'cursor-pointer' : ''}`}
      onClick={connected ? onToggle : undefined}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="uppercase-label text-brand-secondary mb-3">{label}</p>
            {connected ? (
              <div className="flex items-baseline gap-3">
                <p className="text-heading-lg text-brand-text font-semibold">{stat}</p>
                {statLabel && (
                  <span className="text-body-sm text-brand-secondary">{statLabel}</span>
                )}
              </div>
            ) : (
              <div>
                <p className="text-body text-brand-secondary mb-4">Not connected</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                  className="btn-primary"
                >
                  {connectLabel}
                </button>
              </div>
            )}
          </div>
          {connected && (
            <div className={`transition-transform duration-300 mt-1 ${expanded ? 'rotate-90' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-brand-secondary">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
          )}
        </div>

        {/* Accent element (color swatches, glyph, etc.) */}
        {connected && accentElement && !expanded && (
          <div className="mt-4">{accentElement}</div>
        )}
      </div>

      {/* Expandable content */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-0" ref={contentRef}>
            <div className="pt-6 border-t border-brand-border">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HubCard;
