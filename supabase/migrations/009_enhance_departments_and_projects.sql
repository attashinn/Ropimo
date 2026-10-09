-- 1. Enhance departments table with lead_id and status
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused'));

-- 2. Enhance projects table with department_id, lead_id, priority, start_date, due_date
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_department_id ON public.projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON public.projects(lead_id);

-- 3. Enhance department_members with role
ALTER TABLE public.department_members
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member', 'guest'));

-- 4. Create general workspace_activities table for audit logs across departments, projects, and tasks
CREATE TABLE IF NOT EXISTS public.workspace_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for workspace_activities
CREATE INDEX IF NOT EXISTS idx_workspace_activities_workspace_id ON public.workspace_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_department_id ON public.workspace_activities(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_project_id ON public.workspace_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_task_id ON public.workspace_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_created_at ON public.workspace_activities(created_at DESC);

-- Enable RLS on workspace_activities
ALTER TABLE public.workspace_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace activities" ON public.workspace_activities;
CREATE POLICY "Members can view workspace activities"
ON public.workspace_activities
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can create workspace activities" ON public.workspace_activities;
CREATE POLICY "Members can create workspace activities"
ON public.workspace_activities
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);
