-- Migration: 20261010000000_create_meetings_system.sql
-- Description: Create workspace_meetings and relational meeting management tables with RLS

-- 1. Create workspace_meetings table
CREATE TABLE IF NOT EXISTS public.workspace_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('Internal', 'Client', 'Department', 'One-on-one', 'Interview', 'Training')) DEFAULT 'Internal',
  status TEXT NOT NULL CHECK (status IN ('Upcoming', 'Live', 'Completed', 'Cancelled')) DEFAULT 'Upcoming',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT NOT NULL DEFAULT '10:00 AM',
  end_time TEXT NOT NULL DEFAULT '11:00 AM',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organizer_name TEXT NOT NULL DEFAULT 'Team Member',
  organizer_role TEXT,
  organizer_avatar TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_type TEXT NOT NULL CHECK (location_type IN ('Video', 'Physical', 'Custom')) DEFAULT 'Video',
  location_value TEXT,
  meeting_link TEXT,
  meeting_id_code TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence TEXT CHECK (recurrence IN ('None', 'Daily', 'Weekly', 'Biweekly', 'Monthly')) DEFAULT 'None',
  reminders INTEGER[] DEFAULT ARRAY[15],
  notify_attendees BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  recording_url TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_workspace_id ON public.workspace_meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_date ON public.workspace_meetings(date);
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_status ON public.workspace_meetings(status);
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_organizer_id ON public.workspace_meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_department_id ON public.workspace_meetings(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_meetings_project_id ON public.workspace_meetings(project_id);

-- Enable Row Level Security
ALTER TABLE public.workspace_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Members can view workspace meetings" ON public.workspace_meetings;
CREATE POLICY "Members can view workspace meetings"
ON public.workspace_meetings
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create workspace meetings" ON public.workspace_meetings;
CREATE POLICY "Members can create workspace meetings"
ON public.workspace_meetings
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update workspace meetings" ON public.workspace_meetings;
CREATE POLICY "Members can update workspace meetings"
ON public.workspace_meetings
FOR UPDATE
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can delete workspace meetings" ON public.workspace_meetings;
CREATE POLICY "Members can delete workspace meetings"
ON public.workspace_meetings
FOR DELETE
USING (public.is_workspace_member(workspace_id, auth.uid()));
