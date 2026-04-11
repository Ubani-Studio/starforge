import React, { useEffect, useState } from 'react';
import { useRescanProgress } from '../context/RescanProgressContext';

/**
 * Compact top-right progress strip for background rescan jobs.
 *
 * Aesthetic: minimal restraint. Hairline borders, generous whitespace,
 * sentence case, tabular numerics, progress line at the foot. No caps,
 * no tracking, no visual noise. Reads like a luxury timetable board.
 */
export default function RescanToast() {
  const { jobList, gotoJobTarget, dismissJob } = useRescanProgress();

  // Auto-dismiss completed jobs after 20s
  useEffect(() => {
    const timers = jobList
      .filter((j) => j.status !== 'running' && j.finishedAt)
      .map((j) => setTimeout(() => dismissJob(j.id), 20000));
    return () => timers.forEach(clearTimeout);
  }, [jobList, dismissJob]);

  if (jobList.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-3 pointer-events-none"
      style={{ top: 24, right: 24, width: 280 }}
    >
      {jobList.map((job) => (
        <ToastRow
          key={job.id}
          job={job}
          onClick={() => gotoJobTarget(job.id)}
          onClose={() => dismissJob(job.id)}
        />
      ))}
    </div>
  );
}

/**
 * Sentence case that preserves true acronyms (≥2 consecutive uppercase
 * letters). "Visual DNA" → "Visual DNA", "FETCHING PHOTOS" → "Fetching
 * photos". First word's first character always capitalised.
 */
function sentenceCase(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map((word, i) => {
      if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
        return word; // preserved acronym
      }
      const lower = word.toLowerCase();
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(' ');
}

function ToastRow({ job, onClick, onClose }) {
  const [closing, setClosing] = useState(false);
  const isRunning = job.status === 'running';
  const isError = job.status === 'error';
  const clickable = !isRunning && !isError && !!job.target;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!clickable) return;
    setClosing(true);
    onClick();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  const label = sentenceCase(job.label || '');
  const stageRaw = isError
    ? 'Failed'
    : isRunning
      ? job.stage
      : clickable
        ? 'Tap to view'
        : job.stage;
  const stage = sentenceCase(stageRaw || '');
  const pct = Math.round((job.progress || 0) * 100);
  const pctStr = pct.toString().padStart(2, '0');

  return (
    <div
      onClick={handleClick}
      className={`pointer-events-auto border bg-brand-bg transition-all duration-500 ${
        closing ? 'opacity-0 translate-x-1' : 'opacity-100'
      } ${
        clickable
          ? 'border-brand-text cursor-pointer'
          : 'border-brand-border'
      }`}
      style={{ padding: '16px 18px 14px 18px' }}
      title={clickable ? 'Click to view' : stage}
    >
      {/* Header: label + dismiss */}
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: '14px' }}>
        <span
          className={`font-light leading-tight ${
            isError ? 'text-brand-secondary' : 'text-brand-text'
          }`}
          style={{ fontSize: '13px', letterSpacing: '-0.01em' }}
        >
          {label}
        </span>
        <button
          onClick={handleClose}
          className="text-brand-secondary hover:text-brand-text flex-shrink-0 leading-none transition-colors duration-300"
          aria-label="Dismiss"
          style={{ fontSize: '12px', marginTop: '2px', fontWeight: 300 }}
        >
          ×
        </button>
      </div>

      {/* Stage line + percent */}
      <div className="flex items-baseline justify-between gap-4" style={{ marginBottom: '10px' }}>
        <span
          className="text-brand-secondary font-light leading-none truncate"
          style={{ fontSize: '11px', letterSpacing: '0.01em' }}
        >
          {stage}
        </span>
        <span
          className="text-brand-text font-mono leading-none flex-shrink-0 tabular-nums"
          style={{ fontSize: '10px', letterSpacing: '0.04em' }}
        >
          {pctStr}
        </span>
      </div>

      {/* Hairline progress — 1px, luxury timetable aesthetic */}
      <div
        className="w-full bg-brand-border overflow-hidden relative"
        style={{ height: '1px' }}
      >
        <div
          className={`h-full absolute top-0 left-0 ${
            isError ? 'bg-brand-secondary' : 'bg-brand-text'
          }`}
          style={{
            width: `${pct}%`,
            transition: `width ${isRunning ? '400ms' : '600ms'} cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        />
      </div>
    </div>
  );
}
