import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Server,
  Key,
  Shield,
  Send,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Sliders,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
} from 'lucide-react';

const GROQ_MODELS = [
  { id: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b (Recommended Default)' },
  { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (High Quality)' },
  { id: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (Fastest)' },
  { id: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768 (32k context)' },
];

export default function Settings() {
  const queryClient = useQueryClient();

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [testRecipient, setTestRecipient] = useState('');

  const [groqApiKey, setGroqApiKey] = useState('');
  const [modelName, setModelName] = useState('openai/gpt-oss-20b');

  const [attachmentFilename, setAttachmentFilename] = useState('Resume.pdf');

  const [dailyLimit, setDailyLimit] = useState(50);
  const [minDelayMs, setMinDelayMs] = useState(5000);
  const [maxDelayMs, setMaxDelayMs] = useState(15000);
  const [openTrackingEnabled, setOpenTrackingEnabled] = useState(true);
  const [clickTrackingEnabled, setClickTrackingEnabled] = useState(true);
  const [unsubscribeFooterEnabled, setUnsubscribeFooterEnabled] = useState(true);

  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSmtpHost(settingsData.smtp?.host || '');
      setSmtpPort(settingsData.smtp?.port || 587);
      setSmtpSecure(!!settingsData.smtp?.secure);
      setSmtpUsername(settingsData.smtp?.username || '');
      setSmtpPassword(settingsData.smtp?.passwordMasked || '');
      setSmtpFromAddress(settingsData.smtp?.fromAddress || '');
      setSmtpFromName(settingsData.smtp?.fromName || '');
      setTestRecipient(settingsData.smtp?.fromAddress || '');

      setGroqApiKey(settingsData.ai?.groqApiKeyMasked || '');
      setModelName(settingsData.ai?.modelName || 'openai/gpt-oss-20b');

      setAttachmentFilename(settingsData.branding?.attachmentFilename || 'Resume.pdf');

      setDailyLimit(settingsData.sending?.dailyLimit ?? 50);
      setMinDelayMs(settingsData.sending?.minDelayMs ?? 5000);
      setMaxDelayMs(settingsData.sending?.maxDelayMs ?? 15000);
      setOpenTrackingEnabled(settingsData.sending?.openTrackingEnabled ?? true);
      setClickTrackingEnabled(settingsData.sending?.clickTrackingEnabled ?? true);
      setUnsubscribeFooterEnabled(settingsData.sending?.unsubscribeFooterEnabled ?? true);
    }
  }, [settingsData]);

  const applyPreset = (preset) => {
    if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      toast.success('Applied Gmail preset (Port 465 SSL). Use a Google App Password!');
    } else if (preset === 'outlook') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort(587);
      setSmtpSecure(false);
      toast.success('Applied Outlook preset (Port 587 STARTTLS).');
    } else if (preset === 'mailtrap') {
      setSmtpHost('sandbox.smtp.mailtrap.io');
      setSmtpPort(2525);
      setSmtpSecure(false);
      toast.success('Applied Mailtrap testing preset (Port 2525).');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        smtp: {
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpSecure,
          username: smtpUsername,
          password: smtpPassword,
          fromAddress: smtpFromAddress,
          fromName: smtpFromName,
        },
        ai: {
          groqApiKey,
          modelName,
        },
        branding: {
          attachmentFilename,
        },
        sending: {
          dailyLimit: parseInt(dailyLimit, 10),
          minDelayMs: parseInt(minDelayMs, 10),
          maxDelayMs: parseInt(maxDelayMs, 10),
          openTrackingEnabled,
          clickTrackingEnabled,
          unsubscribeFooterEnabled,
        },
      };

      const res = await api.put('/settings', payload);
      return res.data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings encrypted & saved successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save settings.');
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/test-smtp', {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        username: smtpUsername,
        password: smtpPassword,
        fromAddress: smtpFromAddress,
        fromName: smtpFromName,
        testRecipient: testRecipient || smtpFromAddress,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'SMTP Verified & test email delivered!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'SMTP Connection Test Failed.');
    },
  });

  const testAiMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/test-ai', {
        apiKey: groqApiKey,
        modelName,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Groq AI Key verified successfully! Model active.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Groq AI verification failed.');
    },
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Configuration Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Settings & Integrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your Groq AI Key, sender email account, and tracking rules.
          </p>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center justify-center space-x-2 px-6 py-3 shadow-md shadow-orange-500/20"
        >
          <Save className="w-4 h-4" />
          <span>{saveMutation.isPending ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* 1. Groq AI Configuration Card */}
      <div className="card-rounded p-6 space-y-5 bg-white border border-orange-100">
        <div className="flex items-center justify-between pb-3 border-b border-orange-100 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-xs">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                1. AI Intelligence Engine (Groq API)
              </h2>
              <p className="text-xs text-slate-500">
                Generates hyper-personalized cold outreach emails from resumes & job descriptions.
              </p>
            </div>
          </div>

          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-600 font-semibold hover:underline flex items-center space-x-1"
          >
            <span>Get Free Groq Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Groq API Key (starts with <code className="text-orange-600 font-mono">gsk_...</code>):
            </label>
            <div className="relative">
              <input
                type={showGroqKey ? 'text' : 'password'}
                placeholder="gsk_..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full input-rounded pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Encrypted at rest using AES-256-GCM.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Active Model:
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full input-rounded text-xs bg-white"
            >
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Test AI Key Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => testAiMutation.mutate()}
            disabled={testAiMutation.isPending || !groqApiKey}
            className="btn-secondary text-xs flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>{testAiMutation.isPending ? 'Verifying AI Key...' : 'Test Groq AI Key'}</span>
          </button>
        </div>
      </div>

      {/* 2. Email Sender & SMTP Configuration Card */}
      <div className="card-rounded p-6 space-y-5 bg-white border border-orange-100">
        <div className="flex items-center justify-between pb-3 border-b border-orange-100 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                2. Email Sender Account & SMTP
              </h2>
              <p className="text-xs text-slate-500">
                Where your emails are sent from. Configured with your own mail provider or SMTP.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('gmail')}
              className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-semibold"
            >
              Gmail
            </button>
            <button
              type="button"
              onClick={() => applyPreset('outlook')}
              className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-semibold"
            >
              Outlook
            </button>
            <button
              type="button"
              onClick={() => applyPreset('mailtrap')}
              className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-semibold"
            >
              Mailtrap
            </button>
          </div>
        </div>

        {/* Sender details (From Email & From Name) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-100">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              From Email Address (Sender):
            </label>
            <input
              type="email"
              placeholder="e.g. alex.chen@gmail.com"
              value={smtpFromAddress}
              onChange={(e) => setSmtpFromAddress(e.target.value)}
              className="w-full input-rounded text-xs"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              This address will appear as the sender of your outreach emails.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              From Name (Display Name):
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Chen"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
              className="w-full input-rounded text-xs"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Recipient sees: <code>"{smtpFromName || 'Your Name'}" &lt;{smtpFromAddress || 'you@domain.com'}&gt;</code>
            </span>
          </div>
        </div>

        {/* Server & Auth Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              SMTP Host:
            </label>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="w-full input-rounded text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Port:
            </label>
            <input
              type="number"
              placeholder="587"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="w-full input-rounded text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              SMTP Username / Login:
            </label>
            <input
              type="text"
              placeholder="your-email@example.com"
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              className="w-full input-rounded text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              SMTP Password / App Password:
            </label>
            <div className="relative">
              <input
                type={showSmtpPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full input-rounded pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="smtpSecure"
            checked={smtpSecure}
            onChange={(e) => setSmtpSecure(e.target.checked)}
            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
          />
          <label htmlFor="smtpSecure" className="text-xs font-medium text-slate-700">
            Use Implicit SSL/TLS (port 465). Unchecked uses STARTTLS (port 587/25).
          </label>
        </div>

        {/* Test SMTP & Send Test Email Section */}
        <div className="pt-3 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex-1 max-w-sm">
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Send Test Email To:
            </label>
            <input
              type="email"
              placeholder="your-personal-inbox@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-full input-rounded text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => testSmtpMutation.mutate()}
            disabled={testSmtpMutation.isPending || !smtpHost || !smtpUsername}
            className="btn-secondary text-xs flex items-center space-x-2 self-end"
          >
            <Send className="w-3.5 h-3.5 text-orange-600" />
            <span>{testSmtpMutation.isPending ? 'Sending Test...' : 'Send Test Email'}</span>
          </button>
        </div>
      </div>

      {/* 3. Branding, Limits & Tracking */}
      <div className="card-rounded p-6 space-y-5 bg-white border border-orange-100">
        <div className="flex items-center space-x-3 pb-3 border-b border-orange-100">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              3. Branding & Tracking Policy
            </h2>
            <p className="text-xs text-slate-500">
              Customize attachment filename and email tracking toggles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Attachment Sent Filename:
            </label>
            <input
              type="text"
              placeholder="Resume.pdf"
              value={attachmentFilename}
              onChange={(e) => setAttachmentFilename(e.target.value)}
              className="w-full input-rounded text-xs"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Recipients will see this filename (never your internal upload name).
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Daily Email Sending Limit:
            </label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-full input-rounded text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Delay Between Sends (ms):
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={minDelayMs}
                onChange={(e) => setMinDelayMs(e.target.value)}
                className="w-1/2 input-rounded text-xs"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxDelayMs}
                onChange={(e) => setMaxDelayMs(e.target.value)}
                className="w-1/2 input-rounded text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tracking Toggles */}
        <div className="pt-2 border-t border-orange-100 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/30 border border-orange-100">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Open Tracking Pixel (1x1 Transparent)
              </div>
              <div className="text-[11px] text-slate-500">
                Embeds invisible pixel to detect email opens.
              </div>
            </div>
            <input
              type="checkbox"
              checked={openTrackingEnabled}
              onChange={(e) => setOpenTrackingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/30 border border-orange-100">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Click Link Rewriting & Tracking
              </div>
              <div className="text-[11px] text-slate-500">
                Tracks link clicks and 302 redirects to safe destinations.
              </div>
            </div>
            <input
              type="checkbox"
              checked={clickTrackingEnabled}
              onChange={(e) => setClickTrackingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/30 border border-orange-100">
            <div>
              <div className="text-xs font-bold text-slate-800">
                One-Click Unsubscribe Footer
              </div>
              <div className="text-[11px] text-slate-500">
                Includes CAN-SPAM compliant unsubscribe link.
              </div>
            </div>
            <input
              type="checkbox"
              checked={unsubscribeFooterEnabled}
              onChange={(e) => setUnsubscribeFooterEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
