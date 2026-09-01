export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  logo_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  role?: WorkspaceRole;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  user?: {
    email?: string;
    full_name?: string;
  };
}
