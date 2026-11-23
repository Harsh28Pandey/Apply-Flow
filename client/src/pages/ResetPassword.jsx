import React, { useState } from 'react';
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Lock, ArrowRight, Zap } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Password reset token is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-md shadow-orange-500/25">
          <Zap className="w-6 h-6 fill-white text-white" />
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create New Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter a secure new password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-rounded p-8 sm:p-10 bg-white shadow-soft-lg space-y-6 border border-orange-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2 tracking-wide">
                New Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full input-rounded pl-11 pr-4 py-3 text-sm font-mono focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2 tracking-wide">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full input-rounded pl-11 pr-4 py-3 text-sm font-mono focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full btn-primary py-3.5 flex items-center justify-center space-x-2 text-sm shadow-md shadow-orange-500/20 font-medium"
            >
              <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-orange-100 text-center">
            <NavLink
              to="/login"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Back to Login
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
