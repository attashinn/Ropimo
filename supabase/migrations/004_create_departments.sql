-- 1. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'building',
  color TEXT NOT NULL DEFAULT '#10251F',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_workspace_id ON public.departments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON public.departments(created_by);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Departments
-- SELECT: Users can view departments belonging to workspaces they are members of
DROP POLICY IF EXISTS "Members can view workspace departments" ON public.departments;
CREATE POLICY "Members can view workspace departments"
ON public.departments
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- INSERT: Owners and Admins can create departments
DROP POLICY IF EXISTS "Owners and admins can create departments" ON public.departments;
CREATE POLICY "Owners and admins can create departments"
ON public.departments
FOR INSERT
WITH CHECK (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- UPDATE: Owners and Admins can update departments
DROP POLICY IF EXISTS "Owners and admins can update departments" ON public.departments;
CREATE POLICY "Owners and admins can update departments"
ON public.departments
FOR UPDATE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- DELETE: Owners and Admins can delete departments
DROP POLICY IF EXISTS "Owners and admins can delete departments" ON public.departments;
CREATE POLICY "Owners and admins can delete departments"
ON public.departments
FOR DELETE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);
