import React from 'react';
import { NavLink } from 'react-router-dom';
import {
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Email Automation', icon: Mail, path: '/email-automation', badge: 'Core' },
  { label: 'Resume Vault', icon: FileText, path: '/resumes' },
  { label: 'Job Descriptions', icon: Briefcase, path: '/job-descriptions' },
  { label: 'Campaigns & Bulk', icon: Users, path: '/campaigns' },
  { label: 'Sent & Tracking', icon: Send, path: '/sent-emails' },
  { label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { label: 'Templates & Sign', icon: Bookmark, path: '/templates' },
  { label: 'Settings', icon: Settings, path: '/settings' },
  { label: 'Profile', icon: User, path: '/profile' },
];

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 bg-white border-r border-orange-100 flex flex-col justify-between shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-orange-100/80 bg-gradient-to-r from-orange-50/40 to-white">
          <NavLink to="/" className="flex items-center space-x-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">
                  Apply<span className="text-orange-600">Flow</span>
                </span>
                <span className="text-[10px] font-bold text-orange-600/90 tracking-wider uppercase mt-1">
                  Smart Outreach
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-175px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-orange-50/70 hover:text-orange-600'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-orange-100 bg-orange-50/30">
        <div
          className={`flex items-center justify-between p-2 rounded-2xl bg-white border border-orange-100/80 shadow-sm ${
            isCollapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AF'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'user@applyflow.io'}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
