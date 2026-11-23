import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmailAutomation from './pages/EmailAutomation';
import ResumeVault from './pages/ResumeVault';
import JobDescriptions from './pages/JobDescriptions';
import Campaigns from './pages/Campaigns';
import SentEmails from './pages/SentEmails';
import Analytics from './pages/Analytics';
import TemplatesSignature from './pages/TemplatesSignature';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-orange-600 tracking-wide">Loading Apply Flow...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <ResetPassword />
          </PublicOnlyRoute>
        }
      />

      {/* Authenticated Workspace App Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="email-automation" element={<EmailAutomation />} />
        <Route path="resumes" element={<ResumeVault />} />
        <Route path="job-descriptions" element={<JobDescriptions />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="sent-emails" element={<SentEmails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="templates" element={<TemplatesSignature />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
