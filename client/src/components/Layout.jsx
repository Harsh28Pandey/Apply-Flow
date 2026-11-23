import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Menu,
  X,
  LayoutDashboard,
  Mail,
  Send,
  Users,
  Settings,
  Plus,
  Sparkles,
} from 'lucide-react';

export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex text-slate-800">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 md:px-8 flex items-center justify-between shadow-xs">
          {/* Left: Mobile Toggle & Quick Search */}
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl bg-orange-50 text-slate-700 hover:bg-orange-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-orange-600" /> : <Menu className="w-5 h-5 text-orange-600" />}
            </button>

            <button
              onClick={() => setIsCommandOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-50 text-slate-400 text-xs hover:bg-orange-50/60 hover:border-orange-200 transition-all border border-slate-200"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-orange-500" />
                <span>Search emails, resumes, or tabs...</span>
              </div>
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-white rounded-lg border border-slate-200 text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Controls: Quick Action & User Profile */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/email-automation')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs shadow-sm shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft Email</span>
            </button>

            <NavLink
              to="/profile"
              className="flex items-center space-x-2 p-1 pl-2 pr-3 rounded-2xl bg-orange-50/80 hover:bg-orange-100 border border-orange-200/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AF'}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-800">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </NavLink>
          </div>
        </header>

        {/* Mobile Slide-Over Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs pt-16">
            <div className="bg-white h-full p-4 space-y-2 border-r border-orange-100 shadow-xl max-w-xs">
              <div className="flex items-center space-x-2 px-3 py-2 border-b border-orange-100 mb-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                  AF
                </div>
                <span className="font-bold text-slate-900 text-base">Apply Flow</span>
              </div>
              <NavLink
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-orange-50 hover:text-orange-600 text-slate-700"
              >
                <LayoutDashboard className="w-4 h-4 text-orange-500" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/email-automation"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-orange-50 hover:text-orange-600 text-slate-700"
              >
                <Mail className="w-4 h-4 text-orange-500" />
                <span>Email Automation</span>
              </NavLink>
              <NavLink
                to="/sent-emails"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-orange-50 hover:text-orange-600 text-slate-700"
              >
                <Send className="w-4 h-4 text-orange-500" />
                <span>Sent Emails</span>
              </NavLink>
              <NavLink
                to="/campaigns"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-orange-50 hover:text-orange-600 text-slate-700"
              >
                <Users className="w-4 h-4 text-orange-500" />
                <span>Campaigns</span>
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-orange-50 hover:text-orange-600 text-slate-700"
              >
                <Settings className="w-4 h-4 text-orange-500" />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Main Routed Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-16">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandOpen} onClose={setIsCommandOpen} />
    </div>
  );
}
