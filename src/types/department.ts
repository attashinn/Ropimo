export type DepartmentIconKey =
  | "code"
  | "design"
  | "video"
  | "marketing"
  | "hr"
  | "sales"
  | "ops"
  | "building";

export type DepartmentRole = "lead" | "manager" | "member";

export interface DepartmentPermissions {
  isWorkspaceAdmin: boolean;
  departmentRole: DepartmentRole | "none";
  canAccessDepartment: boolean;
  canManageMembers: boolean;
  canAssignLead: boolean;
  canEditSettings: boolean;
  canCreateProjects: boolean;
  canCreateTasks: boolean;
  canDeleteDepartment: boolean;
  canUploadFiles: boolean;
  canViewActivity: boolean;
}

export interface Department {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  color: string;
  lead_id?: string | null;
  status?: "active" | "archived" | "paused";
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMemberAvatar {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initial: string;
  bg?: string;
  role?: DepartmentRole;
}

export interface DepartmentWithStats extends Department {
  leadName?: string | null;
  leadRole?: string | null;
  leadId?: string | null;
  memberCount: number;
  projectCount: number;
  taskCount: number;
  members: DepartmentMemberAvatar[];
  isMember?: boolean;
  userRoleInDept?: DepartmentRole | null;
  colorScheme?: {
    bg: string;
    text: string;
  };
}

export interface CreateDepartmentInput {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  leadId?: string | null;
}

export interface UpdateDepartmentInput {
  departmentId: string;
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  leadId?: string | null;
}
