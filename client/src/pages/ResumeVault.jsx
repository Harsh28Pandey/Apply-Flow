import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  FileText,
  UploadCloud,
  Download,
  Star,
  Trash2,
  Edit2,
  Eye,
  FileCheck,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { CardSkeleton } from '../components/Skeleton';

export default function ResumeVault() {
  const queryClient = useQueryClient();
  const [previewResume, setPreviewResume] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await api.get('/resumes');
      return res.data.resumes;
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('customName', file.name.replace(/\.[^/.]+$/, ''));

    const uploadToast = toast.loading('Validating %PDF- magic bytes and parsing text...');
    try {
      await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resume added to vault!', { id: uploadToast });
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to upload PDF.', { id: uploadToast });
    }
  };

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/resumes/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Default resume updated.');
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, customName }) => {
      await api.patch(`/resumes/${id}/rename`, { customName });
    },
    onSuccess: () => {
      setRenameTarget(null);
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume renamed.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/resumes/${id}`);
    },
    onSuccess: () => {
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted.');
    },
  });

  const handleDownload = async (resume) => {
    try {
      const res = await api.get(`/resumes/${resume.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${resume.customName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Resume Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and organize tailored PDF resumes. Apply Flow extracts text server-side for accurate grounding.
          </p>
        </div>

        <label className="btn-primary flex items-center space-x-2 cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>Upload PDF Resume</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Grid of Resumes */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="card-rounded p-12 text-center max-w-lg mx-auto space-y-4 bg-white border border-orange-100">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Resumes Uploaded Yet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your first master PDF resume. We parse its text server-side so Groq AI can reference your verified skills and achievements.
          </p>
          <label className="btn-primary inline-flex items-center space-x-2 cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Master PDF</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className={`card-rounded p-6 flex flex-col justify-between bg-white border ${
                resume.isDefault
                  ? 'border-orange-400 ring-2 ring-orange-500/15'
                  : 'border-orange-100 hover:border-orange-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 border border-orange-200">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="flex items-center space-x-1">
                    {resume.isDefault ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                        <span>Default</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefaultMutation.mutate(resume.id)}
                        title="Set as Default"
                        className="text-slate-400 hover:text-amber-500 p-1.5 rounded-xl hover:bg-orange-50 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {resume.customName}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {resume.originalName} • {(resume.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Status indicator */}
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span>Text extracted ({resume.extractedText?.length || 0} chars)</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-orange-100 flex items-center justify-between">
                <button
                  onClick={() => setPreviewResume(resume)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Text</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setRenameTarget(resume);
                      setNewName(resume.customName);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-orange-50 transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(resume)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    title="Download Original PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(resume.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Extracted Text Modal */}
      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-2xl max-h-[85vh] p-6 bg-white flex flex-col space-y-4 border border-orange-100">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Extracted Text: {previewResume.customName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewResume(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                {previewResume.extractedText || 'No text extracted.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-sm p-6 bg-white space-y-4 border border-orange-100">
            <h3 className="font-bold text-slate-900 text-base">
              Rename Resume
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full input-rounded text-sm"
              placeholder="e.g. Full-Stack Lead"
              autoFocus
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => renameMutation.mutate({ id: renameTarget.id, customName: newName })}
                disabled={renameMutation.isPending || !newName.trim()}
                className="btn-primary text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Resume"
        message="Are you sure you want to delete this resume from your vault? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
