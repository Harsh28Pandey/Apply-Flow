import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Bookmark,
  PlusCircle,
  FileSignature,
  Edit2,
  Trash2,
  Save,
  Copy,
  Send,
  Check,
  Search,
  Sparkles,
  Briefcase,
  UserCheck,
  Coffee,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { CardSkeleton } from '../components/Skeleton';

const PREDEFINED_TEMPLATES = [
  {
    id: 'executive-mern-cover-letter',
    category: 'Job Application & HR',
    badge: 'Popular',
    name: 'Executive MERN Cover Letter',
    role: 'Full Stack Developer',
    subject: 'Application for Full Stack Developer at {{company}} - {{candidate_name}}',
    body: `Dear Hiring Manager,

I hope this email finds you well.

I’m excited to apply for the **Full Stack Developer** role at **{{company}}**. I’m a B.Tech CSE student (CGPA 8.63) with hands-on MERN stack experience, and I enjoy building complete features from the database to the user interface.

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

Best regards,
Alex Mercer`,
  },
  {
    id: 'formal-recruiter-application',
    category: 'Job Application & HR',
    badge: 'Standard',
    name: 'Standard Recruiter Job Application',
    role: 'Software Engineer',
    subject: 'Application for {{role}} - {{candidate_name}}',
    body: `Dear Hiring Team,

I am writing to express my strong interest in the **{{role}}** position at **{{company}}**. With extensive hands-on experience in full-stack architecture and shipping production features, I am eager to contribute to your engineering milestones.

In my previous roles, I have consistently focused on delivering scalable, reliable systems:
- **Engineered and launched** core platform features, improving overall application throughput by 35%.
- **Refactored distributed data layers**, eliminating latency bottlenecks and enhancing customer satisfaction.
- **Collaborated across design and product** to deliver intuitive, accessible user interfaces.

I have attached my resume for your review and would welcome the opportunity to discuss how my qualifications align with your team's goals.

Thank you for your time and consideration.

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'founder-direct-pitch',
    category: 'Founder & Executive',
    badge: 'High Impact',
    name: 'High-Conviction Founder & CEO Outreach',
    role: 'Full Stack Engineer',
    subject: '{{candidate_name}} <> {{company}}: {{role}} & Engineering Velocity',
    body: `Hi {{recipient_name}},

I've been following {{company}}'s recent product launches and was impressed by your team's rapid iteration speed in this space.

I'm an engineer who thrives in high-ownership, 0-to-1 environments. Most recently, I architected and shipped end-to-end full stack platforms handling thousands of transactions with high reliability and sub-second latency.

I would love to help {{company}} accelerate its upcoming product roadmap. Do you have 10 minutes next Tuesday or Wednesday morning for a quick intro chat?

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'tech-lead-pitch',
    category: 'Tech Lead & Pitch',
    badge: 'Technical',
    name: 'Tech Lead & Engineering Manager Teardown',
    role: 'Senior Developer',
    subject: 'Quick question re: {{role}} architecture at {{company}}',
    body: `Hi {{recipient_name}},

I noticed {{company}} is scaling out its engineering infrastructure for the **{{role}}** opening.

Over the past few years, I've specialized in backend reliability and API performance—most recently scaling a distributed queue handling 15,000 requests/sec with 99.99% uptime and zero message loss.

I put together a few thoughts on how I could hit the ground running with your team. Would you be open to a 10-minute technical sync next week?

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'sick-leave-application',
    category: 'Workplace & Leave',
    badge: 'Formal',
    name: 'Official Sick Leave Application',
    role: 'Employee',
    subject: 'Sick Leave Application - {{candidate_name}} - {{date}}',
    body: `Dear {{recipient_name}},

I am writing to inform you that I am unwell and unable to attend work starting today, {{date}}. My doctor has advised rest for medical recovery.

I have ensured that urgent tasks are documented, and I will be reachable via email for critical emergencies once I am feeling better. My colleague has kindly agreed to cover urgent operational inquiries in my absence.

I anticipate returning to work on [Expected Return Date]. I will keep you updated should there be any change in my health condition.

Thank you for your understanding.

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'holiday-leave-application',
    category: 'Workplace & Leave',
    badge: 'Formal',
    name: 'Annual Holiday & Vacation Leave Request',
    role: 'Employee',
    subject: 'Annual Vacation / Holiday Leave Request - {{candidate_name}}',
    body: `Dear {{recipient_name}},

I would like to request annual leave starting from [Start Date] to [End Date], resuming duties on [Return Date].

Before taking leave, I will ensure all ongoing sprint deliverables are completed or handed over with clear documentation. I have briefed [Colleague Name], who has agreed to cover any critical inquiries during this period.

Please let me know if this schedule works for the team. Thank you for considering my request.

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'referral-outreach',
    category: 'Referral & Follow-Up',
    badge: 'Networking',
    name: 'Employee Referral Request',
    role: 'Candidate',
    subject: 'Referral Request for {{role}} opening at {{company}} - {{candidate_name}}',
    body: `Hi {{recipient_name}},

I hope you're having a great week!

I noticed an opening for **{{role}}** at **{{company}}** (Job ID: [Job Link or ID]). Given your experience at {{company}}, I wanted to reach out and see if you would be open to referring me for this position.

Brief background: I have hands-on experience building full-stack applications with React, Node.js, and MongoDB, with a track record of optimizing data latency and shipping scalable features.

My resume is attached for your quick reference. Thank you so much for your time and guidance!

Best regards,
{{candidate_name}}`,
  },
  {
    id: 'post-interview-thank-you',
    category: 'Referral & Follow-Up',
    badge: 'Follow-Up',
    name: 'Post-Interview Thank You & Next Steps',
    role: 'Candidate',
    subject: 'Thank you - Interview for {{role}} at {{company}}',
    body: `Hi {{recipient_name}},

Thank you for taking the time to speak with me today about the **{{role}}** role at **{{company}}**.

I truly enjoyed learning more about your engineering team's approach to technical challenges. Our discussion further confirmed my excitement about contributing to {{company}}'s mission and bringing my full-stack expertise to your product roadmap.

Please let me know if you need any additional information or work samples from my side. I look forward to hearing about the next steps.

Best regards,
{{candidate_name}}`,
  },
];

export default function TemplatesSignature() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('predefined');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');

  const [signatureText, setSignatureText] = useState('');
  const [isSigInitialized, setIsSigInitialized] = useState(false);

  const { data: templates = [], isLoading: isTplLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data.templates;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings;
    },
  });

  React.useEffect(() => {
    if (settings?.branding?.defaultSignature && !isSigInitialized) {
      setSignatureText(settings.branding.defaultSignature);
      setIsSigInitialized(true);
    }
  }, [settings, isSigInitialized]);

  const saveSignatureMutation = useMutation({
    mutationFn: async () => {
      await api.put('/settings', {
        branding: { defaultSignature: signatureText },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Signature saved! Will be appended verbatim to all emails.');
    },
    onError: () => toast.error('Failed to save signature.'),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate._id}`, {
          name: tplName,
          subject: tplSubject,
          body: tplBody,
        });
      } else {
        await api.post('/templates', {
          name: tplName,
          subject: tplSubject,
          body: tplBody,
        });
      }
    },
    onSuccess: () => {
      setIsAddTemplateOpen(false);
      setEditingTemplate(null);
      setTplName('');
      setTplSubject('');
      setTplBody('');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template saved successfully.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted.');
    },
  });

  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setTplName(t.name);
    setTplSubject(t.subject);
    setTplBody(t.body);
    setIsAddTemplateOpen(true);
  };

  const handleCopyTemplate = (tpl) => {
    const textToCopy = `Subject: ${tpl.subject}\n\n${tpl.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(tpl.id || tpl._id);
    toast.success('Copied template to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUseInAutomation = (tpl) => {
    navigate('/email-automation', {
      state: {
        prefillSubject: tpl.subject,
        prefillBody: tpl.body,
        prefillRole: tpl.role || '',
      },
    });
    toast.success('Loaded template into Email Automation workspace!');
  };

  const categories = [
    'All',
    'Job Application & HR',
    'Founder & Executive',
    'Tech Lead & Pitch',
    'Workplace & Leave',
    'Referral & Follow-Up',
  ];

  const filteredPredefined = PREDEFINED_TEMPLATES.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-soft">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Templates & Signatures
            </h1>
            <span className="badge-orange">Library</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse battle-tested email templates, manage custom templates, and customize your candidate signature.
          </p>
        </div>

        {activeTab === 'custom' && (
          <button
            onClick={() => {
              setEditingTemplate(null);
              setTplName('');
              setTplSubject('');
              setTplBody('');
              setIsAddTemplateOpen(true);
            }}
            className="btn-primary flex items-center space-x-2 shadow-md shadow-orange-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Custom Template</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-orange-100 bg-white rounded-2xl p-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('predefined')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'predefined'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-orange-600'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Predefined Email Library ({PREDEFINED_TEMPLATES.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'custom'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-orange-600'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>My Custom Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('signature')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'signature'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-orange-600'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Candidate Signature Block</span>
        </button>
      </div>

      {activeTab === 'predefined' && (
        <div className="space-y-5">
          <div className="card-rounded p-4 bg-white border border-orange-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates by role, topic, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full input-rounded pl-10 text-xs focus:border-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                      : 'bg-orange-50/60 text-slate-600 hover:text-orange-600 border border-orange-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPredefined.map((tpl) => (
              <div
                key={tpl.id}
                className="card-rounded p-6 bg-white border border-orange-100 hover:border-orange-300 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          {tpl.category}
                        </span>
                        {tpl.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {tpl.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {tpl.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-orange-50/40 border border-orange-100 text-xs">
                    <span className="font-bold text-slate-700">Subject: </span>
                    <span className="font-medium text-orange-950 font-sans">{tpl.subject}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-orange-100/80 text-xs text-slate-700 font-sans leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {tpl.body}
                  </div>
                </div>

                <div className="pt-2 border-t border-orange-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(tpl)}
                    className="btn-outline text-xs flex items-center space-x-1.5 py-1.5 px-3"
                  >
                    {copiedId === tpl.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-orange-600" />
                        <span>Copy Template</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUseInAutomation(tpl)}
                    className="btn-primary text-xs flex items-center space-x-1.5 py-1.5 px-4"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Use in Automation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400">
              Supports dynamic variables: <code>{'{{recipient_name}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{role}}'}</code>
            </span>
          </div>

          {isTplLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="card-rounded p-12 text-center text-xs text-slate-400 bg-white border border-orange-100 space-y-3">
              <Bookmark className="w-8 h-8 mx-auto text-orange-300" />
              <p className="font-semibold text-slate-700 text-sm">No custom templates created yet.</p>
              <p>Save recurring cold emails, cover letters, or follow-ups to reuse them anytime.</p>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setTplName('');
                  setTplSubject('');
                  setTplBody('');
                  setIsAddTemplateOpen(true);
                }}
                className="btn-primary text-xs inline-flex items-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Your First Template</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl._id}
                  className="card-rounded p-6 flex flex-col justify-between bg-white border border-orange-100 hover:border-orange-300 transition-all space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-slate-900 text-base">
                        {tpl.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(tpl)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-orange-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(tpl._id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 p-2 rounded-xl bg-orange-50/40 border border-orange-100">
                      Subject: {tpl.subject}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                      {tpl.body}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-orange-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(tpl)}
                      className="btn-outline text-xs py-1.5 px-3 flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5 text-orange-600" />
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseInAutomation(tpl)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'signature' && (
        <div className="card-rounded p-6 space-y-4 bg-white border border-orange-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  Candidate Signature Block (Markdown)
                </h2>
                <p className="text-xs text-slate-400">
                  This signature is protected and appended verbatim to all emails and cover letters.
                </p>
              </div>
            </div>

            <button
              onClick={() => saveSignatureMutation.mutate()}
              disabled={saveSignatureMutation.isPending}
              className="btn-primary text-xs flex items-center space-x-1.5 py-2 px-5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSignatureMutation.isPending ? 'Saving...' : 'Save Signature'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Edit Signature (Markdown):
              </label>
              <textarea
                rows={8}
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder={`Best regards,\nAlex Mercer\nFull Stack Developer\nLinkedIn: https://linkedin.com/in/alex-mercer\nGitHub: https://github.com/alex-mercer`}
                className="w-full input-rounded text-xs font-mono leading-relaxed resize-y focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Live Preview:
              </label>
              <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-orange-100 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap min-h-[170px]">
                {signatureText || 'No signature configured yet.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="card-rounded w-full max-w-lg p-6 bg-white space-y-4 border border-orange-100 shadow-soft-lg">
            <h3 className="font-bold text-slate-900 text-lg">
              {editingTemplate ? 'Edit Template' : 'New Custom Template'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Template Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Lead Cold Outreach"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="w-full input-rounded text-xs focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Subject Line:
                </label>
                <input
                  type="text"
                  placeholder="Application for {{role}} at {{company}} - {{candidate_name}}"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  className="w-full input-rounded text-xs focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Body (Markdown):
                </label>
                <textarea
                  rows={8}
                  placeholder={`Dear Hiring Manager,\n\nI hope this email finds you well. I’m excited to apply for the {{role}} position at {{company}}...`}
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  className="w-full input-rounded text-xs font-sans leading-relaxed resize-y focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-orange-100">
              <button
                type="button"
                onClick={() => setIsAddTemplateOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveTemplateMutation.mutate()}
                disabled={saveTemplateMutation.isPending || !tplName.trim() || !tplSubject.trim() || !tplBody.trim()}
                className="btn-primary text-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Template"
        message="Are you sure you want to delete this custom template? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}