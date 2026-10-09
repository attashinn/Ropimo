-- 020_comprehensive_rls_policies.sql
-- Comprehensive Row Level Security (RLS) policies for all 45 tables in the public schema
-- Adheres to strict workspace tenancy and role-based permissions

-- ============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS WITH FIXED SEARCH_PATH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(ws_id UUID, roles text[], u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id 
      AND user_id = u_id 
      AND role = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = u_id
  LIMIT 1;
$$;

-- Fix create_workspace_with_owner search path as well
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  name TEXT,
  slug TEXT,
  icon TEXT DEFAULT '🏢'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ws_id UUID;
  new_ws_record RECORD;
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.workspaces (name, slug, icon, created_by, owner_id)
  VALUES (name, slug, icon, caller_id, caller_id)
  RETURNING id, name, slug, icon, created_at INTO new_ws_record;

  new_ws_id := new_ws_record.id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, caller_id, 'owner');

  RETURN jsonb_build_object(
    'id', new_ws_record.id,
    'name', new_ws_record.name,
    'slug', new_ws_record.slug,
    'icon', new_ws_record.icon,
    'role', 'owner',
    'created_at', new_ws_record.created_at
  );
END;
$$;

-- ============================================================================
-- 2. ENABLE RLS ON ALL 45 TABLES
-- ============================================================================

ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_file_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. PROFILES POLICIES (No "using (true)")
-- ============================================================================

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.workspace_members m1
    JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id
  )
);

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- 4. WORKSPACES & WORKSPACE MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owners and admins can update workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspace" ON public.workspaces;

CREATE POLICY "workspaces_select" ON public.workspaces
FOR SELECT TO authenticated
USING (
  public.is_workspace_member(id)
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "workspaces_insert" ON public.workspaces
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (auth.uid() = created_by OR auth.uid() = owner_id)
);

CREATE POLICY "workspaces_update" ON public.workspaces
FOR UPDATE TO authenticated
USING (public.has_workspace_role(id, ARRAY['owner', 'admin']) OR owner_id = auth.uid())
WITH CHECK (public.has_workspace_role(id, ARRAY['owner', 'admin']) OR owner_id = auth.uid());

CREATE POLICY "workspaces_delete" ON public.workspaces
FOR DELETE TO authenticated
USING (public.has_workspace_role(id, ARRAY['owner']) OR owner_id = auth.uid());

-- WORKSPACE MEMBERS
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins or creators can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners/admins or workspace creator can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners, admins or self can remove members" ON public.workspace_members;

CREATE POLICY "workspace_members_select" ON public.workspace_members
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

CREATE POLICY "workspace_members_insert" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND role = 'owner')
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "workspace_members_update" ON public.workspace_members
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "workspace_members_delete" ON public.workspace_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
);

-- WORKSPACE INVITATIONS
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Owners and admins can manage invitations" ON public.workspace_invitations;

CREATE POLICY "workspace_invitations_select" ON public.workspace_invitations
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_invitations_manage" ON public.workspace_invitations
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- WORKSPACE ACTIVITIES
DROP POLICY IF EXISTS "Members can view activities" ON public.workspace_activities;
CREATE POLICY "workspace_activities_select" ON public.workspace_activities
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_activities_insert" ON public.workspace_activities
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

-- WORKSPACE NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.workspace_notifications;
CREATE POLICY "workspace_notifications_select" ON public.workspace_notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "workspace_notifications_insert" ON public.workspace_notifications
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_notifications_update" ON public.workspace_notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_notifications_delete" ON public.workspace_notifications
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 5. DEPARTMENTS & DEPARTMENT MEMBERS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view departments" ON public.departments;
DROP POLICY IF EXISTS "Owners and admins can manage departments" ON public.departments;

CREATE POLICY "departments_select" ON public.departments
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "departments_manage" ON public.departments
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- DEPARTMENT MEMBERS
DROP POLICY IF EXISTS "Members can view department members" ON public.department_members;
DROP POLICY IF EXISTS "Owners and admins can manage department members" ON public.department_members;

