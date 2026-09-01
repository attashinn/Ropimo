/**
 * Ropimo Centralized Permission Engine
 *
 * Single source of truth for ALL authorization decisions.
 * - Never checks permissions scattered across components.
 * - All server actions and data queries must use this.
 * - Server-only: never import in client components.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  UserContext,
  WorkspaceCapability,
  DeptMembership,
  DepartmentRole,
  WorkspaceRole,
} from "@/types/permissions";
import { Project } from "@/types/project";
import { Task } from "@/types/task";
import { FileItem } from "@/types/files";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTEXT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the full UserContext for the currently authenticated user in a given workspace.
 * Cached per React render tree — safe to call multiple times without extra DB hits.
 */
export const getUserContext = cache(
  async (workspaceId: string): Promise<UserContext | null> => {
    if (!workspaceId) return null;

    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) return null;

    const adminClient = createAdminClient();

    // Fetch workspace role + department memberships in parallel
    const [{ data: wsMember }, { data: deptRows }] = await Promise.all([
      adminClient
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle(),
      adminClient
        .from("department_members")
        .select("department_id, role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id),
    ]);

    // User is not a workspace member — no access
    if (!wsMember) return null;

    const workspaceRole = wsMember.role as WorkspaceRole;
    const isOwnerOrAdmin = ["owner", "admin", "manager"].includes(workspaceRole);

    const deptMemberships: DeptMembership[] = (deptRows || []).map((row: any) => ({
      deptId: row.department_id,
      role: (row.role || "member") as DepartmentRole,
    }));

    const deptIds = deptMemberships.map((d) => d.deptId);
    const ledDeptIds = deptMemberships
      .filter((d) => d.role === "lead")
      .map((d) => d.deptId);
    const isDeptLead = ledDeptIds.length > 0;

    return {
      userId: user.id,
      workspaceId,
      workspaceRole,
      isOwnerOrAdmin,
      deptMemberships,
      deptIds,
      isDeptLead,
      ledDeptIds,
    };
  }
);

/**
 * Get UserContext or throw if unauthenticated.
 * Use in server actions that require authentication.
 */
