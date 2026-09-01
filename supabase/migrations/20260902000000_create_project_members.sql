-- Project Members table
-- Allows explicit per-user project membership for fine-grained access control.
-- Members can only see projects they are explicitly added to (unless owner/admin).

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member', 'viewer')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_workspace_id ON public.project_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can view project membership for their workspace
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- Owners, admins, and managers can manage project members
DROP POLICY IF EXISTS "Owners, admins, managers can manage project members" ON public.project_members;
CREATE POLICY "Owners, admins, managers can manage project members"
ON public.project_members
FOR ALL
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
)
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
);
