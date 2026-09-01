-- 1. Create attendance_settings table
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  work_start_time TEXT NOT NULL DEFAULT '09:00',
  work_end_time TEXT NOT NULL DEFAULT '17:00',
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  half_day_threshold_minutes INTEGER NOT NULL DEFAULT 240,
  work_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_settings_ws ON public.attendance_settings(workspace_id);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view attendance settings" ON public.attendance_settings;
CREATE POLICY "Members can view attendance settings"
ON public.attendance_settings
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage attendance settings" ON public.attendance_settings;
CREATE POLICY "Owners and admins can manage attendance settings"
ON public.attendance_settings
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- 2. Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Late', 'Absent', 'Half Day', 'On Leave')) DEFAULT 'Present',
  total_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_att_records_ws_date ON public.attendance_records(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_att_records_user ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_att_records_status ON public.attendance_records(status);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace attendance" ON public.attendance_records;
CREATE POLICY "Members can view workspace attendance"
ON public.attendance_records
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert and update their own attendance" ON public.attendance_records;
CREATE POLICY "Users can insert and update their own attendance"
ON public.attendance_records
FOR ALL
USING (auth.uid() = user_id AND public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage all attendance" ON public.attendance_records;
CREATE POLICY "Owners and admins can manage all attendance"
ON public.attendance_records
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- 3. Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')) DEFAULT 'Pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_ws ON public.leave_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace leave requests" ON public.leave_requests;
CREATE POLICY "Members can view workspace leave requests"
ON public.leave_requests
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Employees can submit their own leave requests" ON public.leave_requests;
CREATE POLICY "Employees can submit their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Employees can cancel their own pending requests" ON public.leave_requests;
CREATE POLICY "Employees can cancel their own pending requests"
ON public.leave_requests
FOR UPDATE
USING (auth.uid() = user_id AND public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage leave requests" ON public.leave_requests;
CREATE POLICY "Owners and admins can manage leave requests"
ON public.leave_requests
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- 4. Create leave_balances table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave')),
  allocated INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, leave_type)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON public.leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_ws ON public.leave_balances(workspace_id);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view leave balances" ON public.leave_balances;
CREATE POLICY "Members can view leave balances"
ON public.leave_balances
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Owners and admins can manage leave balances"
ON public.leave_balances
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));
