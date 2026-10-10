-- 021_enhance_workspace_meetings_columns.sql
-- Add JSONB attendees, agenda, duration, and cancellation tracking to workspace_meetings

ALTER TABLE public.workspace_meetings
ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attendee_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
