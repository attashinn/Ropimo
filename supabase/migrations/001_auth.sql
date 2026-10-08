-- 001_auth.sql
-- Core Authentication & Workspace schema for Ropimo

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to auto-create profile row on auth.users insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  team_size TEXT DEFAULT '1-10',
  industry TEXT DEFAULT 'Other',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Alter existing workspaces table to add missing columns if table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'industry') THEN
    ALTER TABLE public.workspaces ADD COLUMN industry TEXT DEFAULT 'Other';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'team_size') THEN
    ALTER TABLE public.workspaces ADD COLUMN team_size TEXT DEFAULT '1-10';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'owner_id') THEN
    ALTER TABLE public.workspaces ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'slug') THEN
    ALTER TABLE public.workspaces ADD COLUMN slug TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'created_by') THEN
    ALTER TABLE public.workspaces ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Sync owner_id and created_by
  UPDATE public.workspaces SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
  UPDATE public.workspaces SET created_by = owner_id WHERE created_by IS NULL AND owner_id IS NOT NULL;
END $$;

-- 3. Workspace Members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT workspace_members_unique_user UNIQUE (workspace_id, user_id)
);

-- Relax workspace_members role constraint if needed to support hr/manager
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('owner', 'admin', 'hr', 'manager', 'member', 'guest'));

-- 4. Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'hr', 'manager', 'member', 'guest')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON public.invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Security helper functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members m1
      JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- WORKSPACES POLICIES
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(id) 
    OR (owner_id IS NOT NULL AND owner_id = auth.uid())
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspace"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    (owner_id IS NOT NULL AND owner_id = auth.uid())
    OR (created_by IS NOT NULL AND created_by = auth.uid())
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Owners and admins can update workspace" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspace"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    public.is_workspace_admin_or_owner(id) 
    OR (owner_id IS NOT NULL AND owner_id = auth.uid())
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    public.is_workspace_admin_or_owner(id) 
    OR (owner_id IS NOT NULL AND owner_id = auth.uid())
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  );

-- WORKSPACE MEMBERS POLICIES
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Owners/admins or workspace creator can insert members" ON public.workspace_members;
CREATE POLICY "Owners/admins or workspace creator can insert members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_workspace_admin_or_owner(workspace_id) OR
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND (owner_id = auth.uid() OR created_by = auth.uid()))
  );

-- INVITATIONS POLICIES
DROP POLICY IF EXISTS "Members can read workspace invitations" ON public.invitations;
CREATE POLICY "Members can read workspace invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Owners and admins can create invitations" ON public.invitations;
CREATE POLICY "Owners and admins can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_admin_or_owner(workspace_id) AND invited_by = auth.uid()
  );
