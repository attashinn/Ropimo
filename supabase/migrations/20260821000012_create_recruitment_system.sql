-- ==============================================================================
-- ROPIMO — RECRUITMENT & HIRING SYSTEM MIGRATION (PART 2)
-- ==============================================================================

-- 1. JOB OPENINGS TABLE
CREATE TABLE IF NOT EXISTS public.job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  responsibilities TEXT[] DEFAULT ARRAY[]::TEXT[],
  requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  employment_type TEXT NOT NULL DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time', 'Part-time', 'Contractor', 'Intern')),
  location TEXT NOT NULL DEFAULT 'Remote',
  salary_range TEXT,
  hiring_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  application_deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Draft', 'Open', 'Paused', 'Closed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_openings_ws ON public.job_openings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_dept ON public.job_openings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON public.job_openings(status);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace job openings" ON public.job_openings;
CREATE POLICY "Members can view workspace job openings"
ON public.job_openings
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Managers and Admins can manage job openings" ON public.job_openings;
CREATE POLICY "Managers and Admins can manage job openings"
ON public.job_openings
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 2. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  years_of_experience NUMERIC,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  bio TEXT,
  notes TEXT,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidates_ws ON public.candidates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(workspace_id, email);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view candidates" ON public.candidates;
CREATE POLICY "Managers and Admins can view candidates"
ON public.candidates
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can manage candidates" ON public.candidates;
CREATE POLICY "Managers and Admins can manage candidates"
ON public.candidates
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 3. CANDIDATE APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.candidate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'Applied' CHECK (stage IN ('Applied', 'Screening', 'Shortlisted', 'Interview', 'Assessment', 'Final Review', 'Offer', 'Hired', 'Rejected', 'Withdrawn', 'Expired')),
  cover_letter TEXT,
  cv_storage_key TEXT,
  cv_file_name TEXT,
  cv_file_size BIGINT DEFAULT 0,
  cv_file_type TEXT,
  cv_uploaded_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_opening_id)
);

CREATE INDEX IF NOT EXISTS idx_cand_apps_ws ON public.candidate_applications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cand_apps_job ON public.candidate_applications(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_cand_apps_candidate ON public.candidate_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_apps_stage ON public.candidate_applications(stage);

ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view applications" ON public.candidate_applications;
CREATE POLICY "Managers and Admins can view applications"
ON public.candidate_applications
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can manage applications" ON public.candidate_applications;
CREATE POLICY "Managers and Admins can manage applications"
ON public.candidate_applications
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 4. APPLICATION STAGE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.application_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_history_app ON public.application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_app_history_ws ON public.application_stage_history(workspace_id);

ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view stage history" ON public.application_stage_history;
CREATE POLICY "Managers and Admins can view stage history"
ON public.application_stage_history
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can insert stage history" ON public.application_stage_history;
CREATE POLICY "Managers and Admins can insert stage history"
ON public.application_stage_history
FOR INSERT
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 5. INTERVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL DEFAULT 'Round 1 — Initial Screen',
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  location_or_link TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-show')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interviews_ws ON public.interviews(workspace_id);
CREATE INDEX IF NOT EXISTS idx_interviews_app ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON public.interviews(interviewer_id);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view interviews" ON public.interviews;
CREATE POLICY "Managers and Admins can view interviews"
ON public.interviews
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can manage interviews" ON public.interviews;
CREATE POLICY "Managers and Admins can manage interviews"
ON public.interviews
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 6. INTERVIEW FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technical_skills_rating INT CHECK (technical_skills_rating BETWEEN 1 AND 5),
  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  problem_solving_rating INT CHECK (problem_solving_rating BETWEEN 1 AND 5),
  culture_fit_rating INT CHECK (culture_fit_rating BETWEEN 1 AND 5),
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('Reject', 'Maybe', 'Move Forward')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_interview ON public.interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_feedback_ws ON public.interview_feedback(workspace_id);

ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view feedback" ON public.interview_feedback;
CREATE POLICY "Managers and Admins can view feedback"
ON public.interview_feedback
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can manage feedback" ON public.interview_feedback;
CREATE POLICY "Managers and Admins can manage feedback"
ON public.interview_feedback
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 7. OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  employment_type TEXT NOT NULL DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time', 'Part-time', 'Contractor', 'Intern')),
  salary TEXT NOT NULL,
  start_date DATE,
  reporting_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_notes TEXT,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_ws ON public.offers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_offers_app ON public.offers(application_id);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view offers" ON public.offers;
CREATE POLICY "Managers and Admins can view offers"
ON public.offers
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can manage offers" ON public.offers;
CREATE POLICY "Managers and Admins can manage offers"
ON public.offers
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));


-- 8. CANDIDATE ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.candidate_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cand_activities_ws ON public.candidate_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cand_activities_cand ON public.candidate_activities(candidate_id);

ALTER TABLE public.candidate_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view candidate activities" ON public.candidate_activities;
CREATE POLICY "Managers and Admins can view candidate activities"
ON public.candidate_activities
FOR SELECT
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

DROP POLICY IF EXISTS "Managers and Admins can insert candidate activities" ON public.candidate_activities;
CREATE POLICY "Managers and Admins can insert candidate activities"
ON public.candidate_activities
FOR INSERT
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));
