# Apply Flow

> **Production-Ready, Multi-User AI Job Application & Smart Email Outreach SaaS with Real-Time Tracking**

---

## 1. Overview & Architecture

**Apply Flow** is a high-impact SaaS web application designed for job seekers, career switchers, and professionals. It enables users to upload their resume (PDF), paste plain-text job descriptions, generate grounded, evidence-led personalized outreach emails using Groq AI (`openai/gpt-oss-20b` or Llama 3), send emails directly through their own authenticated SMTP server, and track opens, link clicks, device user-agents, bot prefetches, and candidate replies in real time.

```
                           ┌───────────────────────────────┐
                           │      React 18 + Vite (SPA)    │
                           │  Tailwind • Orange & White    │
                           └───────────────┬───────────────┘
                                           │  REST + Tracking
                                           ▼
                           ┌───────────────────────────────┐
                           │       Express.js Server       │
                           │   JWT Auth • Crypto • Queue   │
                           └───────┬───────────────┬───────┘
                                   │               │
                  ┌────────────────┴────────┐      └─────────────────┐
                  ▼                         ▼                        ▼
       ┌─────────────────────┐   ┌─────────────────────┐   ┌───────────────────┐
       │     MongoDB DB      │   │    Groq AI Engine   │   │  SMTP Transporter │
       │ Multi-Tenant Scoped │   │ JSON Contract (Zod) │   │ Safe HTML + Pixel │
       └─────────────────────┘   └─────────────────────┘   └───────────────────┘
```

---

## 2. Key Capabilities & Features

### 1. Modern Orange & White Light Theme
- Clean, crisp, high-contrast light theme with rich orange accents (`#F97316` / `#EA580C`), warm sand canvas, white card surfaces, and smooth typography (`Plus Jakarta Sans` / `Inter`).
- Sleek redesigned Sidebar with glowing active navigation indicators, mobile slide-over, and command palette (`⌘K`).

### 2. Streamlined Groq AI & Direct Email Sending
- **Groq API Key**: Directly configurable in the Settings UI or with the 1-click prompt on the Email Automation workspace. Tested with instant feedback.
- **Direct Sender (From Email)**: Easily configure your From Email (e.g., `you@gmail.com`) and From Name with presets for Gmail (Port 465 SSL), Outlook (Port 587 STARTTLS), Mailtrap, and custom SMTP.
- **Recipient (To Email)**: Prominent, clear To Email input field directly on the outreach composer with live preview and 1-click test send.

### 3. Multi-User Authentication & Strict Data Isolation
- Email + password registration, login, logout, and password recovery.
- Short-lived JWT access tokens in memory + rotated refresh tokens in `httpOnly`, `secure`, `sameSite: 'lax'` cookies.
- **Strict Anti-IDOR scoping**: Every single Mongoose query carries `userId: req.user.id`. Document manipulation or downloads across users is completely isolated and verified by automated unit tests.
- Full account deletion purge that cascades across resumes, JDs, campaigns, emails, tracking events, and refresh tokens.

### 4. Email Automation Wizard (Split-Pane Workspace)
- **Resume Selection & PDF Ingestion:** Uploads validate magic bytes (`%PDF-`) and enforce 10MB limits; extracts text server-side via `pdf-parse` with editable preview.
- **Job Description Context:** Plain-text paste box (strictly prevents malicious file uploads) + optional fields for Company, Target Role, Recruiter Name, Recruiter Position, and Job Link.
- **AI Personalization (Groq API):** Generates structured JSON `{ subject, body }` connecting distinctive role challenges with resume project facts.
- **Refinement Styles:**
  - **Project-Focused:** Grounded cold-outreach language with specific JD challenge observation (preserves subject).
  - **Formal Application:** Evidence-led structured application with exact `Hello,` greeting and deep project examples (preserves subject).
  - **Creative Cold Hook:** Concise human outreach with a brand-new generated creative subject line.
- **Signature Block Preservation:** Strips any AI-invented sign-offs and re-attaches the candidate's exact signature block verbatim.
- **Draft Version History:** Full undo, compare, and restore capabilities across iterations.
- **Real-Time Spam Risk Checker:** Highlights excessive ALL CAPS, link counts (> 3), missing greetings, and promotional spam trigger words.

### 5. Email Tracking System (Real-Time SSE)
- **Open Tracking:** Embeds a unique 1x1 transparent PNG pixel (`/t/o/:trackingId.png`) served with strict no-cache headers.
- **Click Tracking:** Rewrites all `https://` links in the HTML body to `/t/c/:trackingId/:linkId`, logs the click, and safely 302 redirects to the destination (preventing open redirects).
- **Bot & Prefetch Filtering:** Detects Apple Mail Privacy Protection (MPP), Google Image Proxy, Mimecast, Barracuda, and corporate security scanners, displaying bot hits separately so metrics stay honest.

### 6. Bulk Campaigns & Automated Follow-Up Sequences
- Import recipient lists via CSV or manual entry (Name, Email, Company, Role).
- Deduplicates recipient addresses automatically.
- Per-recipient personalized generation queue and approval dashboard.
- Configurable delay jitter between sends to protect sender reputation.
- Automated follow-up sequence after N days if no reply is received.
- Public one-click unsubscribe links (`/u/:token`) and automatic suppression list enforcement.

---

## 3. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS (Orange & White design system), React Router v6, TanStack Query v5, Recharts, Framer Motion, Lucide Icons, React Hot Toast, Canvas Confetti.
- **Backend:** Node.js (LTS), Express.js, Mongoose, JWT, Bcrypt (cost 12), Zod, Helmet, CORS, Express Rate Limit, Multer (memory storage), PDF-Parse, Nodemailer, Node-Cron, Pino Logger.
- **Security:** AES-256-GCM encryption at rest for SMTP passwords and Groq API keys with SHA-256 IP hashing for privacy.

---

## 4. Environment Variables

Create a `.env` file in the root or `server/` directory:

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/careermail_pro

# Security & Secrets (at least 32 characters)
JWT_SECRET=applyflow_jwt_access_secret_super_secure_key_123456789!
JWT_REFRESH_SECRET=applyflow_jwt_refresh_secret_super_secure_key_123456789!
# 32 bytes in hex (64 hex characters) for AES-256-GCM settings encryption
ENCRYPTION_KEY=f6a8e32c813bbd74d39fae6189ef9490351f08cb38b939dc6158f447604ad473

# URLs and Ports
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5000
```

---

## 5. Running on Localhost & Production

### Development Mode (Vite + Nodemon with Hot-Reload)

```bash
# Run both Server and Client concurrently
npm run dev

# Or run separately in two terminals:
npm run dev:server   # Starts Express backend on http://localhost:5000
npm run dev:client   # Starts Vite frontend on http://localhost:5173
```

### Production Mode (Single Deployable Port)

In production, Express serves the built React frontend (`client/dist`) from port 5000:

```bash
# 1. Build frontend
npm run build

# 2. Start production server
npm start
# App is accessible at http://localhost:5000
```

### Automated Testing

Run the Vitest test suite covering auth, isolation, PDF parsing, Groq AI contracts, tracking, and end-to-end flows:

```bash
npm test
```

---

## 6. Default Demo Credentials

You can log in immediately using the seeded demo account or create a new account:
- **Email:** `demo@careermail.pro` (or use the one-click "Fill Demo User" button on `/login`)
- **Password:** `Password123!`