CREATE POLICY "department_members_select" ON public.department_members
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "department_members_manage" ON public.department_members
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']));

-- ============================================================================
-- 6. PROJECTS & PROJECT MEMBERS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Owners and admins can manage projects" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "projects_manage" ON public.projects
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- PROJECT MEMBERS
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Owners and admins can manage project members" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "project_members_manage" ON public.project_members
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- ============================================================================
-- 7. TASKS, ASSIGNEES, ACTIVITIES, ATTACHMENTS, COMMENTS, SUBMISSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owners and admins can manage tasks" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'member']));

CREATE POLICY "tasks_update" ON public.tasks
FOR UPDATE TO authenticated
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- TASK ASSIGNEES (Checks parent task's workspace_id)
DROP POLICY IF EXISTS "Members can view task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Owners and admins can manage task assignees" ON public.task_assignees;

CREATE POLICY "task_assignees_select" ON public.task_assignees
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id AND public.is_workspace_member(t.workspace_id)
  )
);

CREATE POLICY "task_assignees_manage" ON public.task_assignees
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND public.has_workspace_role(t.workspace_id, ARRAY['owner', 'admin', 'manager'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND public.has_workspace_role(t.workspace_id, ARRAY['owner', 'admin', 'manager'])
  )
);

-- TASK ATTACHMENTS
DROP POLICY IF EXISTS "Members can view task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Owners and admins can manage task attachments" ON public.task_attachments;

CREATE POLICY "task_attachments_select" ON public.task_attachments
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "task_attachments_insert" ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "task_attachments_delete" ON public.task_attachments
FOR DELETE TO authenticated
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR uploaded_by = auth.uid()
);

-- TASK ACTIVITIES
DROP POLICY IF EXISTS "Members can view task activities" ON public.task_activities;
CREATE POLICY "task_activities_select" ON public.task_activities
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "task_activities_insert" ON public.task_activities
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

-- TASK COMMENTS
DROP POLICY IF EXISTS "Members can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Members can manage own task comments" ON public.task_comments;

CREATE POLICY "task_comments_select" ON public.task_comments
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "task_comments_insert" ON public.task_comments
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

CREATE POLICY "task_comments_update" ON public.task_comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_delete" ON public.task_comments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
);

-- TASK SUBMISSIONS
DROP POLICY IF EXISTS "Members can view task submissions" ON public.task_submissions;
CREATE POLICY "task_submissions_select" ON public.task_submissions
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "task_submissions_insert" ON public.task_submissions
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id) AND submitted_by = auth.uid());

CREATE POLICY "task_submissions_update" ON public.task_submissions
FOR UPDATE TO authenticated
USING (
  submitted_by = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
)
WITH CHECK (
  submitted_by = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
);

CREATE POLICY "task_submissions_delete" ON public.task_submissions
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- ============================================================================
-- 8. ATTENDANCE & LEAVE SYSTEM
-- ============================================================================

DROP POLICY IF EXISTS "Members can view attendance settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Owners and admins can manage attendance settings" ON public.attendance_settings;

CREATE POLICY "attendance_settings_select" ON public.attendance_settings
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "attendance_settings_manage" ON public.attendance_settings
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- ATTENDANCE RECORDS
DROP POLICY IF EXISTS "Members can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Members can manage attendance records" ON public.attendance_records;

CREATE POLICY "attendance_records_select" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
);

CREATE POLICY "attendance_records_insert" ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "attendance_records_update" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "attendance_records_delete" ON public.attendance_records
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- LEAVE REQUESTS
DROP POLICY IF EXISTS "Members can view leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Members can manage leave requests" ON public.leave_requests;

CREATE POLICY "leave_requests_select" ON public.leave_requests
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
);

CREATE POLICY "leave_requests_insert" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "leave_requests_update" ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
);

CREATE POLICY "leave_requests_delete" ON public.leave_requests
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'Pending');

