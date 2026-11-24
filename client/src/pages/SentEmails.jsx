import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getAccessToken, API_BASE_URL } from '../api/client';
import toast from 'react-hot-toast';
import {
  Send,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Bot,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Paperclip,
  FileText,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { TableRowSkeleton } from '../components/Skeleton';

export default function SentEmails() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Dynamic live SSE tracking listener
  useEffect(() => {
    const token = getAccessToken() || localStorage.getItem('applyflow_token');
    if (!token) return;

    let eventSource = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/v1/tracking/stream?token=${encodeURIComponent(token)}`);
      
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && (data.type === 'open' || data.type === 'click')) {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
            if (data.emailId) {
              queryClient.invalidateQueries({ queryKey: ['email-detail', data.emailId] });
            }
            if (data.type === 'open') {
              toast.success('⚡ Sent email opened by recipient!', { icon: '📬' });
            } else if (data.type === 'click') {
              toast.success('🔗 Link clicked inside your sent email!', { icon: '🎯' });
            }
          }
        } catch {
          // ignore non-json messages (heartbeats)
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch {
      // EventSource fallback gracefully handled by polling refetchInterval
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  // Open & Download attachment handlers
  const handleDownloadAttachment = async (resumeId, customName) => {
    const downloadToast = toast.loading('Fetching attachment from vault...');
    try {
      const res = await api.get(`/resumes/${resumeId}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${customName || 'resume'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Resume downloaded to your system.', { id: downloadToast });
    } catch {
      toast.error('Failed to download resume attachment.', { id: downloadToast });
    }
  };

  const handleViewAttachment = async (resumeId) => {
    const viewToast = toast.loading('Loading document preview...');
    try {
      const res = await api.get(`/resumes/${resumeId}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
      toast.dismiss(viewToast);
    } catch {
      toast.error('Failed to open resume document.', { id: viewToast });
    }
  };

  // Fetch emails with filters and dynamic polling for live tracking updates
  const { data, isLoading } = useQuery({
    queryKey: ['emails', { statusFilter, search, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: statusFilter,
        search,
      });
      const res = await api.get(`/emails?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['email-detail', selectedEmailId],
    queryFn: async () => {
      const res = await api.get(`/emails/${selectedEmailId}`);
      return res.data;
    },
    enabled: !!selectedEmailId,
    refetchInterval: 4000,
  });

  // Toggle Reply status Mutation
  const markRepliedMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/emails/${id}/reply`);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-detail', selectedEmailId] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      toast.success(resData.email.isReplied ? 'Marked as Replied!' : 'Unmarked reply.');
    },
  });

  // Delete Email Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/emails/${id}`);
    },
    onSuccess: () => {
      setSelectedEmailId(null);
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Email record removed.');
    },
  });

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await api.get('/emails/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'applyflow_emails.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Exported sent emails to CSV.');
    } catch (err) {
      toast.error('Failed to export CSV.');
    }
  };

  const emails = data?.emails || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sent Emails & Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time feed of email deliveries, open pixels, link clicks, and reply conversions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn-outline flex items-center space-x-2 text-xs"
        >
          <Download className="w-4 h-4 text-orange-600" />
          <span>Export All CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-rounded p-4 bg-white border border-orange-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full input-rounded pl-10 text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'sent', 'opened', 'clicked', 'replied', 'queued', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'bg-orange-50/60 text-slate-600 hover:text-orange-600 border border-orange-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Emails Table */}
      <div className="card-rounded p-6 bg-white border border-orange-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-orange-100 text-xs font-bold text-slate-500 uppercase tracking-wider bg-orange-50/40">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Opens</th>
                <th className="py-3 px-4 text-center">Clicks</th>
                <th className="py-3 px-4 text-center">Replied</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No emails match the selected filters.
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email._id}
                    onClick={() => setSelectedEmailId(email._id)}
                    className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {email.recipientName || email.to}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {email.company ? `${email.company} • ` : ''}
                        <span className="font-mono">{email.to}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800">
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
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-orange-600">
                      {email.openCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-amber-600">
                      {email.clickCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {email.isReplied ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {email.sentAt
                        ? new Date(email.sentAt).toLocaleDateString()
                        : new Date(email.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmailId(email._id);
                        }}
                        className="btn-outline text-xs py-1 px-2.5 inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-600" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="pt-4 border-t border-orange-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-outline py-1 px-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-outline py-1 px-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedEmailId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setSelectedEmailId(null)}
        >
          <div
            className="card-rounded w-full max-w-3xl max-h-[90vh] p-6 bg-white flex flex-col space-y-4 overflow-hidden border border-orange-100 shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {isDetailLoading || !detailData?.email ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Loading tracking insights...</span>
              </div>
            ) : (() => {
              const emailItem = detailData.email;
              const eventsList = detailData.trackingEvents || detailData.events || [];
              const resumeRef = emailItem.resumeId;
              const resumeIdVal = resumeRef?._id || resumeRef;
              const resumeNameVal = resumeRef?.customName || resumeRef?.originalName || 'Resume.pdf';

              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-orange-100">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <StatusBadge
                        status={emailItem.status}
                        isReplied={emailItem.isReplied}
                        openCount={emailItem.openCount}
                        clickCount={emailItem.clickCount}
                      />
                      <h3 className="font-bold text-slate-900 text-base truncate max-w-md">
                        {emailItem.subject}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setDeleteTargetId(emailItem._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl"
                        title="Delete email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedEmailId(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-orange-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                    <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div className="space-y-1">
                        <div><strong>To:</strong> {emailItem.to} ({emailItem.recipientName || 'Hiring Lead'})</div>
                        {emailItem.company && <div><strong>Company:</strong> {emailItem.company}</div>}
                        <div><strong>Sent:</strong> {emailItem.sentAt ? new Date(emailItem.sentAt).toLocaleString() : 'Not sent'}</div>
                        {emailItem.errorReason && (
                          <div className="text-rose-600 font-semibold mt-1">
                            Error: {emailItem.errorReason}
                          </div>
                        )}
                        {emailItem.hasAttachment && (
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            <span className="text-slate-500 font-semibold">Attachment:</span>
                            {resumeIdVal ? (
                              <div className="inline-flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewAttachment(resumeIdVal)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-900 font-semibold hover:bg-orange-200 transition-all border border-orange-200 shadow-xs cursor-pointer active:scale-95"
                                  title="Open PDF in new tab"
                                >
                                  <Eye className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                                  <span>View {resumeNameVal}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(resumeIdVal, resumeNameVal)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-semibold hover:bg-orange-50 hover:text-orange-600 transition-all border border-slate-200 hover:border-orange-200 shadow-xs cursor-pointer active:scale-95"
                                  title="Download PDF to computer"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                  <span>Download</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                                <Paperclip className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                                <span>Attached Resume</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => markRepliedMutation.mutate(emailItem._id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                          emailItem.isReplied
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-500'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{emailItem.isReplied ? 'Replied ✓' : 'Mark as Replied'}</span>
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Email Body Content
                      </h4>
                      <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-orange-100 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                        {emailItem.body}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Event Timeline ({eventsList.length})
                      </h4>

                      {eventsList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No open or click events recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {eventsList.map((ev, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-2xl bg-white border border-orange-100 text-xs flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${ev.eventType === 'click' ? 'bg-amber-500' : 'bg-orange-500'}`} />
                                <span className="font-bold text-slate-800 capitalize">{ev.eventType}</span>
                                {ev.isBot && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                                    Bot/Scanner
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(ev.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Sent Email Record"
        message="Are you sure you want to delete this email record and all its associated tracking events? This cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