export async function requireUserContext(workspaceId: string): Promise<UserContext> {
  const ctx = await getUserContext(workspaceId);
  if (!ctx) {
    throw new Error("Unauthorized: You must be a workspace member to perform this action.");
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WORKSPACE CAPABILITIES
// ─────────────────────────────────────────────────────────────────────────────

const OWNER_ADMIN_CAPS: WorkspaceCapability[] = [
  "manage_workspace",
  "invite_people",
  "remove_people",
  "change_roles",
  "view_all_people",
  "create_department",
  "delete_department",
  "manage_any_department",
  "create_project",
  "delete_any_project",
  "manage_any_project",
  "view_all_projects",
  "create_any_task",
  "delete_any_task",
  "manage_any_task",
  "view_all_tasks",
  "view_recruitment",
  "manage_recruitment",
  "approve_leave",
  "view_all_attendance",
  "view_all_leave",
  "manage_workspace_files",
  "view_workspace_activities",
];

const DEPT_LEAD_CAPS: WorkspaceCapability[] = [
  "view_all_people",
  "create_project", // own dept only — enforced at resource level
  "create_any_task", // own dept only
  "view_all_projects", // filtered to accessible
  "view_all_tasks", // filtered to accessible
  "approve_leave", // own dept only
  "view_all_attendance", // own dept only
  "view_all_leave",
  "view_workspace_activities",
];

const MEMBER_CAPS: WorkspaceCapability[] = [
  "view_all_people",
  "view_all_projects", // filtered to accessible
  "view_all_tasks", // filtered to assigned
  "view_workspace_activities",
];

/**
 * Check if a user context has a given workspace capability.
 */
export function can(ctx: UserContext, cap: WorkspaceCapability): boolean {
  if (ctx.isOwnerOrAdmin) {
    return OWNER_ADMIN_CAPS.includes(cap);
  }
  if (ctx.isDeptLead) {
    return [...DEPT_LEAD_CAPS, ...MEMBER_CAPS].includes(cap);
  }
  return MEMBER_CAPS.includes(cap);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PEOPLE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canViewPeople(ctx: UserContext): boolean {
  return true; // All workspace members can see the people directory
}

export function canInvitePeople(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

export function canRemovePerson(ctx: UserContext, targetUserId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  // Users can remove themselves
  return ctx.userId === targetUserId;
}

export function canChangePersonRole(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

export function canEditPerson(ctx: UserContext, targetUserId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.userId === targetUserId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DEPARTMENT PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canCreateDepartment(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

export function canDeleteDepartment(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

export function canManageDepartment(ctx: UserContext, deptId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.ledDeptIds.includes(deptId);
}

export function canViewDepartment(ctx: UserContext, deptId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.deptIds.includes(deptId);
}

export function canManageDeptMembers(ctx: UserContext, deptId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.ledDeptIds.includes(deptId);
}

export function canAssignDeptLead(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROJECT PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canCreateProject(ctx: UserContext, departmentId?: string | null): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  // Dept leads can create projects for their own department
  if (ctx.isDeptLead && departmentId && ctx.ledDeptIds.includes(departmentId)) return true;
  return false;
}

export function canManageProject(
  ctx: UserContext,
  project: { created_by?: string | null; manager_id?: string | null; lead_id?: string | null; department_id?: string | null }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (project.created_by === ctx.userId) return true;
  if (project.manager_id === ctx.userId) return true;
  if (project.lead_id === ctx.userId) return true;
  if (ctx.isDeptLead && project.department_id && ctx.ledDeptIds.includes(project.department_id)) return true;
  return false;
}

export function canViewProject(
  ctx: UserContext,
  project: {
    created_by?: string | null;
    manager_id?: string | null;
    lead_id?: string | null;
    department_id?: string | null;
    member_ids?: string[];
  }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (project.created_by === ctx.userId) return true;
  if (project.manager_id === ctx.userId) return true;
  if (project.lead_id === ctx.userId) return true;
  if (project.member_ids?.includes(ctx.userId)) return true;
  // Dept member can see dept projects
  if (project.department_id && ctx.deptIds.includes(project.department_id)) return true;
  return false;
}

export function canDeleteProject(
  ctx: UserContext,
  project: { created_by?: string | null; manager_id?: string | null }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TASK PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canCreateTask(
  ctx: UserContext,
  opts?: { departmentId?: string | null; projectId?: string | null }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (ctx.isDeptLead) {
    if (opts?.departmentId && ctx.ledDeptIds.includes(opts.departmentId)) return true;
  }
  return false;
}

export function canViewTask(
  ctx: UserContext,
  task: {
    created_by?: string | null;
    department_id?: string | null;
    project_id?: string | null;
    assignees?: { user_id?: string | null }[];
  },
  accessibleProjectIds: string[]
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  // Assigned
  if (task.assignees?.some((a) => a.user_id === ctx.userId)) return true;
  // Created by user
  if (task.created_by === ctx.userId) return true;
  // Dept task in user's led dept
  if (task.department_id && ctx.ledDeptIds.includes(task.department_id)) return true;
  // On accessible project
  if (task.project_id && accessibleProjectIds.includes(task.project_id)) return true;
  // Dept task in user's dept (read-only)
  if (task.department_id && ctx.deptIds.includes(task.department_id)) return true;
  return false;
}

export function canEditTask(
  ctx: UserContext,
  task: {
    created_by?: string | null;
    department_id?: string | null;
    assignees?: { user_id?: string | null }[];
  }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (task.created_by === ctx.userId) return true;
  if (task.assignees?.some((a) => a.user_id === ctx.userId)) return true;
  if (ctx.isDeptLead && task.department_id && ctx.ledDeptIds.includes(task.department_id)) return true;
  return false;
}

export function canDeleteTask(
  ctx: UserContext,
  task: {
    created_by?: string | null;
    department_id?: string | null;
  }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (task.created_by === ctx.userId) return true;
  if (ctx.isDeptLead && task.department_id && ctx.ledDeptIds.includes(task.department_id)) return true;
  return false;
}

export function canAssignTask(ctx: UserContext, task: { department_id?: string | null }): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (ctx.isDeptLead && task.department_id && ctx.ledDeptIds.includes(task.department_id)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FILE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canViewFile(
  ctx: UserContext,
  file: {
    uploaded_by?: string | null;
    department_id?: string | null;
    project_id?: string | null;
    access_level?: string | null;
    shares?: { user_id?: string | null; department_id?: string | null }[];
  },
  accessibleProjectIds: string[]
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (file.uploaded_by === ctx.userId) return true;
  if (file.access_level === "company") return true;
  if (file.shares?.some((s) => s.user_id === ctx.userId)) return true;
  if (file.shares?.some((s) => s.department_id && ctx.deptIds.includes(s.department_id))) return true;
  if (file.department_id && ctx.deptIds.includes(file.department_id)) return true;
  if (file.project_id && accessibleProjectIds.includes(file.project_id)) return true;
  return false;
}

export function canDeleteFile(
  ctx: UserContext,
  file: { uploaded_by?: string | null; department_id?: string | null }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (file.uploaded_by === ctx.userId) return true;
  if (ctx.isDeptLead && file.department_id && ctx.ledDeptIds.includes(file.department_id)) return true;
  return false;
}

export function canUploadFile(ctx: UserContext): boolean {
  return true; // All workspace members can upload
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ATTENDANCE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canViewAttendance(ctx: UserContext, targetUserId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (ctx.userId === targetUserId) return true;
  return false; // Dept leads see dept attendance through a scoped query
}

export function canViewDeptAttendance(ctx: UserContext, deptId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.ledDeptIds.includes(deptId);
}

export function canCheckInForUser(ctx: UserContext, targetUserId: string): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  return ctx.userId === targetUserId; // Employees can only check themselves in
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. LEAVE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canRequestLeave(ctx: UserContext): boolean {
  return true; // All workspace members can request leave
}

export function canApproveLeave(ctx: UserContext, deptId?: string | null): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (!deptId) return false;
  return ctx.ledDeptIds.includes(deptId);
}

export function canViewLeaveRequest(ctx: UserContext, leaveUserId: string, deptId?: string | null): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (ctx.userId === leaveUserId) return true;
  if (ctx.isDeptLead && deptId && ctx.ledDeptIds.includes(deptId)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. RECRUITMENT PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export function canViewRecruitment(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

export function canManageRecruitment(ctx: UserContext): boolean {
  return ctx.isOwnerOrAdmin;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CALENDAR / DOCUMENTS / MEETINGS
// ─────────────────────────────────────────────────────────────────────────────

export function canViewCalendarEvent(
  ctx: UserContext,
  event: {
    created_by?: string | null;
    department_id?: string | null;
    participants?: { user_id?: string | null }[];
  }
): boolean {
  if (ctx.isOwnerOrAdmin) return true;
  if (event.created_by === ctx.userId) return true;
  if (event.participants?.some((p) => p.user_id === ctx.userId)) return true;
  if (event.department_id && ctx.deptIds.includes(event.department_id)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SIDEBAR NAV ITEMS — Which nav items to show
// ─────────────────────────────────────────────────────────────────────────────

export type NavVisibility = {
  overview: boolean;
  departments: boolean;
  people: boolean;
  attendance: boolean;
  leave: boolean;
  projects: boolean;
  myTasks: boolean;
  calendar: boolean;
  files: boolean;
  documents: boolean;
  meetings: boolean;
  recruitment: boolean;
  settings: boolean;
};

export function getNavVisibility(ctx: UserContext): NavVisibility {
  return {
    overview: true,
    departments: true,
    people: ctx.isOwnerOrAdmin,
    attendance: true,
    leave: true,
    projects: true,
    myTasks: true,
    calendar: true,
    files: ctx.isOwnerOrAdmin,
    documents: true,
    meetings: true,
    recruitment: ctx.isOwnerOrAdmin,
    settings: ctx.isOwnerOrAdmin,
  };
}
