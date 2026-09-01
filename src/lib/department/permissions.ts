import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DepartmentPermissions, DepartmentRole } from "@/types/department";

/**
 * Resolve user's effective department permissions and role.
 * Security is verified strictly server-side.
 */
export async function getDepartmentUserRoleAndPermissions(
  departmentId: string,
  workspaceId: string,
  explicitUserId?: string
): Promise<DepartmentPermissions> {
  const defaultNoAccess: DepartmentPermissions = {
    isWorkspaceAdmin: false,
    departmentRole: "none",
    canAccessDepartment: false,
    canManageMembers: false,
    canAssignLead: false,
    canEditSettings: false,
    canCreateProjects: false,
    canCreateTasks: false,
    canDeleteDepartment: false,
    canUploadFiles: false,
    canViewActivity: false,
  };

  if (!departmentId || !workspaceId) {
    return defaultNoAccess;
  }

  let userId = explicitUserId;

  if (!userId) {
    try {
      const authClient = await createClient();
      const { data: authData } = await authClient.auth.getUser();
      if (authData?.user) {
        userId = authData.user.id;
      }
    } catch {
      // CLI / Background script context
    }
  }

  const adminClient = createAdminClient();

  if (!userId) {
    return defaultNoAccess;
  }

  // 1. Check workspace membership & role
  const { data: wsMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!wsMember) {
    return defaultNoAccess;
  }

  const isWorkspaceAdmin = wsMember.role === "owner" || wsMember.role === "admin";

  // 2. Check department membership & role
  const { data: deptMember, error: deptMemberErr } = await adminClient
    .from("department_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("department_id", departmentId)
    .eq("user_id", userId)
    .maybeSingle();

  // Also check department created_by or lead
  const { data: deptRow } = await adminClient
    .from("departments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", departmentId)
    .maybeSingle();

  let rawRole: string | null = null;
  if (deptMember) {
    rawRole = (deptMember as any).role?.toLowerCase() || null;
    if (!rawRole && (deptMember as any).job_title) {
      const jt = (deptMember as any).job_title.toLowerCase();
      if (jt.includes("lead") || jt.includes("head") || jt.includes("director")) rawRole = "lead";
      else if (jt.includes("manager")) rawRole = "manager";
      else rawRole = "member";
    }
  }

  if (!rawRole && deptRow) {
    if ((deptRow as any).lead_id === userId) rawRole = "lead";
    else if ((deptRow as any).created_by === userId && isWorkspaceAdmin) rawRole = "lead";
  }

  let departmentRole: DepartmentRole | "none" = "none";
  if (rawRole === "lead") departmentRole = "lead";
  else if (rawRole === "manager") departmentRole = "manager";
  else if (rawRole === "member" || deptMember) departmentRole = "member";

  // If user is workspace owner/admin, they have super-admin department access
  if (isWorkspaceAdmin) {
    return {
      isWorkspaceAdmin: true,
      departmentRole: departmentRole !== "none" ? departmentRole : "lead",
      canAccessDepartment: true,
      canManageMembers: true,
      canAssignLead: true,
      canEditSettings: true,
      canCreateProjects: true,
      canCreateTasks: true,
      canDeleteDepartment: true,
      canUploadFiles: true,
      canViewActivity: true,
    };
  }

  // If user is NOT a member of this department, deny access (403)
  if (departmentRole === "none") {
    return defaultNoAccess;
  }

  // Department Lead
  if (departmentRole === "lead") {
    return {
      isWorkspaceAdmin: false,
      departmentRole: "lead",
      canAccessDepartment: true,
      canManageMembers: true,
      canAssignLead: true,
      canEditSettings: true,
      canCreateProjects: true,
      canCreateTasks: true,
      canDeleteDepartment: false, // Only workspace owners/admins can delete entire department
      canUploadFiles: true,
      canViewActivity: true,
    };
  }

  // Department Manager
  if (departmentRole === "manager") {
    return {
      isWorkspaceAdmin: false,
      departmentRole: "manager",
      canAccessDepartment: true,
      canManageMembers: false,
      canAssignLead: false,
      canEditSettings: false,
      canCreateProjects: true,
      canCreateTasks: true,
      canDeleteDepartment: false,
      canUploadFiles: true,
      canViewActivity: true,
    };
  }

  // Standard Department Member
  return {
    isWorkspaceAdmin: false,
    departmentRole: "member",
    canAccessDepartment: true,
    canManageMembers: false,
    canAssignLead: false,
    canEditSettings: false,
    canCreateProjects: false,
    canCreateTasks: true,
    canDeleteDepartment: false,
    canUploadFiles: true,
    canViewActivity: true,
  };
}
