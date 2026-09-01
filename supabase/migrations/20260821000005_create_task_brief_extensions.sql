-- 1. Extend tasks table with work brief & delivery fields
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS deliverable_type TEXT,
ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notify_assignees BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_department BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- 2. Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_workspace_id ON public.task_attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- 3. Create task_activities table
CREATE TABLE IF NOT EXISTS public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for task_activities
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_workspace_id ON public.task_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON public.task_activities(created_at);

-- 4. Enable Row Level Security
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for task_attachments
DROP POLICY IF EXISTS "Members can view task attachments" ON public.task_attachments;
CREATE POLICY "Members can view task attachments"
ON public.task_attachments
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can create task attachments" ON public.task_attachments;
CREATE POLICY "Members can create task attachments"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can delete task attachments" ON public.task_attachments;
CREATE POLICY "Members can delete task attachments"
ON public.task_attachments
FOR DELETE
USING (
  uploaded_by = auth.uid() OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- 6. RLS Policies for task_activities
DROP POLICY IF EXISTS "Members can view task activities" ON public.task_activities;
CREATE POLICY "Members can view task activities"
ON public.task_activities
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can log task activities" ON public.task_activities;
CREATE POLICY "Members can log task activities"
ON public.task_activities
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);
