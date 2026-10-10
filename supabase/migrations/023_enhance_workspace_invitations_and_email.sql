-- ==============================================================================
-- 023_enhance_workspace_invitations_and_email.sql
-- Unified Workspace Invitations, Email Logging & Dev Outbox System
-- ==============================================================================

-- 1. WORKSPACE INVITATIONS SCHEMA EXTENSIONS
ALTER TABLE public.workspace_invitations
ADD COLUMN IF NOT EXISTS department_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS token_hash TEXT,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resend_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resend_message_id TEXT;

-- Normalize existing emails to lowercase
UPDATE public.workspace_invitations
SET email = LOWER(email)
WHERE email IS NOT NULL AND email != LOWER(email);

-- Ensure email_status check constraint
ALTER TABLE public.workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_email_status_check;
ALTER TABLE public.workspace_invitations ADD CONSTRAINT workspace_invitations_email_status_check
CHECK (email_status IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed'));

-- Populate token_hash for legacy rows that only had token
UPDATE public.workspace_invitations
SET token_hash = encode(sha256(token::bytea), 'hex')
WHERE token IS NOT NULL AND (token_hash IS NULL OR token_hash = '');

-- Indexes for fast token lookup and pending uniqueness
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token_hash
ON public.workspace_invitations(token_hash);

-- Enforce ONE pending invite per (workspace_id, email)
DROP INDEX IF EXISTS idx_one_pending_invite_per_email;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_invite_per_email
ON public.workspace_invitations (workspace_id, LOWER(email))
WHERE status = 'pending' OR status = 'Pending';

-- 2. EMAIL LOG TABLE
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL,
  resend_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON public.email_log(recipient);
CREATE INDEX IF NOT EXISTS idx_email_log_workspace ON public.email_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON public.email_log(created_at DESC);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can view email logs" ON public.email_log;
CREATE POLICY "Owners and admins can view email logs"
ON public.email_log
FOR SELECT
USING (
  workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "Service role and backend can insert email logs" ON public.email_log;
CREATE POLICY "Service role and backend can insert email logs"
ON public.email_log
FOR INSERT
WITH CHECK (true);

-- 3. DEV EMAIL OUTBOX TABLE (dev fallback mailbox)
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  template TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON public.email_outbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient ON public.email_outbox(recipient);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on email_outbox for development" ON public.email_outbox;
CREATE POLICY "Allow select on email_outbox for development"
ON public.email_outbox
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow insert on email_outbox for development" ON public.email_outbox;
CREATE POLICY "Allow insert on email_outbox for development"
ON public.email_outbox
FOR INSERT
WITH CHECK (true);

-- 4. ATOMIC ACCEPT INVITATION RPC
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation_atomic(
  p_token_hash TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_next_emp_id TEXT;
  v_max_emp_num INT := 0;
  v_dept_id UUID;
  v_workspace RECORD;
BEGIN
  -- 1. Find invitation by token_hash or token
  SELECT * INTO v_invite
  FROM public.workspace_invitations
  WHERE (token_hash = p_token_hash OR token = p_token_hash)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or invalid token.');
  END IF;

  -- 2. Verify status
  IF LOWER(v_invite.status) = 'accepted' THEN
    RETURN jsonb_build_object(
      'success', true, 
      'already_accepted', true, 
      'workspace_id', v_invite.workspace_id,
      'role', v_invite.role
    );
  END IF;

  IF LOWER(v_invite.status) = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has been revoked by an administrator.');
  END IF;

  -- 3. Verify expiry
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    UPDATE public.workspace_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has expired.');
  END IF;

  -- 4. Verify email match
  IF LOWER(TRIM(v_invite.email)) != LOWER(TRIM(p_user_email)) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Email mismatch: This invitation was issued for ' || v_invite.email || '.'
    );
  END IF;

  -- 5. Calculate next employee ID for workspace
  SELECT COALESCE(MAX(
    SUBSTRING(employee_id FROM 'EMP-([0-9]+)')::INT
  ), 0) INTO v_max_emp_num
  FROM public.workspace_members
  WHERE workspace_id = v_invite.workspace_id
    AND employee_id ~ '^EMP-[0-9]+$';

  v_next_emp_id := 'EMP-' || LPAD((v_max_emp_num + 1)::TEXT, 3, '0');

  -- 6. Add or update workspace member
  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    full_name,
    job_title,
    employee_id,
    employment_type,
    employment_status,
    hire_date,
    created_at
  ) VALUES (
    v_invite.workspace_id,
    p_user_id,
    v_invite.role,
    COALESCE(p_full_name, v_invite.full_name, split_part(p_user_email, '@', 1)),
    COALESCE(p_job_title, v_invite.job_title, 'Team Member'),
    v_next_emp_id,
    COALESCE(v_invite.employment_type, 'Full-time'),
    'Active',
    now(),
    now()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(workspace_members.full_name, EXCLUDED.full_name),
    job_title = COALESCE(workspace_members.job_title, EXCLUDED.job_title),
    is_deactivated = false,
    employment_status = 'Active';

  -- 7. Add department memberships
  IF v_invite.department_ids IS NOT NULL AND array_length(v_invite.department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY v_invite.department_ids LOOP
      INSERT INTO public.department_members (
        workspace_id,
        department_id,
        user_id,
        role,
        is_lead,
        job_title,
        created_at
      ) VALUES (
        v_invite.workspace_id,
        v_dept_id,
        p_user_id,
        CASE WHEN v_invite.is_lead THEN 'lead' ELSE 'member' END,
        v_invite.is_lead,
        COALESCE(p_job_title, v_invite.job_title, 'Team Member'),
        now()
      )
      ON CONFLICT (department_id, user_id) DO UPDATE SET
        is_lead = EXCLUDED.is_lead,
        role = EXCLUDED.role;
    END LOOP;
  ELSIF v_invite.department_id IS NOT NULL THEN
    INSERT INTO public.department_members (
      workspace_id,
      department_id,
      user_id,
      role,
      is_lead,
      job_title,
      created_at
    ) VALUES (
      v_invite.workspace_id,
      v_invite.department_id,
      p_user_id,
      CASE WHEN v_invite.is_lead THEN 'lead' ELSE 'member' END,
      v_invite.is_lead,
      COALESCE(p_job_title, v_invite.job_title, 'Team Member'),
      now()
    )
    ON CONFLICT (department_id, user_id) DO UPDATE SET
      is_lead = EXCLUDED.is_lead,
      role = EXCLUDED.role;
  END IF;

  -- 8. Mark invitation accepted
  UPDATE public.workspace_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_user_id,
      updated_at = now()
  WHERE id = v_invite.id;

  -- 9. Log audit entry
  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    action,
    target_user_id,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_invite.workspace_id,
    p_user_id,
    'invitation_accepted',
    p_user_id,
    'workspace_invitation',
    v_invite.id::TEXT,
    jsonb_build_object(
      'email', v_invite.email,
      'role', v_invite.role,
      'invited_by', v_invite.invited_by,
      'employee_id', v_next_emp_id
    )
  );

  -- Fetch workspace name for notification context
  SELECT name INTO v_workspace FROM public.workspaces WHERE id = v_invite.workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_invite.workspace_id,
    'workspace_name', COALESCE(v_workspace.name, 'Workspace'),
    'role', v_invite.role,
    'employee_id', v_next_emp_id,
    'invited_by', v_invite.invited_by
  );
END;
$$;
