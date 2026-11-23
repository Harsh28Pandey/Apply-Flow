import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Briefcase,
  PlusCircle,
  ExternalLink,
  Sparkles,
  Trash2,
  Edit2,
  Building,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { CardSkeleton } from '../components/Skeleton';

export default function JobDescriptions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJd, setEditingJd] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');

  const { data: jds = [], isLoading } = useQuery({
    queryKey: ['jds'],
    queryFn: async () => {
      const res = await api.get('/jds');
      return res.data.jds;
    },
  });

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setJobUrl('');
    setRecipientName('');
    setRecipientPosition('');
    setRecipientEmail('');
    setContent('');
    setNotes('');
    setEditingJd(null);
  };

  const handleOpenEdit = (jd) => {
    setEditingJd(jd);
    setTitle(jd.title);
    setCompany(jd.company);
    setJobUrl(jd.jobUrl || '');
    setRecipientName(jd.recipientName || '');
    setRecipientPosition(jd.recipientPosition || '');
    setRecipientEmail(jd.recipientEmail || '');
    setContent(jd.content);
    setNotes(jd.notes || '');
    setIsAddModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        company,
        jobUrl,
        recipientName,
        recipientPosition,
        recipientEmail,
        content,
        notes,
      };

      if (editingJd) {
        await api.put(`/jds/${editingJd._id}`, payload);
      } else {
        await api.post('/jds', payload);
      }
    },
    onSuccess: () => {
      setIsAddModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['jds'] });
      toast.success(editingJd ? 'Job description updated.' : 'Job description saved.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save JD.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/jds/${id}`);
    },
    onSuccess: () => {
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['jds'] });
      toast.success('Job description deleted.');
    },
  });

  const handleGenerateEmail = (jd) => {
    navigate('/email-automation', { state: { jd } });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Job Descriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize target roles and hiring manager details for one-click personalized outreach.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Save New JD</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : jds.length === 0 ? (
        <div className="card-rounded p-12 text-center max-w-lg mx-auto space-y-4 bg-white border border-orange-100">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Job Descriptions Saved
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Keep track of open jobs. Save job descriptions here to generate targeted pitches whenever you're ready.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Save First JD</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jds.map((jd) => (
            <div
              key={jd._id}
              className="card-rounded p-6 flex flex-col justify-between bg-white border border-orange-100 hover:border-orange-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 border border-orange-200">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {jd.company}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{jd.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(jd)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-orange-50 transition-colors"
                      title="Edit JD"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(jd._id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete JD"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {jd.recipientName && (
                  <div className="mt-3 text-xs text-slate-600">
                    <strong>Hiring Lead:</strong> {jd.recipientName}{' '}
                    {jd.recipientEmail ? `(${jd.recipientEmail})` : ''}
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed">
                    {jd.content}
                  </p>
                </div>
              </div>

              {/* Action: Generate Email Button */}
              <div className="mt-6 pt-4 border-t border-orange-100 flex items-center justify-between">
                {jd.jobUrl ? (
                  <a
                    href={jd.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-orange-600 flex items-center space-x-1"
                  >
                    <span>Job Post</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => handleGenerateEmail(jd)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Email</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit JD Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-xl max-h-[90vh] p-6 bg-white flex flex-col space-y-4 border border-orange-100">
            <h3 className="font-bold text-slate-900 text-lg">
              {editingJd ? 'Edit Job Description' : 'Save Job Description'}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Company Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anthropic"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full input-rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Role Title:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full input-rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Job Posting URL (Optional):
                </label>
                <input
                  type="url"
                  placeholder="https://company.com/careers/role"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="w-full input-rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Recipient / Lead Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Michael Scott"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full input-rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Recipient Email:
                  </label>
                  <input
                    type="email"
                    placeholder="michael@company.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full input-rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Job Description Content (Plain text):
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste the job description or role requirements..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full input-rounded text-xs font-sans leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-orange-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !company.trim() || !title.trim() || !content.trim()}
                className="btn-primary text-xs"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save JD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Job Description"
        message="Are you sure you want to delete this job description? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
