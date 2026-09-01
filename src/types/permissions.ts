/**
 * Ropimo Permission Types
 * Central type definitions for the RBAC permission system.
 */

export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "guest";
export type DepartmentRole = "lead" | "member" | "guest" | "none";

/**
 * A resolved user context — fetched once per request and passed through the system.
 * Contains the authenticated user's workspace role and all department memberships.
 */
export interface UserContext {
  userId: string;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  /** true for owner, admin, or manager roles */
  isOwnerOrAdmin: boolean;
  /** Department memberships with per-department role */
  deptMemberships: DeptMembership[];
  /** Convenience: IDs of all departments this user belongs to */
  deptIds: string[];
  /** true if user leads any department */
  isDeptLead: boolean;
  /** IDs of departments where user is lead */
  ledDeptIds: string[];
}

export interface DeptMembership {
  deptId: string;
  role: DepartmentRole;
}

/**
 * Result type for permission checks that require explanation.
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Workspace-level capabilities enum (for feature gating).
 */
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
