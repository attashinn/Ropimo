-- 1. Enhance workspace_members with job_title, full_name, avatar_url, and manager role
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update role constraint on workspace_members to include 'manager'
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'member', 'guest'));

-- 2. Create department_members table
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, user_id)
);

-- Indexes for department_members
CREATE INDEX IF NOT EXISTS idx_dept_members_workspace_id ON public.department_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept_id ON public.department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user_id ON public.department_members(user_id);

-- Enable RLS on department_members
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_members
DROP POLICY IF EXISTS "Members can view department members" ON public.department_members;
CREATE POLICY "Members can view department members"
ON public.department_members
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Owners, admins, managers can insert department members" ON public.department_members;
CREATE POLICY "Owners, admins, managers can insert department members"
ON public.department_members
FOR INSERT
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
);

DROP POLICY IF EXISTS "Owners, admins, managers can update department members" ON public.department_members;
CREATE POLICY "Owners, admins, managers can update department members"
ON public.department_members
FOR UPDATE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
);

DROP POLICY IF EXISTS "Owners, admins, managers can delete department members" ON public.department_members;
CREATE POLICY "Owners, admins, managers can delete department members"
ON public.department_members
FOR DELETE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
);

-- 3. Create workspace_invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'guest')) DEFAULT 'member',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked')) DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

-- Indexes for workspace_invitations
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.workspace_invitations(email);

-- Enable RLS on workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_invitations
DROP POLICY IF EXISTS "Members can view workspace invitations" ON public.workspace_invitations;
CREATE POLICY "Members can view workspace invitations"
ON public.workspace_invitations
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Owners and admins can manage invitations" ON public.workspace_invitations;
CREATE POLICY "Owners and admins can manage invitations"
ON public.workspace_invitations
FOR ALL
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
)
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);
