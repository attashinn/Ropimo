-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'in_review', 'completed')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 2. Create task_assignees table
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- Indexes on task_assignees
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for tasks
-- SELECT: Members of the workspace can view tasks
DROP POLICY IF EXISTS "Members can view workspace tasks" ON public.tasks;
CREATE POLICY "Members can view workspace tasks"
ON public.tasks
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- INSERT: Members of the workspace can create tasks
DROP POLICY IF EXISTS "Members can create workspace tasks" ON public.tasks;
CREATE POLICY "Members can create workspace tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- UPDATE: Workspace members can update tasks
DROP POLICY IF EXISTS "Members can update workspace tasks" ON public.tasks;
CREATE POLICY "Members can update workspace tasks"
ON public.tasks
FOR UPDATE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- DELETE: Owners, admins, or task creators can delete tasks
DROP POLICY IF EXISTS "Owners, admins, or creators can delete tasks" ON public.tasks;
CREATE POLICY "Owners, admins, or creators can delete tasks"
ON public.tasks
FOR DELETE
USING (
  created_by = auth.uid() OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- 5. RLS Policies for task_assignees
-- SELECT: Users who can view the task can view its assignees
DROP POLICY IF EXISTS "Members can view task assignees" ON public.task_assignees;
CREATE POLICY "Members can view task assignees"
ON public.task_assignees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_assignees.task_id
    AND public.is_workspace_member(tasks.workspace_id, auth.uid())
  )
);

-- ALL: Workspace members can manage task assignees
DROP POLICY IF EXISTS "Members can manage task assignees" ON public.task_assignees;
CREATE POLICY "Members can manage task assignees"
ON public.task_assignees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_assignees.task_id
    AND public.is_workspace_member(tasks.workspace_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_assignees.task_id
    AND public.is_workspace_member(tasks.workspace_id, auth.uid())
  )
);
