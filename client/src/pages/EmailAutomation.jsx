import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, NavLink } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Paperclip,
  Send,
  Clock,
  Save,
  Eye,
  History,
  RotateCcw,
  AlertCircle,
  BookmarkPlus,
  Mail,
  Zap,
  Bold,
  Italic,
  Link,
  List,
  Wand2,
  ChevronDown,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SpamRiskHint from '../components/SpamRiskHint';
import EmailPreviewModal from '../components/EmailPreviewModal';
import ConfirmModal from '../components/ConfirmModal';
import { markdownToSafeHtml } from '../utils/markdownToHtml';

export default function EmailAutomation() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();
  const bodyTextareaRef = useRef(null);

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isEditingResumeText, setIsEditingResumeText] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [activeStyle, setActiveStyle] = useState('initial');
  const [activeTab, setActiveTab] = useState('editor');
  const [versions, setVersions] = useState([]);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [draftId, setDraftId] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuickKeyModalOpen, setIsQuickKeyModalOpen] = useState(false);
  const [quickGroqKey, setQuickGroqKey] = useState('');

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await api.get('/resumes');
      return res.data.resumes;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings;
    },
  });

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const defaultResume = resumes.find((r) => r.isDefault) || resumes[0];
      setSelectedResumeId(defaultResume.id);
      setResumeText(defaultResume.extractedText);
      setUploadedFileName(defaultResume.customName);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    if (location.state?.jd) {
      const jd = location.state.jd;
      setJobDescription(jd.content || '');
      setCompany(jd.company || '');
      setRole(jd.title || '');
      setJobUrl(jd.jobUrl || '');
      setRecipientName(jd.recipientName || '');
      setRecipientPosition(jd.recipientPosition || '');
      setRecipientEmail(jd.recipientEmail || '');
      toast.success(`Preloaded Job Description for ${jd.company}`);
    }
    if (location.state?.prefillSubject) {
      setSubject(location.state.prefillSubject);
    }
    if (location.state?.prefillBody) {
      setBody(location.state.prefillBody);
      toast.success('Loaded template into editor.');
    }
    if (location.state?.prefillRole) {
      setRole(location.state.prefillRole);
    }
  }, [location.state]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('customName', file.name.replace(/\.[^/.]+$/, ''));

    const uploadToast = toast.loading('Validating %PDF- magic bytes and extracting text...');
    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Resume uploaded & parsed successfully!', { id: uploadToast });
      queryClient.invalidateQueries({ queryKey: ['resumes'] });

      setSelectedResumeId(res.data.resume.id);
      setResumeText(res.data.resume.extractedText);
      setUploadedFileName(res.data.resume.customName);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to upload PDF.', { id: uploadToast });
    }
  };

  const handleSelectResume = (id) => {
    setSelectedResumeId(id);
    const selected = resumes.find((r) => r.id === id);
    if (selected) {
      setResumeText(selected.extractedText);
      setUploadedFileName(selected.customName);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emails/generate', {
        resumeId: selectedResumeId,
        resumeText,
        jobDescription,
        recipientName,
        recipientPosition,
        company,
        hasAttachment,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
      setActiveStyle('initial');

      setVersions((prev) => [
        {
          subject: data.subject,
          body: data.body,
          style: 'initial_generation',
          timestamp: new Date(),
        },
        ...prev,
      ]);

      toast.success('Email personalized & generated with AI!');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Generation failed.';
      if (err.response?.data?.error?.code === 'MISSING_API_KEY') {
        setIsQuickKeyModalOpen(true);
      }
      toast.error(msg);
    },
  });

  const refineMutation = useMutation({
    mutationFn: async (style) => {
      const res = await api.post('/emails/refine', {
        currentSubject: subject,
        currentBody: body,
        style,
        resumeId: selectedResumeId,
        resumeText,
        jobDescription,
        recipientName,
        company,
        role,
      });
      return { ...res.data, style };
    },
    onSuccess: (data) => {
      setSubject(data.subject);
      setBody(data.body);
      setActiveStyle(data.style);

      setVersions((prev) => [
        {
          subject: data.subject,
          body: data.body,
          style: data.style,
          timestamp: new Date(),
        },
        ...prev,
      ]);

      toast.success(`Refined using style: ${data.style.replace('_', ' ')}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Refinement failed.');
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        to: recipientEmail,
        recipientName,
        company,
        role,
        subject,
        body,
        resumeId: selectedResumeId,
        hasAttachment,
      };

      if (draftId) {
        const res = await api.put(`/emails/drafts/${draftId}`, payload);
        return res.data.email;
      } else {
        const res = await api.post('/emails/drafts', payload);
        return res.data.email;
      }
    },
    onSuccess: (saved) => {
      setDraftId(saved._id);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Draft saved successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save draft.');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emails/send', {
        emailId: draftId,
        to: recipientEmail,
        recipientName,
        company,
        role,
        subject,
        body,
        resumeId: selectedResumeId,
        hasAttachment,
      });
      return res.data;
    },
    onSuccess: () => {
      setIsConfirmSendOpen(false);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      toast.success('Email sent successfully via your SMTP server!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Sending failed. Check SMTP configuration.');
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emails/schedule', {
        emailId: draftId,
        to: recipientEmail,
        recipientName,
        company,
        role,
        subject,
        body,
        resumeId: selectedResumeId,
        hasAttachment,
        scheduledAt: new Date(scheduleDateTime).toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      setIsScheduleOpen(false);
      toast.success('Email queued for scheduled delivery!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to schedule email.');
    },
  });

  const saveJdMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/jds', {
        title: role || 'Target Role',
        company: company || 'Target Company',
        jobUrl,
        recipientName,
        recipientPosition,
        recipientEmail,
        content: jobDescription,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jds'] });
      toast.success('Job Description saved to your JD Vault!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save JD.');
    },
  });

  const handleSaveQuickGroqKey = async () => {
    if (!quickGroqKey.trim()) return;
    try {
      await api.put('/settings', {
        ai: {
          groqApiKey: quickGroqKey.trim(),
          modelName: settings?.ai?.modelName || 'openai/gpt-oss-20b',
        },
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsQuickKeyModalOpen(false);
      setQuickGroqKey('');
      toast.success('Groq API Key saved! You can now generate emails.');
    } catch {
      toast.error('Failed to save Groq key.');
    }
  };

  const applyTextWrap = (prefix, suffix = prefix) => {
    const el = bodyTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.substring(start, end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}text${suffix}`;
    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  const insertLink = () => {
    applyTextWrap('[', '](https://)');
  };

  const insertBullet = () => {
    const el = bodyTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const snippet = '\n- ';
    const newBody = body.substring(0, start) + snippet + body.substring(start);
    setBody(newBody);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  const tidyFormatting = () => {
    if (!body.trim()) return;
    const cleaned = body
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setBody(cleaned);
    toast.success('Tidied email paragraph spacing & alignment.');
  };

  const insertSignature = () => {
    const sig = settings?.branding?.defaultSignature || `Best regards,\n${user?.name || 'Alex Mercer'}`;
    if (body.includes(sig)) {
      toast('Signature is already included.');
      return;
    }
    setBody((prev) => `${prev.trim()}\n\n${sig}`);
    toast.success('Signature appended.');
  };

  const applySubjectFormat = (formatType) => {
    const candidateName = user?.name || 'Alex Mercer';
    const targetRole = role || 'Full Stack Developer';
    const targetCompany = company || 'Tech Team';

    if (formatType === 'role-company-name') {
      setSubject(`Application for ${targetRole} at ${targetCompany} - ${candidateName}`);
    } else if (formatType === 'role-name') {
      setSubject(`Application for ${targetRole} - ${candidateName}`);
    } else if (formatType === 'founder-velocity') {
      setSubject(`${candidateName} <> ${targetCompany}: ${targetRole} & Engineering Velocity`);
    } else if (formatType === 'question-role') {
      setSubject(`Quick question regarding ${targetRole} at ${targetCompany} - ${candidateName}`);
    }
    toast.success('Updated subject line format.');
  };

  const loadFormatTemplate = (formatType) => {
    const salutation = recipientName ? `Dear ${recipientName},` : 'Dear Hiring Manager,';
    const candidateName = user?.name || 'Alex Mercer';
    const companyName = company || 'your company';
    const roleTitle = role || 'Full Stack Developer';
    const userSig = settings?.branding?.defaultSignature || `Best regards,\n${candidateName}`;

    if (formatType === 'cover-letter') {
      const template = `${salutation}

I hope this email finds you well.

I’m excited to apply for the **${roleTitle}** role at **${companyName}**. I’m a B.Tech CSE student (CGPA 8.63) with hands-on MERN stack experience, and I enjoy building complete features from the database to the user interface.

**Experience:** As a **Full Stack MERN Developer Intern at ModelSuite.ai (Remote)**, I worked on a Talent Management Portal used to track the activities of 50+ employees. By optimizing both client-side and server-side logic, I improved data retrieval times by **20%**. I also took part in code reviews and followed ESLint standards.

**Projects:**
- **Interview Buddy** is a role-based interview preparation platform. It uses generative AI to build question sets for a candidate’s role and experience level. It then evaluates their answers and gives real-time feedback with under 200ms latency. *(React, Node.js, Express.js, MongoDB, Tailwind CSS)*
- **Collab Flow** is a collaborative team workspace and project management platform. I designed its RESTful API with a modular MVC structure and secured it with JWT authentication and bcrypt password hashing. I also added OTP email verification (Nodemailer), Yup validation and strict CORS handling. *(React.js, Node.js, Express.js, MongoDB)*
- **Orbit OS** is a personal productivity platform that brings task management, project organization and personal planning into one workspace. I built a modular React.js frontend with reusable components, and RESTful APIs with Node.js, Express.js and MongoDB (Mongoose). User-specific data is protected behind authentication. *(React.js, Node.js, Express.js, MongoDB, Tailwind CSS)*

**Skills:**
- **Frontend:** React.js, JavaScript (ES6+), TypeScript, Tailwind CSS, HTML5, CSS3
- **Backend:** Node.js, Express.js, RESTful APIs, Authentication & Authorization
- **Databases:** MongoDB, SQL, MySQL, Redis
- **Tools:** Git, GitHub, Docker, Postman
- **Fundamentals:** DSA, OOP (750+ LeetCode problems solved)

My resume is attached. You can also see my work here:
- **LinkedIn:** https://linkedin.com/in/alex-mercer
- **GitHub:** https://github.com/alex-mercer
- **Portfolio:** https://alexmercer.dev

I’d welcome the chance to discuss how I can contribute to your engineering team. Thank you for your time and consideration.

${userSig}`;
      setBody(template);
      setSubject(`Application for ${roleTitle} at ${companyName} - ${candidateName}`);
      setActiveStyle('application');
      setHasAttachment(true);
      toast.success('Loaded Executive MERN Cover Letter Format.');
    } else if (formatType === 'founder') {
      const template = `Hi ${recipientName || 'there'},

I've been following ${companyName}'s product trajectory and was impressed by your team's execution speed.

I'm a full-stack engineer who thrives in high-ownership environments. Recently, I built distributed full-stack applications with React, Node.js, and MongoDB that handle real-time traffic under 200ms latency.

I would love to help ${companyName} hit its upcoming engineering and feature milestones. Do you have 10 minutes next Tuesday or Wednesday for a brief intro call?

${userSig}`;
      setBody(template);
      setSubject(`${candidateName} <> ${companyName}: ${roleTitle} & Engineering Velocity`);
      setActiveStyle('founder');
      toast.success('Loaded High-Conviction Founder Pitch.');
    } else if (formatType === 'cold-outreach') {
      const template = `Hi ${recipientName || 'there'},

I noticed ${companyName}'s recent focus on expanding its engineering capabilities for the **${roleTitle}** opening.

Over the past few years, I have specialized in building robust full-stack architectures—most recently **scaling data throughput by 4x** and accelerating release cycles by 50%.

I would love to share a few quick ideas on how I could help ${companyName} hit its upcoming milestones. Do you have 10 minutes next Tuesday for a brief intro call?

${userSig}`;
      setBody(template);
      setSubject(`Quick question regarding ${roleTitle} at ${companyName} - ${candidateName}`);
      setActiveStyle('cold_outreach');
      toast.success('Loaded Creative Cold Hook.');
    } else if (formatType === 'sick-leave') {
      const template = `Dear ${recipientName || 'Manager'},

I am writing to inform you that I am unwell and unable to attend work starting today. My doctor has advised rest for medical recovery.

I have documented urgent pending tasks, and my teammate has kindly agreed to cover critical operational inquiries in my absence. I will monitor email periodically once feeling better.

Thank you for your understanding.

${userSig}`;
      setBody(template);
      setSubject(`Sick Leave Application - ${candidateName}`);
      toast.success('Loaded Sick Leave Template.');
    } else if (formatType === 'holiday-leave') {
      const template = `Dear ${recipientName || 'Manager'},

I would like to request annual leave starting from [Start Date] to [End Date], returning to work on [Return Date].

All deliverables scheduled for this sprint have been completed or handed over with clear documentation. I will be reachable for critical emergencies.

Thank you for considering my request.

${userSig}`;
      setBody(template);
      setSubject(`Annual Vacation / Holiday Leave Request - ${candidateName}`);
      toast.success('Loaded Holiday Leave Template.');
    }
  };

  const handleRestoreVersion = (v) => {
    setSubject(v.subject);
    setBody(v.body);
    setIsHistoryOpen(false);
    toast.success(`Restored draft from ${new Date(v.timestamp).toLocaleTimeString()}`);
  };

  const isGroqConfigured = !!settings?.ai?.groqApiKeyMasked;
  const isSmtpConfigured = !!settings?.smtp?.host && !!settings?.smtp?.fromAddress;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="card-rounded p-5 bg-white border border-orange-100 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-xl font-bold text-slate-900">
                  Email & Cover Letter Automation
                </h1>
                <span className="badge-orange">Outreach Workspace</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <span>From:</span>
                {isSmtpConfigured ? (
                  <span className="font-semibold text-slate-800 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                    {settings.smtp.fromName ? `"${settings.smtp.fromName}" <${settings.smtp.fromAddress}>` : settings.smtp.fromAddress}
                  </span>
                ) : (
                  <NavLink to="/settings" className="text-orange-600 font-semibold hover:underline">
                    Not configured yet (Set in Settings →)
                  </NavLink>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {isGroqConfigured ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800">
                <Zap className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                <span>Groq AI Ready ({settings.ai.modelName})</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsQuickKeyModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Groq API Key</span>
              </button>
            )}

            {versions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="btn-outline text-xs flex items-center space-x-1.5 py-1.5"
              >
                <History className="w-3.5 h-3.5 text-orange-600" />
                <span>History ({versions.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-orange-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              To Email (Recipient): <span className="text-orange-600">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. recruiter@company.com / hiring-manager@startup.io"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full input-rounded text-xs font-medium focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Recipient Name:
            </label>
            <input
              type="text"
              placeholder="e.g. Jessica Taylor"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full input-rounded text-xs font-medium focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="card-rounded p-6 space-y-4 bg-white border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs border border-orange-200">
                  1
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Select or Upload Resume (PDF Only)
                </h3>
              </div>

              {resumeText && (
                <button
                  type="button"
                  onClick={() => setIsEditingResumeText(!isEditingResumeText)}
                  className="text-xs text-orange-600 font-semibold hover:underline"
                >
                  {isEditingResumeText ? 'Hide Text' : 'Edit Parsed Text'}
                </button>
              )}
            </div>

            {resumes.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Choose Saved Resume:
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => handleSelectResume(e.target.value)}
                  className="w-full input-rounded text-xs bg-white focus:border-orange-500"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.customName} {r.isDefault ? '★ (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="border-2 border-dashed border-orange-200 hover:border-orange-400 rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-orange-50/20">
              <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-xs font-semibold text-slate-800">
                {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Drop PDF resume or click to upload'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                PDF only (Max 10MB) • Validates %PDF- header
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>

            {isEditingResumeText && (
              <div className="space-y-2 pt-2 border-t border-orange-100">
                <span className="text-xs font-medium text-slate-500 block">
                  Extracted Resume Content (used for grounding AI):
                </span>
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Extracted resume text..."
                  className="w-full input-rounded text-xs font-mono leading-relaxed resize-y focus:border-orange-500"
                />
              </div>
            )}
          </div>

          <div className="card-rounded p-6 space-y-4 bg-white border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs border border-orange-200">
                  2
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Job Description & Target Details
                </h3>
              </div>

              {jobDescription && (
                <button
                  type="button"
                  onClick={() => saveJdMutation.mutate()}
                  disabled={saveJdMutation.isPending}
                  className="text-xs text-orange-600 font-semibold hover:underline flex items-center space-x-1"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save JD</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Company Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. OpenAI"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full input-rounded text-xs focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Role Title:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Developer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full input-rounded text-xs focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Paste Job Description Text (Plain Text Only):
              </label>
              <textarea
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job responsibilities, requirements, and tech stack details here..."
                className="w-full input-rounded text-xs leading-relaxed resize-y focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100">
              <div className="flex items-center space-x-2.5">
                <Paperclip className="w-4 h-4 text-orange-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Attach Selected Resume PDF
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sent as: <strong>{settings?.branding?.attachmentFilename || 'Resume.pdf'}</strong>
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasAttachment}
                onChange={(e) => setHasAttachment(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
            </div>

            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !jobDescription || !resumeText}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 shadow-md shadow-orange-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {generateMutation.isPending ? 'Crafting High-Converting Application with Groq AI...' : 'Generate Personalized Email & Pitch'}
              </span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="card-rounded p-6 space-y-4 bg-white border border-orange-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs border border-orange-200">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Personalized Draft & Refinement
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Recruiter-friendly formatting with bullet points, bolding, and signature
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!body}
                  className="btn-outline text-xs flex items-center space-x-1.5 py-1.5 px-3"
                >
                  <Eye className="w-3.5 h-3.5 text-orange-600" />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending || !body}
                  className="btn-outline text-xs flex items-center space-x-1.5 py-1.5 px-3"
                >
                  <Save className="w-3.5 h-3.5 text-orange-600" />
                  <span>Save Draft</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-orange-950">
                  Refine with Proven Outreach Styles:
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Signature block is preserved
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => refineMutation.mutate('application')}
                  disabled={refineMutation.isPending || !body}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 ${
                    activeStyle === 'application'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                      : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-500 hover:text-orange-600'
                  }`}
                  title="Evidence-led structured cover letter with formal greeting, experience, projects, skills, and signoff."
                >
                  📄 Formal Application
                </button>
                <button
                  type="button"
                  onClick={() => refineMutation.mutate('founder')}
                  disabled={refineMutation.isPending || !body}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 ${
                    activeStyle === 'founder'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                      : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-500 hover:text-orange-600'
                  }`}
                  title="Direct, high-conviction outreach to founders and executives."
                >
                  🚀 Founder Pitch
                </button>
                <button
                  type="button"
                  onClick={() => refineMutation.mutate('project')}
                  disabled={refineMutation.isPending || !body}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 ${
                    activeStyle === 'project'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                      : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-500 hover:text-orange-600'
                  }`}
                  title="Connects specific JD challenges directly to quantified resume project outcomes."
                >
                  🎯 Project-Focused
                </button>
                <button
                  type="button"
                  onClick={() => refineMutation.mutate('cold_outreach')}
                  disabled={refineMutation.isPending || !body}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 ${
                    activeStyle === 'cold_outreach'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                      : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-500 hover:text-orange-600'
                  }`}
                  title="Concise, punchy outreach with a personalized hook and a fresh high-converting subject line."
                >
                  ⚡ Creative Cold Hook
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-orange-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Load Preset:</span>
                <button
                  type="button"
                  onClick={() => loadFormatTemplate('cover-letter')}
                  className="px-2.5 py-1 rounded-xl bg-white border border-orange-200 text-slate-700 hover:text-orange-600 font-semibold shadow-xs"
                >
                  Executive Cover Letter
                </button>
                <button
                  type="button"
                  onClick={() => loadFormatTemplate('founder')}
                  className="px-2.5 py-1 rounded-xl bg-white border border-orange-200 text-slate-700 hover:text-orange-600 font-semibold shadow-xs"
                >
                  Founder Pitch
                </button>
                <button
                  type="button"
                  onClick={() => loadFormatTemplate('cold-outreach')}
                  className="px-2.5 py-1 rounded-xl bg-white border border-orange-200 text-slate-700 hover:text-orange-600 font-semibold shadow-xs"
                >
                  Cold Hook
                </button>
                <button
                  type="button"
                  onClick={() => loadFormatTemplate('sick-leave')}
                  className="px-2 py-1 rounded-xl bg-white border border-orange-200 text-slate-600 hover:text-orange-600 font-medium"
                >
                  Sick Leave
                </button>
                <button
                  type="button"
                  onClick={() => loadFormatTemplate('holiday-leave')}
                  className="px-2 py-1 rounded-xl bg-white border border-orange-200 text-slate-600 hover:text-orange-600 font-medium"
                >
                  Holiday
                </button>
              </div>

              <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-orange-100">
                <button
                  type="button"
                  onClick={() => applyTextWrap('**')}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition-colors font-bold text-xs"
                  title="Bold (**text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyTextWrap('*')}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition-colors"
                  title="Italic (*text*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition-colors"
                  title="Add Link [text](https://...)"
                >
                  <Link className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={insertBullet}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition-colors"
                  title="Bullet Item"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={tidyFormatting}
                  className="px-2 py-1 rounded-lg hover:bg-orange-50 text-[11px] font-semibold text-orange-600 transition-colors flex items-center space-x-1"
                  title="Clean and tidy paragraph spacing"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Tidy</span>
                </button>
                <button
                  type="button"
                  onClick={insertSignature}
                  className="px-2 py-1 rounded-lg hover:bg-orange-50 text-[11px] font-semibold text-slate-700 hover:text-orange-600 transition-colors"
                  title="Append Signature"
                >
                  + Sign
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800">
                  Subject Line:
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => applySubjectFormat('role-company-name')}
                      className="text-[10px] text-orange-600 hover:underline font-semibold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200"
                    >
                      Application at Company - Name
                    </button>
                    <button
                      type="button"
                      onClick={() => applySubjectFormat('founder-velocity')}
                      className="text-[10px] text-orange-600 hover:underline font-semibold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200"
                    >
                      Name &lt;&gt; Company
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {subject.length}/200 chars
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Application for Full Stack Developer at Company - Alex Mercer"
                className="w-full input-rounded text-sm font-semibold focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'editor'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-orange-600 bg-white border border-orange-200'
                    }`}
                  >
                    ✏️ Markdown Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'preview'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-orange-600 bg-white border border-orange-200'
                    }`}
                  >
                    👁️ Formatted Live View
                  </button>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{body.length}/10,000 chars</span>
                </div>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  ref={bodyTextareaRef}
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="AI generated email draft will appear here. Click 'Executive Cover Letter' above to load a formatted MERN outreach framework..."
                  className="w-full input-rounded font-sans text-sm leading-relaxed resize-y p-4 bg-white focus:border-orange-500"
                />
              ) : (
                <div className="card-rounded p-6 bg-white border border-orange-200 min-h-[350px] max-h-[500px] overflow-y-auto text-sm leading-relaxed shadow-xs">
                  <div className="border-b border-orange-100 pb-3 mb-4 flex justify-between items-center text-xs text-slate-500">
                    <span className="font-bold text-slate-800">
                      Subject: {subject || 'No subject line'}
                    </span>
                    <span className="font-mono text-[10px]">Formatted Preview</span>
                  </div>
                  <div
                    className="text-slate-800 font-sans leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(body || 'Draft body is empty.') }}
                  />
                </div>
              )}
            </div>

            <SpamRiskHint text={body} />

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-orange-100">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                disabled={!subject || !body || !recipientEmail}
                className="w-full sm:w-auto btn-outline flex items-center justify-center space-x-2 text-xs"
              >
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Schedule Send</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmSendOpen(true)}
                disabled={!subject || !body || !recipientEmail}
                className="w-full sm:w-auto btn-primary flex items-center justify-center space-x-2 px-8 py-3 text-sm shadow-md shadow-orange-500/20"
              >
                <Send className="w-4 h-4" />
                <span>Review & Send Email Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <EmailPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subject={subject}
        bodyText={body}
        to={recipientEmail}
        recipientName={recipientName}
        attachmentName={settings?.branding?.attachmentFilename}
        hasAttachment={hasAttachment}
        company={company}
        role={role}
      />

      <ConfirmModal
        isOpen={isConfirmSendOpen}
        title="Confirm Email Dispatch"
        confirmText="Send Email Now"
        message={
          <div className="space-y-2 text-left">
            <p>You are about to send this personalized email:</p>
            <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200 text-xs space-y-1.5 text-slate-700">
              <div><strong>From:</strong> {settings?.smtp?.fromAddress || 'Default Account'}</div>
              <div><strong>To:</strong> <span className="font-bold text-orange-700">{recipientEmail}</span> ({recipientName || 'Hiring Team'})</div>
              <div><strong>Subject:</strong> {subject}</div>
              <div><strong>Attachment:</strong> {hasAttachment ? settings?.branding?.attachmentFilename || 'Resume.pdf' : 'None'}</div>
              <div><strong>Tracking:</strong> Open pixel & click redirect active</div>
            </div>
          </div>
        }
        isLoading={sendMutation.isPending}
        onConfirm={() => sendMutation.mutate()}
        onCancel={() => setIsConfirmSendOpen(false)}
      />

      {isQuickKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-md p-6 bg-white space-y-4 border border-orange-100 shadow-soft-lg">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
              <h3 className="text-base font-bold text-slate-900">
                Enter Groq API Key
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paste your Groq API key below to enable instant AI email generation. You can obtain a free key from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-orange-600 underline font-semibold">
                console.groq.com/keys
              </a>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Groq API Key (gsk_...):
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={quickGroqKey}
                onChange={(e) => setQuickGroqKey(e.target.value)}
                className="w-full input-rounded text-xs font-mono focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickKeyModalOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickGroqKey}
                disabled={!quickGroqKey}
                className="btn-primary text-xs"
              >
                Save & Enable AI
              </button>
            </div>
          </div>
        </div>
      )}

      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-md p-6 bg-white space-y-4 border border-orange-100 shadow-soft-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900">
                Schedule Email Delivery
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Choose the delivery date and time. Our background queue scheduler will send it automatically.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Date & Time:
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full input-rounded text-sm focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => scheduleMutation.mutate()}
                disabled={scheduleMutation.isPending || !scheduleDateTime}
                className="btn-primary text-xs"
              >
                {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-2xl max-h-[80vh] p-6 bg-white flex flex-col space-y-4 border border-orange-100 shadow-soft-lg">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Draft Version History
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {versions.map((v, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-orange-50/40 border border-orange-100 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-600 uppercase tracking-wider text-[10px]">
                      {v.style}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {v.subject}
                  </div>
                  <p className="text-slate-600 line-clamp-3 leading-relaxed">
                    {v.body}
                  </p>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(v)}
                      className="btn-secondary text-[11px] py-1 px-3 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore This Version</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}