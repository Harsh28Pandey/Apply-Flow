import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Mail, ArrowRight, ArrowLeft, Zap } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetTokenData, setResetTokenData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetTokenData(res.data);
      toast.success('Reset instructions generated!');
    } catch (err) {
      toast.error('Failed to request password reset.');
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
          Reset Your Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your registered email address to receive reset instructions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-rounded p-8 sm:p-10 bg-white shadow-soft-lg space-y-6 border border-orange-100">
          {resetTokenData ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-3">
                <div className="font-bold text-orange-800 text-sm">
                  Password Reset Token Generated
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Click the link below to set your new password:
                </p>
                <div className="pt-2">
                  <NavLink
                    to={`/reset-password?token=${resetTokenData.resetToken}`}
                    className="btn-primary text-xs py-2.5 px-4 block text-center shadow-md shadow-orange-500/20"
                  >
                    Set New Password
                  </NavLink>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full input-rounded pl-11 pr-4 py-3 text-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3.5 flex items-center justify-center space-x-2 text-sm shadow-md shadow-orange-500/20 font-medium"
              >
                <span>{isLoading ? 'Generating...' : 'Send Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-orange-100 text-center">
            <NavLink
              to="/login"
              className="text-xs font-semibold text-slate-500 hover:text-orange-600 inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
