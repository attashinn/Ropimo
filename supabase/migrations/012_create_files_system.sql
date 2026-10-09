-- 1. Create workspace_folders table
CREATE TABLE IF NOT EXISTS public.workspace_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.workspace_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('private', 'department', 'company', 'specific')) DEFAULT 'company',
  is_starred BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_folders_ws ON public.workspace_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_folders_parent ON public.workspace_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_folders_dept ON public.workspace_folders(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_folders_proj ON public.workspace_folders(project_id);

-- 2. Create workspace_files table
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document',
  extension TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('private', 'department', 'company', 'specific')) DEFAULT 'company',
  is_starred BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_files_ws ON public.workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_folder ON public.workspace_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_type ON public.workspace_files(file_type);
CREATE INDEX IF NOT EXISTS idx_workspace_files_dept ON public.workspace_files(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_proj ON public.workspace_files(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_uploader ON public.workspace_files(uploaded_by);

-- 3. Create workspace_file_shares table
CREATE TABLE IF NOT EXISTS public.workspace_file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.workspace_files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')) DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_shares_file ON public.workspace_file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_user ON public.workspace_file_shares(user_id);

-- 4. Create workspace_file_activities table
CREATE TABLE IF NOT EXISTS public.workspace_file_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.workspace_files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_activities_file ON public.workspace_file_activities(file_id);

-- 5. Enable RLS
ALTER TABLE public.workspace_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_file_activities ENABLE ROW LEVEL SECURITY;

-- 6. Policies
DROP POLICY IF EXISTS "Members can view workspace folders" ON public.workspace_folders;
CREATE POLICY "Members can view workspace folders"
ON public.workspace_folders FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can manage workspace folders" ON public.workspace_folders;
CREATE POLICY "Members can manage workspace folders"
ON public.workspace_folders FOR ALL
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view workspace files" ON public.workspace_files;
CREATE POLICY "Members can view workspace files"
ON public.workspace_files FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can manage workspace files" ON public.workspace_files;
CREATE POLICY "Members can manage workspace files"
ON public.workspace_files FOR ALL
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can manage shares" ON public.workspace_file_shares;
CREATE POLICY "Members can manage shares"
ON public.workspace_file_shares FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Members can manage activities" ON public.workspace_file_activities;
CREATE POLICY "Members can manage activities"
ON public.workspace_file_activities FOR ALL
USING (true)
WITH CHECK (true);