-- LEAVE BALANCES
DROP POLICY IF EXISTS "Members can view leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "Owners and admins can manage leave balances" ON public.leave_balances;

CREATE POLICY "leave_balances_select" ON public.leave_balances
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "leave_balances_manage" ON public.leave_balances
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- ============================================================================
-- 9. PEOPLE & EMPLOYEE SYSTEM
-- ============================================================================

-- EMPLOYEE WORK HISTORY
DROP POLICY IF EXISTS "Members can view work history" ON public.employee_work_history;
DROP POLICY IF EXISTS "Owners and admins can manage work history" ON public.employee_work_history;

CREATE POLICY "employee_work_history_select" ON public.employee_work_history
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "employee_work_history_manage" ON public.employee_work_history
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- EMPLOYEE DOCUMENTS
DROP POLICY IF EXISTS "Members can view employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Owners and admins can manage employee documents" ON public.employee_documents;

CREATE POLICY "employee_documents_select" ON public.employee_documents
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "employee_documents_manage" ON public.employee_documents
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- EMPLOYEE ASSETS
DROP POLICY IF EXISTS "Members can view employee assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Owners and admins can manage employee assets" ON public.employee_assets;

CREATE POLICY "employee_assets_select" ON public.employee_assets
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "employee_assets_manage" ON public.employee_assets
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- EMPLOYEE ONBOARDINGS
DROP POLICY IF EXISTS "Members can view onboardings" ON public.employee_onboardings;
DROP POLICY IF EXISTS "Owners and admins can manage onboardings" ON public.employee_onboardings;

CREATE POLICY "employee_onboardings_select" ON public.employee_onboardings
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
);

CREATE POLICY "employee_onboardings_manage" ON public.employee_onboardings
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- ============================================================================
-- 10. RECRUITMENT & HIRING (With Public Anon Application Support)
-- ============================================================================

-- JOB OPENINGS (Anon can read published jobs only)
DROP POLICY IF EXISTS "Members can view job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Owners and admins can manage job openings" ON public.job_openings;

CREATE POLICY "job_openings_select" ON public.job_openings
FOR SELECT
USING (
  public.is_workspace_member(workspace_id)
  OR status IN ('Published', 'published', 'open', 'Open')
);

CREATE POLICY "job_openings_manage" ON public.job_openings
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- CANDIDATES (Anon can insert candidates only; HR/owner/admin can manage)
DROP POLICY IF EXISTS "Members can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Owners and admins can manage candidates" ON public.candidates;

CREATE POLICY "candidates_select" ON public.candidates
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "candidates_insert" ON public.candidates
FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "candidates_update" ON public.candidates
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "candidates_delete" ON public.candidates
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- CANDIDATE APPLICATIONS (Anon can insert applications only)
DROP POLICY IF EXISTS "Members can view candidate applications" ON public.candidate_applications;
DROP POLICY IF EXISTS "Owners and admins can manage candidate applications" ON public.candidate_applications;

CREATE POLICY "candidate_applications_select" ON public.candidate_applications
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "candidate_applications_insert" ON public.candidate_applications
FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "candidate_applications_manage" ON public.candidate_applications
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- CANDIDATE ACTIVITIES
DROP POLICY IF EXISTS "Members can view candidate activities" ON public.candidate_activities;
CREATE POLICY "candidate_activities_select" ON public.candidate_activities
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "candidate_activities_manage" ON public.candidate_activities
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- APPLICATION STAGE HISTORY
DROP POLICY IF EXISTS "Members can view stage history" ON public.application_stage_history;
CREATE POLICY "application_stage_history_select" ON public.application_stage_history
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "application_stage_history_manage" ON public.application_stage_history
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- INTERVIEWS
DROP POLICY IF EXISTS "Members can view interviews" ON public.interviews;
CREATE POLICY "interviews_select" ON public.interviews
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "interviews_manage" ON public.interviews
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- INTERVIEW FEEDBACK
DROP POLICY IF EXISTS "Members can view feedback" ON public.interview_feedback;
CREATE POLICY "interview_feedback_select" ON public.interview_feedback
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "interview_feedback_manage" ON public.interview_feedback
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- OFFERS
DROP POLICY IF EXISTS "Members can view offers" ON public.offers;
CREATE POLICY "offers_select" ON public.offers
FOR SELECT TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

