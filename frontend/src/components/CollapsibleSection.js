import React, { useState } from 'react';

/**
 * CollapsibleSection — Lightweight disclosure widget.
 * Self-manages open/closed state. No h-tags.
 * Used for secondary content in the input zone.
 */
const CollapsibleSection = ({
  title,
  summaryValue,
  children,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-brand-border bg-brand-surface">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <span className="uppercase-label text-brand-secondary">{title}</span>
        <div className="flex items-center gap-3">
          {summaryValue && !open && (
            <span className="text-body-sm font-mono text-brand-text">{summaryValue}</span>
          )}
          <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-brand-secondary">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
      </button>

      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
