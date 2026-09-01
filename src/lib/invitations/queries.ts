import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import { WorkspaceInvitation } from "@/types/people";

/**
 * Fetch invitation details by token with expiration checking
 */
export async function getInvitationByToken(
  token: string
): Promise<{
  invitation: WorkspaceInvitation | null;
  workspaceName?: string;
  departmentName?: string;
  error?: string;
}> {
  if (!token || !token.trim()) {
    return { invitation: null, error: "Missing invitation token." };
  }

  const trimmedToken = token.trim();
  const adminClient = createAdminClient();

  // Check store first
  let invitation = (recruitmentStore as any).getInvitationByToken?.(trimmedToken) || null;
  let workspaceName = "Ropimo Workspace";
  let departmentName: string | undefined;

  if (!invitation) {
    try {
      const { data, error } = await adminClient
        .from("workspace_invitations")
        .select(`
          *,
          workspaces:workspace_id (id, name, slug)
        `)
        .eq("token", trimmedToken)
        .maybeSingle();

      if (!error && data) {
        invitation = {
          id: data.id,
          workspace_id: data.workspace_id,
          employee_id: data.employee_id,
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          job_title: data.job_title,
          department_id: data.department_id,
          role: data.role,
          employment_type: data.employment_type,
          token: data.token,
          status: data.status as any,
          invited_by: data.invited_by,
          expires_at: data.expires_at,
          accepted_at: data.accepted_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        if ((data.workspaces as any)?.name) {
          workspaceName = (data.workspaces as any).name;
        }
      }
    } catch {}
  }

  if (!invitation) {
    return { invitation: null, error: "Invitation not found." };
  }

  // Check expiration
  let status = (invitation.status || "pending").toLowerCase();
  if (invitation.expires_at && new Date() > new Date(invitation.expires_at) && status === "pending") {
    invitation.status = "Expired";
    (recruitmentStore as any).saveInvitation?.(invitation);
    try {
      await adminClient.from("workspace_invitations").update({ status: "expired" }).eq("id", invitation.id);
    } catch {}
  }

  return {
    invitation,
    workspaceName,
    departmentName,
  };
}

export async function getWorkspaceInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  if (!workspaceId) return [];

  const adminClient = createAdminClient();
  let dbInvs: WorkspaceInvitation[] = [];

  try {
    const { data, error } = await adminClient
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbInvs = data.map((d: any) => ({
        id: d.id,
        workspace_id: d.workspace_id,
        employee_id: d.employee_id,
        user_id: d.user_id,
        email: d.email,
        full_name: d.full_name,
        job_title: d.job_title,
        department_id: d.department_id,
        role: d.role,
        employment_type: d.employment_type,
        token: d.token,
        status: d.status as any,
        invited_by: d.invited_by,
        expires_at: d.expires_at,
        accepted_at: d.accepted_at,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }
  } catch {}

  const storeInvs = (recruitmentStore as any).getInvitations?.(workspaceId) || [];

  const map = new Map<string, WorkspaceInvitation>();
  for (const inv of dbInvs) {
    if (inv.email) map.set(inv.email.toLowerCase(), inv);
  }
  for (const inv of storeInvs) {
    if (inv.email && !map.has(inv.email.toLowerCase())) {
      map.set(inv.email.toLowerCase(), inv);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Fetch invitation for a specific email or employee in a workspace
 */
export async function getEmployeeInvitation(
  emailOrUserId: string,
  workspaceId: string
): Promise<WorkspaceInvitation | null> {
  if (!emailOrUserId || !workspaceId) return null;

  if (emailOrUserId.includes("@")) {
    const storeInv = (recruitmentStore as any).getInvitationByEmail?.(emailOrUserId, workspaceId);
    if (storeInv) return storeInv;
  }

  const allInvs = (recruitmentStore as any).getInvitations?.(workspaceId) || [];
  const found = allInvs.find(
    (i: any) =>
      i.user_id === emailOrUserId ||
      i.employee_id === emailOrUserId ||
      i.email?.toLowerCase() === emailOrUserId.toLowerCase()
  );

  return found || null;
}