CREATE POLICY "offers_manage" ON public.offers
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

-- ============================================================================
-- 11. FILES & FOLDERS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view folders" ON public.workspace_folders;
CREATE POLICY "workspace_folders_select" ON public.workspace_folders
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_folders_manage" ON public.workspace_folders
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR created_by = auth.uid())
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR created_by = auth.uid());

-- WORKSPACE FILES
DROP POLICY IF EXISTS "Members can view files" ON public.workspace_files;
CREATE POLICY "workspace_files_select" ON public.workspace_files
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_files_manage" ON public.workspace_files
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR uploaded_by = auth.uid())
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR uploaded_by = auth.uid());

-- WORKSPACE FILE SHARES (Parent: workspace_files)
DROP POLICY IF EXISTS "Members can view file shares" ON public.workspace_file_shares;
CREATE POLICY "workspace_file_shares_select" ON public.workspace_file_shares
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_files f
    WHERE f.id = workspace_file_shares.file_id AND public.is_workspace_member(f.workspace_id)
  )
);

CREATE POLICY "workspace_file_shares_manage" ON public.workspace_file_shares
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_files f
    WHERE f.id = workspace_file_shares.file_id
      AND public.has_workspace_role(f.workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_files f
    WHERE f.id = workspace_file_shares.file_id
      AND public.has_workspace_role(f.workspace_id, ARRAY['owner', 'admin', 'hr', 'manager'])
  )
);

-- WORKSPACE FILE ACTIVITIES (Parent: workspace_files)
DROP POLICY IF EXISTS "Members can view file activities" ON public.workspace_file_activities;
CREATE POLICY "workspace_file_activities_select" ON public.workspace_file_activities
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_files f
    WHERE f.id = workspace_file_activities.file_id AND public.is_workspace_member(f.workspace_id)
  )
);

CREATE POLICY "workspace_file_activities_insert" ON public.workspace_file_activities
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_files f
    WHERE f.id = workspace_file_activities.file_id AND public.is_workspace_member(f.workspace_id)
  )
);

-- ============================================================================
-- 12. DOCUMENTS SYSTEM
-- ============================================================================

DROP POLICY IF EXISTS "Members can view documents" ON public.workspace_documents;
CREATE POLICY "workspace_documents_select" ON public.workspace_documents
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_documents_manage" ON public.workspace_documents
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR created_by = auth.uid())
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR created_by = auth.uid());

-- WORKSPACE DOCUMENT VERSIONS (Parent: workspace_documents)
DROP POLICY IF EXISTS "Members can view document versions" ON public.workspace_document_versions;
CREATE POLICY "workspace_document_versions_select" ON public.workspace_document_versions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_versions.document_id AND public.is_workspace_member(d.workspace_id)
  )
);

CREATE POLICY "workspace_document_versions_manage" ON public.workspace_document_versions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_versions.document_id
      AND (public.has_workspace_role(d.workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR d.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_versions.document_id
      AND (public.has_workspace_role(d.workspace_id, ARRAY['owner', 'admin', 'hr', 'manager']) OR d.created_by = auth.uid())
  )
);

-- WORKSPACE DOCUMENT COMMENTS (Parent: workspace_documents)
DROP POLICY IF EXISTS "Members can view document comments" ON public.workspace_document_comments;
CREATE POLICY "workspace_document_comments_select" ON public.workspace_document_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_comments.document_id AND public.is_workspace_member(d.workspace_id)
  )
);

CREATE POLICY "workspace_document_comments_insert" ON public.workspace_document_comments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_comments.document_id AND public.is_workspace_member(d.workspace_id)
  )
  AND user_id = auth.uid()
);

