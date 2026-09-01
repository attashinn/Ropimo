-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  icon TEXT DEFAULT '🏢',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- 3. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 5. Helper function: is_workspace_member
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
  );
$$;

-- 6. Helper function: get_workspace_role
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = u_id
  LIMIT 1;
$$;

-- 7. RLS Policies for Workspaces
-- SELECT: Users can view workspaces they are members of
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
CREATE POLICY "Members can view workspace"
ON public.workspaces
FOR SELECT
USING (
  public.is_workspace_member(id, auth.uid())
);

-- INSERT: Authenticated users can create a workspace
DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspace"
ON public.workspaces
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = created_by
);

-- UPDATE: Owners and Admins can update workspace details
DROP POLICY IF EXISTS "Owners and admins can update workspace" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspace"
ON public.workspaces
FOR UPDATE
USING (
  public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin')
);

-- DELETE: Only owners can delete workspace
DROP POLICY IF EXISTS "Owners can delete workspace" ON public.workspaces;
CREATE POLICY "Owners can delete workspace"
ON public.workspaces
FOR DELETE
USING (
  public.get_workspace_role(id, auth.uid()) = 'owner'
);

-- 8. RLS Policies for Workspace Members
-- SELECT: Members can view all members of their workspaces
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
ON public.workspace_members
FOR SELECT
USING (
  public.is_workspace_member(workspace_id, auth.uid())
);

-- INSERT: Owners and admins can add members, or self-join when creating workspace
DROP POLICY IF EXISTS "Owners and admins or creators can insert members" ON public.workspace_members;
CREATE POLICY "Owners and admins or creators can insert members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND role = 'owner')
  OR
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- UPDATE: Owners and admins can update member roles
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.workspace_members;
CREATE POLICY "Owners and admins can update member roles"
ON public.workspace_members
FOR UPDATE
USING (
  public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- DELETE: Owners/admins can remove members or user can leave
DROP POLICY IF EXISTS "Owners, admins or self can remove members" ON public.workspace_members;
CREATE POLICY "Owners, admins or self can remove members"
ON public.workspace_members
FOR DELETE
USING (
  user_id = auth.uid() OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- 9. Transactional RPC function for creating a workspace
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  name TEXT,
  slug TEXT,
  icon TEXT DEFAULT '🏢'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_ws_id UUID;
  new_ws_record RECORD;
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Workspace
  INSERT INTO public.workspaces (name, slug, icon, created_by)
  VALUES (name, slug, icon, caller_id)
  RETURNING id, name, slug, icon, created_at INTO new_ws_record;

  new_ws_id := new_ws_record.id;

  -- Insert Member as Owner
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
