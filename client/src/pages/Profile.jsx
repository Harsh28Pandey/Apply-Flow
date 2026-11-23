import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { User, Lock, Trash2, Shield, Save, ArrowRight } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update Name
  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }

    try {
      const res = await api.put('/auth/me', { name });
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update name.');
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully! Please log in again.');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Password update failed.');
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/auth/me');
      toast.success('Account and all associated records permanently purged.');
      logout();
    } catch (err) {
      toast.error('Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          User Profile & Security
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account credentials, security settings, and data preferences.
        </p>
      </div>

      {/* Avatar Card */}
      <div className="card-rounded p-6 flex items-center space-x-4 bg-white border border-orange-100">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white font-extrabold flex items-center justify-center text-xl shadow-md shadow-orange-500/20">
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AF'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {user?.name || 'User'}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {user?.email || ''}
          </p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Apply Flow Pro Active
          </span>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleUpdateName} className="card-rounded p-6 space-y-4 bg-white border border-orange-100">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-orange-100">
          <User className="w-4 h-4 text-orange-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            Personal Information
          </h3>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Full Name:
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full input-rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Email Address (Read-only):
          </label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full input-rounded text-sm bg-orange-50/50 opacity-60 cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary text-xs py-2 px-5">
            Save Profile
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <form onSubmit={handleChangePassword} className="card-rounded p-6 space-y-4 bg-white border border-orange-100">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-orange-100">
          <Lock className="w-4 h-4 text-orange-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            Change Password
          </h3>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Current Password:
          </label>
          <input
            type="password"
            required
            placeholder="••••••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full input-rounded text-sm font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              New Password (min 8 chars):
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full input-rounded text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Confirm New Password:
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full input-rounded text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary text-xs py-2 px-5">
            Update Password
          </button>
        </div>
      </form>

      {/* Danger Zone: Purge Account */}
      <div className="card-rounded p-6 space-y-4 border border-rose-200 bg-rose-50/20">
        <div className="flex items-center space-x-2 text-rose-600">
          <Trash2 className="w-5 h-5" />
          <h3 className="font-bold text-base">Danger Zone</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Permanently delete your account along with all resumes, job descriptions, campaigns, email tracking logs, and encrypted settings. This action is irreversible.
        </p>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="btn-danger text-xs py-2 px-4"
        >
          Delete Account & All Data
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Permanently Delete Account"
        message="Are you completely sure? Every single email, tracked link, resume, and setting will be purged from the database permanently."
        confirmText="Yes, Delete Everything"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
