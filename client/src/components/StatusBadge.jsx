import React from 'react';

const STATUS_CONFIG = {
  sent: { label: 'Sent', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  opened: { label: 'Opened', bg: 'bg-orange-50 text-orange-700 border-orange-200 font-bold' },
  clicked: { label: 'Clicked', bg: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' },
  replied: { label: 'Replied', bg: 'bg-purple-50 text-purple-700 border-purple-200 font-bold' },
  queued: { label: 'Scheduled', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  sending: { label: 'Sending...', bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' },
  failed: { label: 'Failed', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  paused: { label: 'Paused', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function StatusBadge({ status, isReplied, openCount = 0, clickCount = 0 }) {
  let key = status || 'draft';

  // Dynamic status priority
  if (isReplied) {
    key = 'replied';
  } else if (clickCount > 0) {
    key = 'clicked';
  } else if (openCount > 0) {
    key = 'opened';
  }

  const conf = STATUS_CONFIG[key] || STATUS_CONFIG.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} shadow-xs`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {conf.label}
    </span>
  );
}
