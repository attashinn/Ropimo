-- ==============================================================================
-- ROPIMO MIGRATION: ENHANCE EMPLOYEE INVITATIONS AND ONBOARDING
-- ==============================================================================

-- 1. Enhance workspace_invitations with token, employee_id, expires_at, and accepted_at
ALTER TABLE public.workspace_invitations
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update status check constraint to include expired
ALTER TABLE public.workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_status_check;
ALTER TABLE public.workspace_invitations ADD CONSTRAINT workspace_invitations_status_check
CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'Pending', 'Accepted', 'Expired', 'Revoked'));

-- Index on token for fast invitation lookup
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(token);

-- 2. Create employee_onboardings table
CREATE TABLE IF NOT EXISTS public.employee_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  candidate_id TEXT,
  application_id TEXT,
  employee_id TEXT,
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('Not Started', 'In Progress', 'Documents Pending', 'Profile Pending', 'Access Setup', 'Ready to Start', 'Completed')),
  progress_percentage INT NOT NULL DEFAULT 0,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Indexes for employee_onboardings
CREATE INDEX IF NOT EXISTS idx_employee_onboardings_workspace_id ON public.employee_onboardings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboardings_user_id ON public.employee_onboardings(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboardings_status ON public.employee_onboardings(status);

-- Enable RLS on employee_onboardings
ALTER TABLE public.employee_onboardings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_onboardings
DROP POLICY IF EXISTS "Members can view their own and workspace onboardings" ON public.employee_onboardings;
CREATE POLICY "Members can view their own and workspace onboardings"
ON public.employee_onboardings
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid()) OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owners, admins, managers can insert onboardings" ON public.employee_onboardings;
CREATE POLICY "Owners, admins, managers can insert onboardings"
ON public.employee_onboardings
FOR INSERT
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager') OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owners, admins, managers, and assigned employee can update onboardings" ON public.employee_onboardings;
CREATE POLICY "Owners, admins, managers, and assigned employee can update onboardings"
ON public.employee_onboardings
FOR UPDATE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager') OR auth.uid() = user_id
);
