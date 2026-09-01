-- 1. Update tasks status constraint to support full work lifecycle
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('todo', 'in_progress', 'blocked', 'in_review', 'changes_requested', 'completed'));

-- 2. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_workspace_id ON public.task_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);

-- 3. Create task_submissions table
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  feedback TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for task_submissions
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_workspace_id ON public.task_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for task_comments
DROP POLICY IF EXISTS "Members can view task comments" ON public.task_comments;
CREATE POLICY "Members can view task comments"
ON public.task_comments
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can create task comments" ON public.task_comments;
CREATE POLICY "Members can create task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Comment creators can delete their comments" ON public.task_comments;
CREATE POLICY "Comment creators can delete their comments"
ON public.task_comments
FOR DELETE
USING (
  user_id = auth.uid() OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- 6. RLS Policies for task_submissions
DROP POLICY IF EXISTS "Members can view task submissions" ON public.task_submissions;
CREATE POLICY "Members can view task submissions"
ON public.task_submissions
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can create task submissions" ON public.task_submissions;
CREATE POLICY "Members can create task submissions"
ON public.task_submissions
FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can update task submissions" ON public.task_submissions;
CREATE POLICY "Members can update task submissions"
ON public.task_submissions
FOR UPDATE
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);
