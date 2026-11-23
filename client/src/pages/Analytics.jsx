import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Download,
  Mail,
  MailOpen,
  MousePointer,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function Analytics() {
  const [days, setDays] = useState(30);

  // Summary
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await api.get('/analytics/summary');
      return res.data.summary;
    },
  });

  // Timeseries
  const { data: timeseries = [] } = useQuery({
    queryKey: ['analytics-timeseries', days],
    queryFn: async () => {
      const res = await api.get(`/analytics/timeseries?days=${days}`);
      return res.data.timeseries;
    },
  });

  // Breakdowns
  const { data: breakdowns } = useQuery({
    queryKey: ['analytics-breakdowns'],
    queryFn: async () => {
      const res = await api.get('/analytics/breakdowns');
      return res.data;
    },
  });

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await api.get('/emails/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'applyflow_analytics.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Analytics CSV exported.');
    } catch (err) {
      toast.error('Failed to export CSV.');
    }
  };

  const funnel = breakdowns?.funnel || [
    { step: 'Sent', count: summary?.totalSent || 0, percentage: 100 },
    { step: 'Delivered', count: summary?.totalSent || 0, percentage: 100 },
    { step: 'Opened', count: summary?.openedCount || 0, percentage: summary?.openRate || 0 },
    { step: 'Clicked', count: summary?.clickedCount || 0, percentage: summary?.clickRate || 0 },
    { step: 'Replied', count: summary?.repliedCount || 0, percentage: summary?.replyRate || 0 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Outreach Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Data-driven insights: open/click funnels, top clicked links, and resume performance benchmarks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Days Toggle */}
          <div className="p-1 rounded-2xl bg-orange-50 border border-orange-100 flex space-x-1 text-xs font-bold">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  days === d
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-orange-600'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="btn-outline flex items-center space-x-2 text-xs"
          >
            <Download className="w-4 h-4 text-orange-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-rounded p-5 bg-white border border-orange-100">
          <div className="text-xs text-slate-500 font-bold">Total Delivered</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {summary?.totalSent || 0}
          </div>
        </div>
        <div className="card-rounded p-5 bg-white border border-orange-100">
          <div className="text-xs text-slate-500 font-bold">Overall Open Rate</div>
          <div className="text-2xl font-black text-orange-600 font-mono mt-2">
            {summary?.openRate || 0}%
          </div>
        </div>
        <div className="card-rounded p-5 bg-white border border-orange-100">
          <div className="text-xs text-slate-500 font-bold">Overall Click Rate</div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-2">
            {summary?.clickRate || 0}%
          </div>
        </div>
        <div className="card-rounded p-5 bg-white border border-orange-100">
          <div className="text-xs text-slate-500 font-bold">Reply Conversion</div>
          <div className="text-2xl font-black text-purple-600 font-mono mt-2">
            {summary?.replyRate || 0}%
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="card-rounded p-6 bg-white border border-orange-100">
        <h2 className="text-base font-bold text-slate-900 mb-2">
          Application Conversion Funnel
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Tracking the drop-off from initial send to verified responses.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {funnel.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-orange-50/40 border border-orange-100 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{step.step}</span>
                <span className="text-[11px] font-mono text-orange-600 font-bold">
                  {step.percentage}%
                </span>
              </div>
              <div className="text-xl font-black font-mono text-slate-900">
                {step.count}
              </div>
              <div className="w-full h-1.5 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                  style={{ width: `${Math.max(step.percentage, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Trends & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <div className="card-rounded p-6 bg-white border border-orange-100">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Activity Volume Trends
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Daily engagement over the selected window.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="#FED7AA" />
                <XAxis dataKey="date" tickLine={false} stroke="#94A3B8" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickLine={false} stroke="#94A3B8" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '1rem',
                    border: '1px solid #FED7AA',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px rgba(249,115,22,0.15)',
                  }}
                />
                <Area type="monotone" dataKey="sent" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#anSent)" />
                <Area type="monotone" dataKey="opened" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#anOpened)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resume Performance Breakdown */}
        <div className="card-rounded p-6 bg-white border border-orange-100 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Performance by Resume Variant
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Compare open & click rates across different uploaded resumes.
            </p>

            <div className="space-y-3">
              {breakdowns?.byResume?.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No resume performance data yet.
                </div>
              ) : (
                breakdowns?.byResume?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.sentCount} sent</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-orange-600">{item.openRate}% Open</div>
                      <div className="text-[11px] font-mono text-amber-600">{item.clickRate}% Click</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
