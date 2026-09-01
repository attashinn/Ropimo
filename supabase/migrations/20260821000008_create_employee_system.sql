-- 1. Extend workspace_members with complete employee profiles
ALTER TABLE public.workspace_members
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Dhaka, Bangladesh',
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time', 'Part-time', 'Contractor', 'Intern')),
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Active' CHECK (employment_status IN ('Active', 'On Leave', 'Probation', 'Inactive', 'Pending')),
ADD COLUMN IF NOT EXISTS hire_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Create employee_work_history table
CREATE TABLE IF NOT EXISTS public.employee_work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  department_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_history_user ON public.employee_work_history(user_id);
CREATE INDEX IF NOT EXISTS idx_work_history_workspace ON public.employee_work_history(workspace_id);

ALTER TABLE public.employee_work_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view work history" ON public.employee_work_history;
CREATE POLICY "Members can view work history"
ON public.employee_work_history
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage work history" ON public.employee_work_history;
CREATE POLICY "Owners and admins can manage work history"
ON public.employee_work_history
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- 3. Create employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Other' CHECK (document_type IN ('CV/Resume', 'Offer Letter', 'Contract', 'NDA', 'Identity', 'Certificate', 'Other')),
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_user ON public.employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_workspace ON public.employee_documents(workspace_id);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view employee documents" ON public.employee_documents;
CREATE POLICY "Members can view employee documents"
ON public.employee_documents
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage employee documents" ON public.employee_documents;
CREATE POLICY "Owners and admins can manage employee documents"
ON public.employee_documents
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- 4. Create employee_assets table
CREATE TABLE IF NOT EXISTS public.employee_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'Hardware' CHECK (asset_type IN ('Hardware', 'Software Account', 'Access Card', 'Other')),
  serial_number TEXT,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Returned', 'Lost', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_assets_user ON public.employee_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_assets_workspace ON public.employee_assets(workspace_id);

ALTER TABLE public.employee_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view employee assets" ON public.employee_assets;
CREATE POLICY "Members can view employee assets"
ON public.employee_assets
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can manage employee assets" ON public.employee_assets;
CREATE POLICY "Owners and admins can manage employee assets"
ON public.employee_assets
FOR ALL
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'))
WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));
