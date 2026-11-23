import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Users,
  PlusCircle,
  Play,
  Pause,
  FileSpreadsheet,
  CheckCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { CardSkeleton } from '../components/Skeleton';

export default function Campaigns() {
  const queryClient = useQueryClient();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // New campaign form state
  const [name, setName] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(3);

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data.campaigns;
    },
  });

  // Fetch resumes
  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await api.get('/resumes');
      return res.data.resumes;
    },
  });

  // Fetch campaign recipients when drawer is opened
  const { data: campaignDetail } = useQuery({
    queryKey: ['campaign', selectedCampaignId],
    queryFn: async () => {
      const res = await api.get(`/campaigns/${selectedCampaignId}`);
      return res.data;
    },
    enabled: !!selectedCampaignId,
  });

  // Create Campaign Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      let recipients = [];
      if (csvText.trim()) {
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const emailIdx = header.indexOf('email');
        const nameIdx = header.indexOf('name');
        const companyIdx = header.indexOf('company');
        const positionIdx = header.indexOf('position') !== -1 ? header.indexOf('position') : header.indexOf('role');

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(',').map((c) => c.trim());
          if (emailIdx !== -1 && cols[emailIdx]) {
            recipients.push({
              email: cols[emailIdx],
              name: nameIdx !== -1 ? cols[nameIdx] : 'Hiring Lead',
              company: companyIdx !== -1 ? cols[companyIdx] : '',
              position: positionIdx !== -1 ? cols[positionIdx] : '',
            });
          }
        }
      }

      if (recipients.length === 0) {
        throw new Error('Please provide at least one valid recipient in the CSV format.');
      }

      const res = await api.post('/campaigns', {
        name,
        resumeId: resumeId || undefined,
        recipients,
        followUpEnabled,
        followUpDays: parseInt(followUpDays, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      setIsNewModalOpen(false);
      setName('');
      setCsvText('');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created and queued for review!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create campaign.');
    },
  });

  // Start Campaign
  const startMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/campaigns/${id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign dispatched to background scheduler.');
    },
  });

  // Pause Campaign
  const pauseMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/campaigns/${id}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign paused.');
    },
  });

  // Delete Campaign
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted.');
    },
  });

  // Batch Approve Recipients
  const batchApproveMutation = useMutation({
    mutationFn: async (campId) => {
      await api.post(`/campaigns/${campId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', selectedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('All recipients approved for automated dispatch.');
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campaigns & Bulk Send
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload CSV lists of recruiters and hiring managers. Apply Flow queues and spaces sends with natural jitter.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Bulk Campaign</span>
        </button>
      </div>

      {/* Grid of Campaigns */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card-rounded p-12 text-center max-w-lg mx-auto space-y-4 bg-white border border-orange-100">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Campaigns Created Yet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Launch multi-recipient outreach campaigns with CSV lists, automated follow-up sequences, and unsubscribe safeguards.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const percent = camp.totalRecipients > 0 ? Math.round((camp.sentCount / camp.totalRecipients) * 100) : 0;
            return (
              <div
                key={camp._id}
                className="card-rounded p-6 flex flex-col justify-between bg-white border border-orange-100 hover:border-orange-300 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={camp.status} />
                    <button
                      onClick={() => setDeleteTargetId(camp._id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-3">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {camp.totalRecipients} recipients • {camp.followUpEnabled ? `Follow-up in ${camp.followUpDays}d` : 'No follow-up'}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-orange-600 font-mono font-bold">{camp.sentCount} / {camp.totalRecipients} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-orange-100/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="text-slate-400 text-[10px]">Opens</div>
                      <div className="font-bold font-mono text-orange-600">{camp.openCount || 0}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="text-slate-400 text-[10px]">Clicks</div>
                      <div className="font-bold font-mono text-amber-600">{camp.clickCount || 0}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="text-slate-400 text-[10px]">Replies</div>
                      <div className="font-bold font-mono text-purple-600">{camp.replyCount || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-orange-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedCampaignId(camp._id)}
                    className="btn-outline text-xs py-1.5 px-3 flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-orange-600" />
                    <span>Recipients</span>
                  </button>

                  {camp.status === 'in_progress' ? (
                    <button
                      onClick={() => pauseMutation.mutate(camp._id)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1 text-amber-700"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : camp.status !== 'completed' ? (
                    <button
                      onClick={() => startMutation.mutate(camp._id)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipient Management Modal */}
      {selectedCampaignId && campaignDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-4xl max-h-[85vh] p-6 bg-white flex flex-col space-y-4 border border-orange-100">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Campaign: {campaignDetail.campaign.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {campaignDetail.recipients.length} recipients in queue
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => batchApproveMutation.mutate(selectedCampaignId)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Approve All Pending
                </button>
                <button
                  onClick={() => setSelectedCampaignId(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-orange-100 text-slate-500 font-semibold uppercase bg-orange-50/40">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100/60">
                  {campaignDetail.recipients.map((rec) => (
                    <tr key={rec._id} className="hover:bg-orange-50/30">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {rec.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {rec.email}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {rec.company || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {rec.position || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={rec.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-xl max-h-[90vh] p-6 bg-white flex flex-col space-y-4 border border-orange-100">
            <h3 className="font-bold text-slate-900 text-lg">
              Create New Outreach Campaign
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Campaign Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 YC Founders Cold Outreach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full input-rounded text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Associate Resume:
                </label>
                <select
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="w-full input-rounded text-xs bg-white"
                >
                  <option value="">Default Vault Resume</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.customName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Recipients CSV (Paste raw CSV text):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Required headers: name,email,company,position
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder={`name,email,company,position\nSarah Chen,sarah@acme.com,Acme Corp,VP Engineering\nDavid Miller,david@startup.io,Startup Inc,Head of Talent`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full input-rounded text-xs font-mono resize-y"
                />
              </div>

              <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Enable Automated Follow-up Sequence
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Sends follow-up if recipient does not reply.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                </div>

                {followUpEnabled && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Follow-up Delay (Days):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={followUpDays}
                      onChange={(e) => setFollowUpDays(e.target.value)}
                      className="w-28 input-rounded text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-orange-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name.trim() || !csvText.trim()}
                className="btn-primary text-xs"
              >
                {createMutation.isPending ? 'Queuing...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? All pending recipient tasks will be stopped."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
