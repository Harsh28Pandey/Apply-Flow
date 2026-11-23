import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeSpamRisk } from '../utils/spamChecker';

export default function SpamRiskHint({ text }) {
  const [expanded, setExpanded] = useState(false);
  const analysis = analyzeSpamRisk(text);

  const config = {
    good: {
      label: 'Low Spam Risk',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      desc: 'High deliverability expected. Clean structure, grounded phrasing.',
    },
    warning: {
      label: 'Moderate Spam Risk',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      desc: 'Minor issues detected that could impact inbox placement.',
    },
    danger: {
      label: 'High Spam Risk',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
      desc: 'Contains elements likely to trigger automated email spam filters.',
    },
  }[analysis.level];

  return (
    <div className="card-rounded p-4 bg-orange-50/40 border border-orange-100 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {config.icon}
          <span className="font-bold text-slate-800">
            Deliverability & Spam Risk
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${config.badge}`}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-slate-500 font-mono">
            <strong>{analysis.wordCount}</strong> words
          </span>
          {analysis.issues.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-orange-600 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>{analysis.issues.length} {analysis.issues.length === 1 ? 'hint' : 'hints'}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && analysis.issues.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-orange-100 space-y-1.5 text-slate-600">
          {analysis.issues.map((issue, idx) => (
            <li key={idx} className="flex items-start space-x-1.5">
              <span className="text-orange-500 font-bold">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
