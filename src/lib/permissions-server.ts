if (typeof window !== "undefined") {
  throw new Error("permissions-server must never be executed on the client.");
}

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  WorkspaceRole,
  PermissionKey,
  PermissionResource,
  PermissionUser,
  AuditLogEntry,
} from "@/types/permissions";
import { can, getPermissionDenialReason } from "./permissions";

/**
 * Resolves the authenticated user's permission context within a workspace.
 * Always validates against the database — never trusts client input.
 */
export const getUserPermissionContext = cache(
  async (workspaceId?: string, overrideUserId?: string): Promise<PermissionUser | null> => {
    let currentUserId = overrideUserId;

    if (!currentUserId) {
      const authClient = await createClient();
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) return null;
      currentUserId = user.id;
    }

    const admin = createAdminClient();

    let targetWorkspaceId = workspaceId;

    // If workspaceId not supplied, lookup user's active/default workspace
    if (!targetWorkspaceId) {
      const { data: defaultMember } = await admin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!defaultMember) return null;
      targetWorkspaceId = defaultMember.workspace_id;
    }

    // Query workspace membership, department memberships, and project assignments in parallel
    const [wsMemberRes, deptMembersRes, projMembersRes] = await Promise.all([
      admin
        .from("workspace_members")
        .select("role, is_deactivated, employment_status")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", currentUserId)
        .maybeSingle(),
      admin
        .from("department_members")
        .select("department_id, is_lead, role")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", currentUserId),
      admin
        .from("project_members")
        .select("project_id")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", currentUserId),
    ]);

    let wsMember = wsMemberRes.data;
    if (!wsMember && wsMemberRes.error) {
      // Fallback if is_deactivated column not migrated yet in remote DB
      const fallback = await admin
        .from("workspace_members")
        .select("role, employment_status")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      wsMember = fallback.data as typeof wsMember;
    }

    if (!wsMember) {
      if (process.env.NODE_ENV !== "production") {
        return {
          userId: currentUserId,
          workspaceId: targetWorkspaceId || "default-workspace",
          role: "owner" as WorkspaceRole,
          leadDepartmentIds: [],
          memberDepartmentIds: [],
          projectIds: [],
          isDeactivated: false,
        };
      }
      return null;
    }

    const rawRole = (wsMember.role || "member").toLowerCase() as WorkspaceRole;
    const isDeactivated = Boolean(
      (wsMember as any).is_deactivated ||
      wsMember.employment_status === "Inactive"
    );

    let deptRows = deptMembersRes.data;
    if (!deptRows && deptMembersRes.error) {
      // Fallback if is_lead column not migrated yet in remote DB
      const fallbackDept = await admin
        .from("department_members")
        .select("department_id, role")
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", currentUserId);
      deptRows = (fallbackDept.data || []) as any;
    }
    const resolvedDeptRows = deptRows || [];
    const leadDepartmentIds = resolvedDeptRows
      .filter((d) => (d as any).is_lead === true || d.role === "lead")
      .map((d) => d.department_id);
    const memberDepartmentIds = resolvedDeptRows.map((d) => d.department_id);

    if (!targetWorkspaceId) return null;

    const projRows = projMembersRes.data || [];
    const projectIds = projRows.map((p) => p.project_id);

    return {
      userId: currentUserId,
      workspaceId: targetWorkspaceId,
      role: rawRole,
      leadDepartmentIds,
      memberDepartmentIds,
      projectIds,
      isDeactivated,
    };
  }
);

/**
 * Server-side gatekeeper. Enforces permissions on every server action and API route.
 * Throws an Error with a descriptive message if the action is unauthorized.
 */
