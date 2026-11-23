import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { TableRowSkeleton } from '../components/Skeleton';
import {
  Send,
  MailOpen,
  MousePointer,
  MessageSquare,
  Clock,
  AlertCircle,
  PlusCircle,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await api.get('/analytics/summary');
      return res.data.summary;
    },
  });

  const { data: timeseriesData, isLoading: isTimeseriesLoading } = useQuery({
    queryKey: ['analytics-timeseries'],
    queryFn: async () => {
      const res = await api.get('/analytics/timeseries?days=30');
      return res.data.timeseries;
    },
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings;
    },
  });

  const { data: resumesData } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await api.get('/resumes');
      return res.data.resumes;
    },
  });

  const { data: emailsData, isLoading: isEmailsLoading } = useQuery({
    queryKey: ['emails', 'recent'],
    queryFn: async () => {
      const res = await api.get('/emails?limit=6');
      return res.data.emails;
    },
  });

  const kpis = [
    {
      label: 'Emails Sent',
      value: summaryData?.totalSent ?? 0,
      icon: Send,
      color: 'text-orange-600 bg-orange-50 border border-orange-200',
    },
    {
      label: 'Open Rate',
      value: `${summaryData?.openRate ?? 0}%`,
      subtitle: `${summaryData?.openedCount ?? 0} opens`,
      icon: MailOpen,
      color: 'text-amber-600 bg-amber-50 border border-amber-200',
    },
    {
      label: 'Click Rate',
      value: `${summaryData?.clickRate ?? 0}%`,
      subtitle: `${summaryData?.clickedCount ?? 0} clicks`,
      icon: MousePointer,
      color: 'text-orange-700 bg-orange-100/50 border border-orange-200',
    },
    {
      label: 'Reply Rate',
      value: `${summaryData?.replyRate ?? 0}%`,
      subtitle: `${summaryData?.repliedCount ?? 0} replies`,
      icon: MessageSquare,
      color: 'text-purple-600 bg-purple-50 border border-purple-200',
    },
    {
      label: 'Scheduled',
      value: summaryData?.scheduledCount ?? 0,
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border border-amber-200',
    },
    {
      label: 'Delivery Failed',
      value: summaryData?.failedCount ?? 0,
      icon: AlertCircle,
      color: 'text-rose-600 bg-rose-50 border border-rose-200',
    },
  ];

  const isSmtpConfigured = !!(settingsData?.smtp?.host && settingsData?.smtp?.hasPassword);
  const isAiConfigured = !!settingsData?.ai?.hasApiKey;
  const isResumeUploaded = (resumesData?.length ?? 0) > 0;
  const allSetupDone = isSmtpConfigured && isAiConfigured && isResumeUploaded;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Outreach Command Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time analytics for your job application outreach and email engagement.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <NavLink to="/resumes" className="btn-secondary flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-orange-600" />
            <span>Upload Resume</span>
          </NavLink>
          <NavLink to="/email-automation" className="btn-primary flex items-center space-x-2">
            <PlusCircle className="w-4 h-4" />
            <span>New Email</span>
          </NavLink>
        </div>
      </div>

      {!allSetupDone && (
        <div className="card-rounded p-6 bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-2xl bg-orange-500 text-white shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h2 className="font-bold text-slate-900 text-base">
                Apply Flow Setup Checklist
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              {[isSmtpConfigured, isAiConfigured, isResumeUploaded].filter(Boolean).length}/3 Complete
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => navigate('/settings')}
              className="p-3.5 rounded-2xl bg-white border border-orange-100 flex items-center justify-between cursor-pointer hover:border-orange-400 transition-all shadow-xs"
            >
              <div className="flex items-center space-x-3">
                {isSmtpConfigured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Connect Sender SMTP
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isSmtpConfigured ? 'Connected & Verified' : 'Enter email credentials'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400" />
            </div>

            <div
              onClick={() => navigate('/settings')}
              className="p-3.5 rounded-2xl bg-white border border-orange-100 flex items-center justify-between cursor-pointer hover:border-orange-400 transition-all shadow-xs"
            >
              <div className="flex items-center space-x-3">
                {isAiConfigured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Add Groq AI Key
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isAiConfigured ? 'Active & Ready' : 'Needed for personalization'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400" />
            </div>

            <div
              onClick={() => navigate('/resumes')}
              className="p-3.5 rounded-2xl bg-white border border-orange-100 flex items-center justify-between cursor-pointer hover:border-orange-400 transition-all shadow-xs"
            >
              <div className="flex items-center space-x-3">
                {isResumeUploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Upload Resume PDF
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isResumeUploaded ? `${resumesData.length} resume(s) stored` : 'Drag and drop PDF'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="card-rounded p-5 flex flex-col justify-between bg-white border border-orange-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 truncate">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-2xl ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {isSummaryLoading ? '...' : kpi.value}
                </div>
                {kpi.subtitle && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {kpi.subtitle}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-rounded p-6 bg-white border border-orange-100">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              30-Day Outreach & Engagement Trend
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of sent emails vs. tracked opens and link clicks.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-700">Sent</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-700">Opened</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-700">Clicked</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          {isTimeseriesLoading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Loading activity chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseriesData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="#FED7AA" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis tickLine={false} stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '1rem',
                    border: '1px solid #FED7AA',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(249,115,22,0.15)',
                  }}
                />
                <Area type="monotone" dataKey="sent" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="opened" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                <Area type="monotone" dataKey="clicked" stroke="#A855F7" strokeWidth={2} fillOpacity={1} fill="url(#colorClicked)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-rounded p-6 bg-white border border-orange-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Sent Emails
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status and tracking metrics of your most recent outreach.
            </p>
          </div>
          <NavLink
            to="/sent-emails"
            className="text-xs font-bold text-orange-600 hover:underline flex items-center space-x-1"
          >
            <span>View All Emails</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-orange-100 text-xs font-bold text-slate-500 uppercase tracking-wider bg-orange-50/40">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Opens</th>
                <th className="py-3 px-4">Clicks</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/60">
              {isEmailsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : emailsData?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No emails sent yet. Generate and send your first application!
                  </td>
                </tr>
              ) : (
                emailsData?.map((email) => (
                  <tr
                    key={email._id}
                    onClick={() => navigate('/sent-emails')}
                    className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {email.recipientName || email.to}
                      </div>
                      {email.company && (
                        <div className="text-[11px] text-slate-500">{email.company}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800 font-medium">
                      {email.subject}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={email.status}
                        isReplied={email.isReplied}
                        openCount={email.openCount}
                        clickCount={email.clickCount}
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-orange-600">
                      {email.openCount || 0}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-amber-600">
                      {email.clickCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {email.sentAt
                        ? new Date(email.sentAt).toLocaleDateString()
                        : new Date(email.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
