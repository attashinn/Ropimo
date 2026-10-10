import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceRole } from "@/types/permissions";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
}

export interface AuthenticatedWorkspaceContext {
  user: AuthenticatedUser;
  workspaceId: string;
  role: WorkspaceRole;
}

/**
 * Require an authenticated user session from Supabase Auth cookies.
 * Throws an Error if the user is unauthenticated or the session is invalid.
 * NEVER trust user identity sent by the client.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Authentication required.");
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
  };
}

/**
 * Require the authenticated user to be an active member of the specified workspace
 * with one of the allowed roles.
 * NEVER trust workspaceId, userId, or role sent by the client.
 */
export async function requireWorkspaceRole(
  workspaceId: string,
  allowedRoles: WorkspaceRole[] = ["owner", "admin", "manager", "member", "guest"]
): Promise<AuthenticatedWorkspaceContext> {
  const user = await requireUser();

  if (!workspaceId || typeof workspaceId !== "string") {
    throw new Error("Bad Request: A valid workspace ID is required.");
  }

  const adminClient = createAdminClient();

  const { data: member, error } = await adminClient
    .from("workspace_members")
    .select("role, workspace_id, user_id, is_deactivated, employment_status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member) {
    throw new Error("Forbidden: You are not a member of this workspace.");
  }

  if (member.is_deactivated || member.employment_status === "Inactive") {
    throw new Error("Forbidden: Your account in this workspace is deactivated.");
  }

  const actualRole = member.role as WorkspaceRole;

  if (allowedRoles.length > 0 && !allowedRoles.includes(actualRole)) {
    throw new Error(
      `Forbidden: Your role (${actualRole}) is not permitted to perform this action. Required: ${allowedRoles.join(
        ", "
      )}.`
    );
  }

  return {
    user,
    workspaceId,
    role: actualRole,
  };
}

export { requirePermission } from "@/lib/permissions-server";