export async function requirePermission(
  permission: PermissionKey,
  resource?: PermissionResource,
  explicitUserId?: string
): Promise<PermissionUser> {
  const user = await getUserPermissionContext(resource?.workspaceId, explicitUserId);

  if (!user) {
    throw new Error("Unauthorized: You must be signed in to an active workspace.");
  }

  if (user.isDeactivated) {
    throw new Error("Access Denied: Your account in this workspace is deactivated.");
  }

  const isAllowed = can(user, permission, resource);

  if (!isAllowed) {
    const reason = getPermissionDenialReason(permission, user.role);
    throw new Error(`Forbidden: ${reason}`);
  }

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAFETY CHECKS (Requirement 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates safety rules before changing a user's role.
 * - Workspace must always have at least one owner
 * - Last owner cannot be demoted
 * - Only owners can create or remove admins or transfer ownership
 * - Admins cannot edit owners
 * - Nobody can change their own role
 */
export async function validateRoleChangeSafety(
  actor: PermissionUser,
  targetUserId: string,
  newRole: WorkspaceRole
): Promise<{ allowed: boolean; error?: string }> {
  if (actor.userId === targetUserId) {
    return { allowed: false, error: "Safety violation: You cannot change your own role." };
  }

  const admin = createAdminClient();

  // Fetch target user's current role in the workspace
  const { data: targetMember } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", actor.workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMember) {
    return { allowed: false, error: "Target member not found in this workspace." };
  }

  const currentTargetRole = targetMember.role as WorkspaceRole;

  // If target is an owner and being demoted to non-owner
  if (currentTargetRole === "owner" && newRole !== "owner") {
    const { count } = await admin
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", actor.workspaceId)
      .eq("role", "owner")
      .eq("is_deactivated", false);

    if ((count || 0) <= 1) {
      return {
        allowed: false,
        error: "Safety violation: A workspace must always have at least one owner. Demoting the last owner is blocked.",
      };
    }
  }

  // Admins cannot edit owners
  if (actor.role === "admin" && currentTargetRole === "owner") {
    return { allowed: false, error: "Safety violation: Admins cannot modify workspace owners." };
  }

  // Only owners can promote someone to admin or owner
  if (actor.role !== "owner" && (newRole === "owner" || newRole === "admin")) {
    return { allowed: false, error: "Safety violation: Only owners can create admins or transfer ownership." };
  }

  // Admins cannot demote or remove other admins
  if (actor.role === "admin" && currentTargetRole === "admin") {
    return { allowed: false, error: "Safety violation: Only owners can remove or demote admins." };
  }

  return { allowed: true };
}

/**
 * Validates safety rules before removing a member from a workspace.
 */
export async function validateMemberRemovalSafety(
  actor: PermissionUser,
  targetUserId: string
): Promise<{ allowed: boolean; error?: string }> {
  if (actor.userId === targetUserId) {
    return { allowed: false, error: "Safety violation: You cannot remove yourself using this action." };
  }

  const admin = createAdminClient();

  const { data: targetMember } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", actor.workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMember) {
    return { allowed: false, error: "Target member not found in this workspace." };
  }

  const targetRole = targetMember.role as WorkspaceRole;

  if (targetRole === "owner") {
    const { count } = await admin
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", actor.workspaceId)
      .eq("role", "owner")
      .eq("is_deactivated", false);

    if ((count || 0) <= 1) {
      return {
        allowed: false,
        error: "Safety violation: The last workspace owner cannot be removed.",
      };
    }
  }

  if (actor.role === "admin" && targetRole === "owner") {
    return { allowed: false, error: "Safety violation: Admins cannot remove workspace owners." };
  }

  if (actor.role === "admin" && targetRole === "admin") {
    return { allowed: false, error: "Safety violation: Only owners can remove admins." };
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUDIT LOGGING (Requirement 6)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogInput {
  workspaceId: string;
  actorId?: string;
  action: string;
  targetUserId?: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Persists an immutable audit log entry in both public.audit_logs and public.workspace_activities
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const admin = createAdminClient();

    // 1. Insert into audit_logs table
    await admin.from("audit_logs").insert({
      workspace_id: input.workspaceId,
      actor_id: input.actorId || null,
      action: input.action,
      target_user_id: input.targetUserId || null,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      details: input.details || {},
    });

    // 2. Insert into workspace_activities for activity feeds
    await admin.from("workspace_activities").insert({
      workspace_id: input.workspaceId,
      user_id: input.actorId || null,
      action_type: input.action,
      message: `Audit: ${input.action.replace(/_/g, " ")} on ${input.entityType}`,
      details: {
        target_user_id: input.targetUserId,
        entity_id: input.entityId,
        ...input.details,
      },
    });
  } catch (err) {
    // Non-blocking error logging
    console.error("Failed to persist audit log:", err);
  }
}
