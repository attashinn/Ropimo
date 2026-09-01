-- 1. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'completed')) DEFAULT 'active',
  color TEXT NOT NULL DEFAULT '#10251F',
  icon TEXT NOT NULL DEFAULT '📁',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Projects
-- SELECT: Users can view projects in workspaces they belong to
DROP POLICY IF EXISTS "Members can view workspace projects" ON public.projects;
CREATE POLICY "Members can view workspace projects"
ON public.projects
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- INSERT: Owners and Admins can create projects
DROP POLICY IF EXISTS "Owners and admins can create projects" ON public.projects;
CREATE POLICY "Owners and admins can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- UPDATE: Owners and Admins can update projects
DROP POLICY IF EXISTS "Owners and admins can update projects" ON public.projects;
CREATE POLICY "Owners and admins can update projects"
ON public.projects
FOR UPDATE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- DELETE: Owners and Admins can delete projects
DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;
CREATE POLICY "Owners and admins can delete projects"
ON public.projects
FOR DELETE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);
