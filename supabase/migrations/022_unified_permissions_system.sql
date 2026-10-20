-- ==============================================================================
-- 022_unified_permissions_system.sql
-- Unified Permission & Role System: Database Schema, Helper Functions & RLS
-- Roles: owner, admin, hr, manager, member
-- Department lead: department_members.is_lead
-- ==============================================================================

-- 1. WORKSPACE MEMBERS ROLE CONSTRAINT & DEACTIVATION
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'admin', 'hr', 'manager', 'member'));

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_workspace_members_deactivated 
ON public.workspace_members(workspace_id, is_deactivated);

-- Update workspace_invitations role constraint to match
ALTER TABLE public.workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;
ALTER TABLE public.workspace_invitations ADD CONSTRAINT workspace_invitations_role_check 
CHECK (role IN ('owner', 'admin', 'hr', 'manager', 'member'));

-- 2. DEPARTMENT MEMBERS LEAD FLAG
ALTER TABLE public.department_members 
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT false;

-- Sync existing leads if role was set to 'lead'
UPDATE public.department_members 
SET is_lead = true 
WHERE role = 'lead' AND is_lead = false;

CREATE INDEX IF NOT EXISTS idx_dept_members_lead 
ON public.department_members(department_id, user_id, is_lead);

-- 3. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ws ON public.audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 4. SECURITY DEFINER HELPER FUNCTIONS

-- Prior function signatures replaced in-place via CREATE OR REPLACE FUNCTION below

-- Helper: has_workspace_role
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
      AND COALESCE(is_deactivated, false) = false
  );
$$;

-- Helper: is_department_manager
-- Owner/Admin has manager power across all departments in workspace.
-- Manager role has manager power if they lead the department.
CREATE OR REPLACE FUNCTION public.is_department_manager(dept_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = u_id
    WHERE d.id = dept_id
      AND COALESCE(wm.is_deactivated, false) = false
      AND (
        wm.role IN ('owner', 'admin')
        OR (
          wm.role = 'manager'
          AND (
            d.lead_id = u_id
            OR EXISTS (
              SELECT 1 FROM public.department_members dm
              WHERE dm.department_id = dept_id AND dm.user_id = u_id AND dm.is_lead = true
            )
          )
        )
      )
  );
$$;

-- 5. RLS POLICIES FOR AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Owners and admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Active workspace members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Active workspace members can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr', 'manager', 'member'])
);

-- 6. RLS POLICIES FOR WORKSPACE MEMBERS
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
ON public.workspace_members
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can update workspace members" ON public.workspace_members;
CREATE POLICY "Owners and admins can update workspace members"
ON public.workspace_members
FOR UPDATE
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Owners and admins can delete workspace members" ON public.workspace_members;
CREATE POLICY "Owners and admins can delete workspace members"
ON public.workspace_members
FOR DELETE
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- 7. RLS POLICIES FOR DEPARTMENTS
DROP POLICY IF EXISTS "Owners and admins can create departments" ON public.departments;
CREATE POLICY "Owners and admins can create departments"
ON public.departments
FOR INSERT
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Owners, admins and dept managers can update departments" ON public.departments;
CREATE POLICY "Owners, admins and dept managers can update departments"
ON public.departments
FOR UPDATE
USING (public.is_department_manager(id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can delete departments" ON public.departments;
CREATE POLICY "Owners and admins can delete departments"
ON public.departments
FOR DELETE
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- 8. RLS POLICIES FOR PROJECTS
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
CREATE POLICY "Members can view projects"
ON public.projects
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
  OR (
    department_id IS NOT NULL 
    AND public.is_department_manager(department_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Authorized roles can manage projects" ON public.projects;
CREATE POLICY "Authorized roles can manage projects"
ON public.projects
FOR ALL
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
  OR (
    department_id IS NOT NULL 
    AND public.is_department_manager(department_id, auth.uid())
  )
)
WITH CHECK (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
  OR (
    department_id IS NOT NULL 
    AND public.is_department_manager(department_id, auth.uid())
  )
);

-- 9. RLS POLICIES FOR CANDIDATES AND INTERVIEWS
DROP POLICY IF EXISTS "Authorized roles can view candidates" ON public.candidates;
CREATE POLICY "Authorized roles can view candidates"
ON public.candidates
FOR SELECT
USING (
  public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr'])
  OR EXISTS (
    SELECT 1 FROM public.candidate_applications ca
    JOIN public.job_openings jo ON jo.id = ca.job_opening_id
    WHERE ca.candidate_id = candidates.id
      AND jo.department_id IS NOT NULL
      AND public.is_department_manager(jo.department_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.interviews i
    WHERE i.candidate_id = candidates.id AND i.interviewer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized roles can manage candidates" ON public.candidates;
CREATE POLICY "Authorized roles can manage candidates"
ON public.candidates
FOR ALL
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));

DROP POLICY IF EXISTS "Authorized roles can view candidate offers" ON public.offers;
CREATE POLICY "Authorized roles can view candidate offers"
ON public.offers
FOR ALL
USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'hr']));
