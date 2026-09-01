-- 1. Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'task', 'deadline', 'event', 'leave')) DEFAULT 'meeting',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id ON public.calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_department_id ON public.calendar_events(department_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON public.calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);

-- 2. Create calendar_event_participants table
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_participants_event_id ON public.calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_cal_participants_user_id ON public.calendar_event_participants(user_id);

-- 3. Create calendar_event_attachments table
CREATE TABLE IF NOT EXISTS public.calendar_event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_attachments_event_id ON public.calendar_event_attachments(event_id);

-- 4. Create calendar_event_comments table
CREATE TABLE IF NOT EXISTS public.calendar_event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_comments_event_id ON public.calendar_event_comments(event_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_comments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Members can view workspace calendar events" ON public.calendar_events;
CREATE POLICY "Members can view workspace calendar events"
ON public.calendar_events
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create workspace calendar events" ON public.calendar_events;
CREATE POLICY "Members can create workspace calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update workspace calendar events" ON public.calendar_events;
CREATE POLICY "Members can update workspace calendar events"
ON public.calendar_events
FOR UPDATE
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can delete workspace calendar events" ON public.calendar_events;
CREATE POLICY "Members can delete workspace calendar events"
ON public.calendar_events
FOR DELETE
USING (
  created_by = auth.uid() OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

DROP POLICY IF EXISTS "Members can view participants" ON public.calendar_event_participants;
CREATE POLICY "Members can view participants"
ON public.calendar_event_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE calendar_events.id = calendar_event_participants.event_id
    AND public.is_workspace_member(calendar_events.workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Members can manage attachments" ON public.calendar_event_attachments;
CREATE POLICY "Members can manage attachments"
ON public.calendar_event_attachments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE calendar_events.id = calendar_event_attachments.event_id
    AND public.is_workspace_member(calendar_events.workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Members can manage comments" ON public.calendar_event_comments;
CREATE POLICY "Members can manage comments"
ON public.calendar_event_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE calendar_events.id = calendar_event_comments.event_id
    AND public.is_workspace_member(calendar_events.workspace_id, auth.uid())
  )
);
