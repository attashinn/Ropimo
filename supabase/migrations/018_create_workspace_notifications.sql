-- Workspace Notifications Table
-- Stores user-specific in-app notifications with RLS and indexed access.

CREATE TABLE IF NOT EXISTS public.workspace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  action_url TEXT NOT NULL DEFAULT '/app',
  entity_type TEXT,
  entity_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_ws ON public.workspace_notifications(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.workspace_notifications(user_id, workspace_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.workspace_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.workspace_notifications;
CREATE POLICY "Users can view their own notifications"
ON public.workspace_notifications
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Users can update/mark read their own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.workspace_notifications;
CREATE POLICY "Users can update their own notifications"
ON public.workspace_notifications
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Users can delete/dismiss their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.workspace_notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.workspace_notifications
FOR DELETE
USING (
  auth.uid() = user_id
);
