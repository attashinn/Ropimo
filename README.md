# Zambic Dashboard (`zambic-dash`)

Production-ready, authenticated application dashboard and collaborative workspace repository for Zambic.

- **Production Domain**: `https://app.zambic.com`
- **Marketing Site**: `https://zambic.com` (served by `zambic-home`)

---

## 1. Overview & Capabilities

`zambic-dash` contains the authenticated workspace and management dashboard, including:
- **Authentication & Onboarding**: Supabase SSR Auth, session refresh via middleware, workspace onboarding, password reset, and magic links.
- **Team Workspace (`/app`)**: Real-time project boards, team directories, attendance clock-in/out, leave requests, file drives, calendar, and meetings.
- **Recruitment & Hiring (`/jobs`, `/careers`)**: Public job postings, candidate applicant tracking system (ATS), resume uploads to Cloudflare R2, interview scheduling, and feedback rounds.
- **AI Copilot (`/api/ai/*`)**: Cloudflare Workers AI integration for resume parsing, quick task generation, and candidate summaries.
- **Storage & Documents**: Cloudflare R2 object storage integration for job resumes, profile photos, workspace assets, and documents.
- **Email Delivery**: Resend transactional email integration for invitations, password resets, and notifications.

---

## 2. Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase project credentials (URL & Anon key)
- Cloudflare R2 bucket credentials (for file storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/zambic/app.git
cd app

# Install dependencies
npm install

# Set up local environment variables
cp .env.example .env.local
```

### Running Locally

```bash
# Start development server on port 3000
npm run dev

# Open in browser: http://localhost:3000
```

---

## 3. Environment Variables

Create `.env.local` using `.env.example` as a template:

| Variable | Description | Scope |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public marketing site URL (`https://zambic.com`) | Client & Server |
| `NEXT_PUBLIC_APP_URL` | Application dashboard URL (`https://app.zambic.com`) | Client & Server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Client & Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin tasks) | Server-Only |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID | Server-Only |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket name | Server-Only |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 S3 access key ID | Server-Only |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY`| R2 S3 secret access key | Server-Only |
| `CLOUDFLARE_AI_TOKEN` | Cloudflare Workers AI API token | Server-Only |
| `RESEND_API_KEY` | Resend API key for transactional emails | Server-Only |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `Zambic <notifications@app.zambic.com>`) | Server-Only |

---

## 4. Production Build & Deployment

```bash
# Type check and build optimized bundle
npm run build

# Start production server
npm start
```

### Deploying to Vercel
1. Create a new Vercel project pointing to the `zambic-dash` (or `zambic/app`) repository.
2. Set Framework Preset: `Next.js`.
3. Configure the environment variables listed in `.env.example`.
4. Under Project Settings -> Domains, assign `app.zambic.com`.
5. Ensure Supabase Auth redirect URLs in your Supabase dashboard include:
   - `https://app.zambic.com/auth/callback`
   - `https://app.zambic.com/reset-password`
