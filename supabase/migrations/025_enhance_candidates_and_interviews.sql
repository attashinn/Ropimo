-- ==============================================================================
-- 025_enhance_candidates_and_interviews.sql
-- Candidates Pipeline, Stages, Scorecards, Notes, and Interview Enhancements
-- ==============================================================================

-- 1. ENHANCE CANDIDATES TABLE
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Careers Portal',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS latest_stage TEXT NOT NULL DEFAULT 'applied';

-- Normalize candidate stage values to lowercase
UPDATE public.candidates
SET latest_stage = CASE
  WHEN LOWER(latest_stage) = 'screening' THEN 'screening'
  WHEN LOWER(latest_stage) = 'interview' THEN 'interview'
  WHEN LOWER(latest_stage) = 'offer' THEN 'offer'
  WHEN LOWER(latest_stage) = 'hired' THEN 'hired'
  WHEN LOWER(latest_stage) = 'rejected' THEN 'rejected'
  WHEN LOWER(latest_stage) = 'withdrawn' THEN 'withdrawn'
  ELSE 'applied'
END
WHERE latest_stage IS NOT NULL;

-- 2. ENHANCE CANDIDATE APPLICATIONS TABLE
-- Drop old stage check if exists and set unified lowercase stages
ALTER TABLE public.candidate_applications DROP CONSTRAINT IF EXISTS candidate_applications_stage_check;

UPDATE public.candidate_applications
SET stage = CASE
  WHEN LOWER(stage) = 'screening' THEN 'screening'
  WHEN LOWER(stage) = 'interview' THEN 'interview'
  WHEN LOWER(stage) = 'offer' THEN 'offer'
  WHEN LOWER(stage) = 'hired' THEN 'hired'
  WHEN LOWER(stage) = 'rejected' THEN 'rejected'
  WHEN LOWER(stage) = 'withdrawn' THEN 'withdrawn'
  ELSE 'applied'
END
WHERE stage IS NOT NULL;

ALTER TABLE public.candidate_applications ADD CONSTRAINT candidate_applications_stage_check
CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'));

ALTER TABLE public.candidate_applications
ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Indexes for candidates filtering and search
CREATE INDEX IF NOT EXISTS idx_candidates_rating ON public.candidates(workspace_id, rating);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON public.candidates(workspace_id, source);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON public.candidates(workspace_id, latest_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON public.candidates(workspace_id, created_at DESC);

-- 3. CANDIDATE NOTES TABLE (Internal notes with @mentions)
CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notes_cand ON public.candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_ws ON public.candidate_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_created ON public.candidate_notes(created_at DESC);

ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hiring team can view candidate notes" ON public.candidate_notes;
CREATE POLICY "Hiring team can view candidate notes"
ON public.candidate_notes
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
);

DROP POLICY IF EXISTS "Hiring team can insert candidate notes" ON public.candidate_notes;
CREATE POLICY "Hiring team can insert candidate notes"
ON public.candidate_notes
FOR INSERT
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
);

-- 4. ENHANCE INTERVIEWS TABLE
ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
ADD COLUMN IF NOT EXISTS candidate_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
ADD COLUMN IF NOT EXISTS interview_type TEXT NOT NULL DEFAULT 'video',
ADD COLUMN IF NOT EXISTS interviewer_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ics_uid TEXT,
ADD COLUMN IF NOT EXISTS ics_sequence INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Drop old status check and set new lowercase statuses
ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;

UPDATE public.interviews
SET status = CASE
  WHEN LOWER(status) = 'completed' THEN 'completed'
  WHEN LOWER(status) = 'cancelled' THEN 'cancelled'
  WHEN LOWER(status) = 'no-show' OR LOWER(status) = 'noshow' THEN 'no-show'
  ELSE 'scheduled'
END
WHERE status IS NOT NULL;

ALTER TABLE public.interviews ADD CONSTRAINT interviews_status_check
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show'));

-- Populate interviewer_ids array from single interviewer_id if not present
UPDATE public.interviews
SET interviewer_ids = ARRAY[interviewer_id]
WHERE interviewer_id IS NOT NULL AND (interviewer_ids IS NULL OR cardinality(interviewer_ids) = 0);

CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(workspace_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_reminder ON public.interviews(scheduled_at, reminder_sent_at) WHERE status = 'scheduled';

-- 5. ENHANCE INTERVIEW FEEDBACK (SCORECARDS) TABLE
ALTER TABLE public.interview_feedback
ADD COLUMN IF NOT EXISTS skills_rating INT CHECK (skills_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS culture_rating INT CHECK (culture_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();

-- Update recommendation check constraint
ALTER TABLE public.interview_feedback DROP CONSTRAINT IF EXISTS interview_feedback_recommendation_check;

UPDATE public.interview_feedback
SET recommendation = CASE
  WHEN LOWER(recommendation) = 'move forward' OR LOWER(recommendation) = 'yes' THEN 'yes'
  WHEN LOWER(recommendation) = 'strong yes' THEN 'strong_yes'
  WHEN LOWER(recommendation) = 'strong no' THEN 'strong_no'
  WHEN LOWER(recommendation) = 'reject' OR LOWER(recommendation) = 'no' THEN 'no'
  ELSE 'yes'
END
WHERE recommendation IS NOT NULL;

ALTER TABLE public.interview_feedback ADD CONSTRAINT interview_feedback_recommendation_check
CHECK (recommendation IN ('strong_yes', 'yes', 'no', 'strong_no'));

-- Unique feedback per interviewer per interview
DROP INDEX IF EXISTS idx_feedback_unique_interviewer_interview;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_unique_interviewer_interview
ON public.interview_feedback(interview_id, interviewer_id);

-- 6. MULTI-TENANT ROLE & INTERVIEWER ACCESS POLICIES
-- An assigned interviewer can view the candidate, applications, and their own interview
DROP POLICY IF EXISTS "Assigned interviewers can view assigned interviews" ON public.interviews;
CREATE POLICY "Assigned interviewers can view assigned interviews"
ON public.interviews
FOR SELECT
USING (
  auth.uid() = ANY(interviewer_ids) OR auth.uid() = interviewer_id
);

-- Interview feedback: Interviewers see their own, and only see other scorecards if they already submitted their own
DROP POLICY IF EXISTS "Interviewers view scorecards" ON public.interview_feedback;
CREATE POLICY "Interviewers view scorecards"
ON public.interview_feedback
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
  OR interviewer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.interview_feedback my_fb
    WHERE my_fb.interview_id = interview_feedback.interview_id
    AND my_fb.interviewer_id = auth.uid()
  )
);
