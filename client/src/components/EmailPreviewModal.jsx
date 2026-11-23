import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, FileText, X, Paperclip } from 'lucide-react';
import { markdownToSafeHtml } from '../utils/markdownToHtml';

export default function EmailPreviewModal({
  isOpen,
  onClose,
  subject,
  bodyText,
  to,
  recipientName,
  attachmentName,
  hasAttachment,
  company,
  role,
}) {
  const [viewMode, setViewMode] = useState('desktop');

  if (!isOpen) return null;

  const htmlContent = markdownToSafeHtml(bodyText || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="card-rounded w-full max-w-3xl max-h-[92vh] flex flex-col bg-white shadow-soft-lg overflow-hidden border border-orange-100"
      >
        <div className="px-6 py-3.5 border-b border-orange-100 flex items-center justify-between bg-orange-50/40">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-900 text-sm">
              Live Preview
            </span>
            <div className="bg-white p-1 rounded-2xl flex space-x-1 border border-orange-100">
              <button
                onClick={() => setViewMode('desktop')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-orange-600'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Email (Desktop)</span>
              </button>
              <button
                onClick={() => setViewMode('cover-letter')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all ${
                  viewMode === 'cover-letter'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-orange-600'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Cover Letter Document</span>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-orange-600'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-orange-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6] flex justify-center">
          {viewMode === 'cover-letter' ? (
            <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-orange-100 space-y-6 text-slate-800 font-sans">
              <div className="border-b border-orange-100 pb-4 flex justify-between items-start text-xs text-slate-500">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Application Document
                  </h2>
                  <p className="mt-0.5">
                    {role ? `Position: ${role}` : 'Job Application'} {company ? `• ${company}` : ''}
                  </p>
                </div>
                <div className="text-right font-mono">
                  {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {to && (
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="font-bold text-slate-800">Attention: {recipientName || 'Hiring Team'}</div>
                  {company && <div>{company}</div>}
                  <div className="font-mono text-slate-500">{to}</div>
                </div>
              )}

              <div
                className="pt-2 text-sm leading-relaxed text-slate-800 font-sans"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          ) : (
            <div
              className={`transition-all duration-300 w-full bg-white rounded-3xl shadow-sm border border-orange-100/90 overflow-hidden flex flex-col ${
                viewMode === 'mobile' ? 'max-w-[380px]' : 'max-w-2xl'
              }`}
            >
              <div className="p-5 border-b border-orange-100/70 bg-orange-50/20 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span>
                    <strong className="text-slate-700">To:</strong>{' '}
                    {recipientName ? `"${recipientName}" <${to || 'recipient@company.com'}>` : to || 'recipient@company.com'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Preview</span>
                </div>
                <div className="text-slate-900 font-bold text-sm">
                  {subject || 'No subject'}
                </div>
                {hasAttachment && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-200">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{attachmentName || 'Resume.pdf'} (Attached)</span>
                  </div>
                )}
              </div>

              <div
                className="p-6 text-sm text-slate-800 leading-relaxed font-sans overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