CREATE POLICY "workspace_document_comments_update" ON public.workspace_document_comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_document_comments_delete" ON public.workspace_document_comments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_comments.document_id
      AND public.has_workspace_role(d.workspace_id, ARRAY['owner', 'admin'])
  )
);

-- WORKSPACE DOCUMENT SHARES (Parent: workspace_documents)
DROP POLICY IF EXISTS "Members can view document shares" ON public.workspace_document_shares;
CREATE POLICY "workspace_document_shares_select" ON public.workspace_document_shares
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_shares.document_id AND public.is_workspace_member(d.workspace_id)
  )
);

CREATE POLICY "workspace_document_shares_manage" ON public.workspace_document_shares
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_shares.document_id
      AND public.has_workspace_role(d.workspace_id, ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_documents d
    WHERE d.id = workspace_document_shares.document_id
      AND public.has_workspace_role(d.workspace_id, ARRAY['owner', 'admin'])
  )
);

-- ============================================================================
-- 13. CALENDAR & MEETINGS
-- ============================================================================

DROP POLICY IF EXISTS "Members can view calendar events" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "calendar_events_manage" ON public.calendar_events
FOR ALL TO authenticated
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR created_by = auth.uid()
);

-- CALENDAR EVENT PARTICIPANTS (Parent: calendar_events)
DROP POLICY IF EXISTS "Members can view participants" ON public.calendar_event_participants;
CREATE POLICY "calendar_event_participants_select" ON public.calendar_event_participants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_participants.event_id AND public.is_workspace_member(e.workspace_id)
  )
);

CREATE POLICY "calendar_event_participants_manage" ON public.calendar_event_participants
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_participants.event_id
      AND (public.has_workspace_role(e.workspace_id, ARRAY['owner', 'admin', 'manager']) OR e.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_participants.event_id
      AND (public.has_workspace_role(e.workspace_id, ARRAY['owner', 'admin', 'manager']) OR e.created_by = auth.uid())
  )
);

-- CALENDAR EVENT ATTACHMENTS (Parent: calendar_events)
DROP POLICY IF EXISTS "Members can view event attachments" ON public.calendar_event_attachments;
CREATE POLICY "calendar_event_attachments_select" ON public.calendar_event_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_attachments.event_id AND public.is_workspace_member(e.workspace_id)
  )
);

CREATE POLICY "calendar_event_attachments_manage" ON public.calendar_event_attachments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_attachments.event_id
      AND (public.has_workspace_role(e.workspace_id, ARRAY['owner', 'admin', 'manager']) OR e.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_attachments.event_id
      AND (public.has_workspace_role(e.workspace_id, ARRAY['owner', 'admin', 'manager']) OR e.created_by = auth.uid())
  )
);

-- CALENDAR EVENT COMMENTS (Parent: calendar_events)
DROP POLICY IF EXISTS "Members can view event comments" ON public.calendar_event_comments;
CREATE POLICY "calendar_event_comments_select" ON public.calendar_event_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_comments.event_id AND public.is_workspace_member(e.workspace_id)
  )
);

CREATE POLICY "calendar_event_comments_insert" ON public.calendar_event_comments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_comments.event_id AND public.is_workspace_member(e.workspace_id)
  )
  AND user_id = auth.uid()
);

CREATE POLICY "calendar_event_comments_delete" ON public.calendar_event_comments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_event_comments.event_id AND public.has_workspace_role(e.workspace_id, ARRAY['owner', 'admin'])
  )
);

-- WORKSPACE MEETINGS
DROP POLICY IF EXISTS "Members can view workspace meetings" ON public.workspace_meetings;
DROP POLICY IF EXISTS "Members can create workspace meetings" ON public.workspace_meetings;
DROP POLICY IF EXISTS "Members can update workspace meetings" ON public.workspace_meetings;

CREATE POLICY "workspace_meetings_select" ON public.workspace_meetings
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_meetings_manage" ON public.workspace_meetings
FOR ALL TO authenticated
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  OR created_by = auth.uid()
);
