import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Mail,
  FileText,
  Briefcase,
  Users,
  Send,
  BarChart2,
  Bookmark,
  Settings,
  User,
} from 'lucide-react';

const ACTIONS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Email Automation (Draft & Send)', icon: Mail, path: '/email-automation' },
  { label: 'Resume Vault', icon: FileText, path: '/resumes' },
  { label: 'Job Descriptions', icon: Briefcase, path: '/job-descriptions' },
  { label: 'Campaigns & Bulk Send', icon: Users, path: '/campaigns' },
  { label: 'Sent Emails & Tracking', icon: Send, path: '/sent-emails' },
  { label: 'Analytics & Funnels', icon: BarChart2, path: '/analytics' },
  { label: 'Templates & Signature', icon: Bookmark, path: '/templates' },
  { label: 'Settings (SMTP & Groq Key)', icon: Settings, path: '/settings' },
  { label: 'User Profile & Security', icon: User, path: '/profile' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredActions = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="card-rounded w-full max-w-xl bg-white shadow-soft-lg overflow-hidden border border-orange-100"
      >
        <div className="flex items-center px-4 py-3.5 border-b border-orange-100 bg-orange-50/30">
          <Search className="w-5 h-5 text-orange-500 mr-3" />
          <input
            type="text"
            placeholder="Type a command or tab... (e.g. Email, Groq, Settings)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded-lg border border-slate-200 shadow-xs">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No matching tabs or commands found.
            </div>
          ) : (
            filteredActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(action.path)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors text-left font-medium"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{action.label}</span>
                  </div>
                  <span className="text-xs text-orange-500">Jump ↵</span>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
