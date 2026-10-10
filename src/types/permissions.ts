/**
 * Ropimo Permission Types
 * Single source of truth for RBAC permission system types.
 */

export type WorkspaceRole = "owner" | "admin" | "hr" | "manager" | "member" | "guest";
export type DepartmentRole = "lead" | "member" | "guest" | "none";
export type PermissionScope = "workspace" | "department" | "own";

/** Capability strings used in the OWNER_ADMIN_CAPS / DEPT_LEAD_CAPS / MEMBER_CAPS arrays */
export type WorkspaceCapability =
  | "manage_workspace"
  | "invite_people"
  | "remove_people"
  | "change_roles"
  | "view_all_people"
  | "create_department"
  | "delete_department"
  | "manage_any_department"
  | "create_project"
  | "delete_any_project"
  | "manage_any_project"
  | "view_all_projects"
  | "create_any_task"
  | "delete_any_task"
  | "manage_any_task"
  | "view_all_tasks"
  | "view_recruitment"
  | "manage_recruitment"
  | "approve_leave"
  | "view_all_attendance"
  | "view_all_leave"
  | "manage_workspace_files"
  | "view_workspace_activities";

export type PermissionKey =
  | "workspace:settings"
  | "workspace:billing"
  | "members:invite"
  | "members:manage_roles"
  | "departments:create_delete"
  | "departments:edit"
  | "projects:view"
  | "projects:manage"
  | "tasks:create"
  | "tasks:manage"
  | "files:view"
  | "files:manage"
  | "jobs:manage"
  | "jobs:publish"
  | "candidates:view"
  | "candidates:manage"
  | "interviews:schedule"
  | "scorecards:submit"
  | "offers:manage"
  | "leave:request"
  | "leave:approve"
  | "attendance:view_team"
  | "employee_private_info:view"
  | "audit_log:view"
  | "ai:copilot";

export type FileFolderAccessLevel =
  | "company"
  | "department"
  | "hr"
  | "admin"
  | "private";

export interface PermissionResource {
  workspaceId?: string;
  departmentId?: string;
  projectId?: string;
  taskId?: string;
  userId?: string;
  targetRole?: WorkspaceRole;
  targetUserId?: string;
  accessLevel?: FileFolderAccessLevel;
  folderAccessLevel?: FileFolderAccessLevel;
  status?: string;
  createdBy?: string;
  assigneeIds?: string[];
  memberIds?: string[];
  interviewerId?: string;
  assignedInterviewerIds?: string[];
  id?: string;
}

export interface PermissionUser {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  leadDepartmentIds: string[];
  memberDepartmentIds: string[];
  projectIds?: string[];
  isDeactivated?: boolean;
}

export interface DeptMembership {
  deptId: string;
  role: DepartmentRole;
  isLead?: boolean;
}

/**
 * Resolved UserContext used across layout and UI components
 */
export interface UserContext {
  userId: string;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  /** true for owner or admin roles */
  isOwnerOrAdmin: boolean;
  /** Department memberships with per-department role */
  deptMemberships: DeptMembership[];
  /** Convenience: IDs of all departments this user belongs to */
  deptIds: string[];
  /** true if user leads any department */
  isDeptLead: boolean;
  /** IDs of departments where user is lead */
  ledDeptIds: string[];
  /** true if member is deactivated */
  isDeactivated?: boolean;
}

export interface PermissionDefinition {
  key: PermissionKey;
  name: string;
  category: string;
  description: string;
  owner: string;
  admin: string;
  hr: string;
  manager: string;
  member: string;
  defaultScope: PermissionScope;
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  target_user_id?: string | null;
  target_user_name?: string | null;
  entity_type: string;
  entity_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
