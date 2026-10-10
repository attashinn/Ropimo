-- ==============================================================================
-- 024_enhance_job_openings_and_careers.sql
-- Enhanced Job Openings, Careers Portal, Candidate Applications & Events
-- ==============================================================================

-- 1. ENHANCE JOB OPENINGS TABLE
ALTER TABLE public.job_openings
ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'onsite',
ADD COLUMN IF NOT EXISTS experience_level TEXT NOT NULL DEFAULT 'Mid-level',
ADD COLUMN IF NOT EXISTS openings_count INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS show_salary BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS benefits TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS application_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

-- Drop old status check before updating existing values
ALTER TABLE public.job_openings DROP CONSTRAINT IF EXISTS job_openings_status_check;

-- Change default status to draft
ALTER TABLE public.job_openings ALTER COLUMN status SET DEFAULT 'draft';

-- Normalize existing status to lowercase
UPDATE public.job_openings
SET status = CASE
  WHEN LOWER(status) = 'open' THEN 'published'
  WHEN LOWER(status) = 'draft' THEN 'draft'
  WHEN LOWER(status) = 'paused' THEN 'paused'
  WHEN LOWER(status) = 'closed' THEN 'closed'
  ELSE 'draft'
END
WHERE status IS NOT NULL;

-- Set new status check constraint
ALTER TABLE public.job_openings ADD CONSTRAINT job_openings_status_check
CHECK (status IN ('draft', 'published', 'paused', 'closed'));

-- Work mode check
ALTER TABLE public.job_openings DROP CONSTRAINT IF EXISTS job_openings_work_mode_check;
ALTER TABLE public.job_openings ADD CONSTRAINT job_openings_work_mode_check
CHECK (work_mode IN ('onsite', 'hybrid', 'remote'));

-- Ensure slug is lowercase and trimmed
UPDATE public.job_openings
SET slug = LOWER(TRIM(slug))
WHERE slug IS NOT NULL AND slug != LOWER(TRIM(slug));

-- Unique slug per workspace
DROP INDEX IF EXISTS idx_job_openings_ws_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_openings_ws_slug
ON public.job_openings(workspace_id, LOWER(slug))
WHERE slug IS NOT NULL;

-- Fast index for public careers query: published jobs within valid close window
DROP INDEX IF EXISTS idx_job_openings_public;
CREATE INDEX IF NOT EXISTS idx_job_openings_public
ON public.job_openings(workspace_id, status, closes_at);

-- 2. CANDIDATE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.candidate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_events_candidate ON public.candidate_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_events_ws ON public.candidate_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidate_events_created ON public.candidate_events(created_at DESC);

ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view candidate events" ON public.candidate_events;
CREATE POLICY "Workspace members can view candidate events"
ON public.candidate_events
FOR SELECT
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager', 'member']));

DROP POLICY IF EXISTS "Backend service can insert candidate events" ON public.candidate_events;
CREATE POLICY "Backend service can insert candidate events"
ON public.candidate_events
FOR INSERT
WITH CHECK (true);

-- 3. CANDIDATE APPLICATIONS SCHEMA EXTENSIONS
ALTER TABLE public.candidate_applications
ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Prevent duplicate applications per candidate per job opening
DROP INDEX IF EXISTS idx_candidate_apps_unique_candidate_job;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_apps_unique_candidate_job
ON public.candidate_applications(candidate_id, job_opening_id);

-- 4. RLS POLICIES FOR PUBLIC CAREERS & RECRUITMENT ISOLATION

-- Allow public anonymous reads for published jobs on careers portal
DROP POLICY IF EXISTS "Public can view published active jobs" ON public.job_openings;
CREATE POLICY "Public can view published active jobs"
ON public.job_openings
FOR SELECT
USING (
  status = 'published' AND (closes_at IS NULL OR closes_at > now())
);

-- Workspace members can view all jobs in their workspace
DROP POLICY IF EXISTS "Workspace members can view all workspace jobs" ON public.job_openings;
CREATE POLICY "Workspace members can view all workspace jobs"
ON public.job_openings
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager', 'member'])
);

-- Public can submit candidate applications (via backend service / RPC)
-- Candidates table RLS: workspace members view candidates in their workspace only
DROP POLICY IF EXISTS "Workspace members can view candidates" ON public.candidates;
CREATE POLICY "Workspace members can view candidates"
ON public.candidates
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager', 'member'])
);

-- Applications table RLS: workspace members view applications in their workspace only
DROP POLICY IF EXISTS "Workspace members can view candidate applications" ON public.candidate_applications;
CREATE POLICY "Workspace members can view candidate applications"
ON public.candidate_applications
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager', 'member'])
);
