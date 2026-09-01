-- 1. Create workspace_documents table
CREATE TABLE IF NOT EXISTS public.workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'HR',
  status TEXT NOT NULL DEFAULT 'Published',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  access_level TEXT NOT NULL DEFAULT 'company',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_starred BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  word_count INT DEFAULT 0,
  read_time_minutes INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_docs_ws ON public.workspace_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_cat ON public.workspace_documents(category);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_status ON public.workspace_documents(status);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_author ON public.workspace_documents(author_id);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_dept ON public.workspace_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_proj ON public.workspace_documents(project_id);

-- 2. Create workspace_document_versions table
CREATE TABLE IF NOT EXISTS public.workspace_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  note TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON public.workspace_document_versions(document_id);

-- 3. Create workspace_document_comments table
CREATE TABLE IF NOT EXISTS public.workspace_document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_comments_doc ON public.workspace_document_comments(document_id);

-- 4. Create workspace_document_shares table
CREATE TABLE IF NOT EXISTS public.workspace_document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_shares_doc ON public.workspace_document_shares(document_id);

-- 5. Enable RLS
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_document_shares ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Members can view workspace documents" ON public.workspace_documents;
CREATE POLICY "Members can view workspace documents"
ON public.workspace_documents FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can manage workspace documents" ON public.workspace_documents;
CREATE POLICY "Members can manage workspace documents"
ON public.workspace_documents FOR ALL
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can manage document versions" ON public.workspace_document_versions;
CREATE POLICY "Members can manage document versions"
ON public.workspace_document_versions FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Members can manage document comments" ON public.workspace_document_comments;
CREATE POLICY "Members can manage document comments"
ON public.workspace_document_comments FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Members can manage document shares" ON public.workspace_document_shares;
CREATE POLICY "Members can manage document shares"
ON public.workspace_document_shares FOR ALL
USING (true)
WITH CHECK (true);
