import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import { WorkspaceInvitation, EmailDeliveryStatus } from "@/types/people";
import { Tables } from "@/types/database";

export type InvitationVerificationState =
  | "valid"
  | "expired"
  | "revoked"
  | "accepted"
  | "invalid";

export interface InvitationDetails {
  invitation: WorkspaceInvitation | null;
  state: InvitationVerificationState;
  workspaceName: string;
  departmentNames: string[];
  departmentName?: string;
  inviterName?: string;
  inviterEmail?: string;
  error?: string;
}

/**
 * Fetch invitation details by token with expiration & state checking.
 * Hashes raw token using SHA-256 for secure comparison against token_hash.
 */
export async function getInvitationByToken(
  token: string
): Promise<InvitationDetails> {
  if (!token || !token.trim()) {
    return {
      invitation: null,
      state: "invalid",
      workspaceName: "Workspace",
      departmentNames: [],
      error: "Missing invitation token.",
    };
  }

  const trimmedToken = token.trim();
  const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");
  const adminClient = createAdminClient();

  // Check store first (matching either raw or hashed)
  let rawInvite: any =
    recruitmentStore.getInvitationByToken?.(trimmedToken) ||
    recruitmentStore.getInvitationByToken?.(tokenHash) ||
    null;

  let workspaceName = "Ropimo Workspace";
  let departmentNames: string[] = [];
  let inviterName: string | undefined;
  let inviterEmail: string | undefined;

  if (!rawInvite) {
    try {
      const { data, error } = await adminClient
        .from("workspace_invitations")
        .select(`
          *,
          workspaces:workspace_id (id, name, slug)
        `)
        .or(`token_hash.eq.${tokenHash},token.eq.${tokenHash},token.eq.${trimmedToken}`)
        .maybeSingle();

      if (!error && data) {
        rawInvite = data;
        const joinedWs = data.workspaces as { name?: string } | null;
        if (joinedWs?.name) {
          workspaceName = joinedWs.name;
        }
      }
    } catch (err) {
      console.warn("[getInvitationByToken] DB query notice:", err);
    }
  }

  if (!rawInvite) {
    return {
      invitation: null,
      state: "invalid",
      workspaceName,
      departmentNames: [],
      error: "This invitation link is invalid or does not exist.",
    };
  }

  const departmentIds: string[] = Array.isArray(rawInvite.department_ids)
    ? rawInvite.department_ids
    : rawInvite.department_id
    ? [rawInvite.department_id]
    : [];

  const invitation: WorkspaceInvitation = {
    id: rawInvite.id,
    workspace_id: rawInvite.workspace_id,
    employee_id: rawInvite.employee_id || null,
    user_id: rawInvite.user_id || null,
    email: rawInvite.email,
    full_name: rawInvite.full_name || null,
    job_title: rawInvite.job_title || null,
    department_id: rawInvite.department_id || null,
    department_ids: departmentIds,
    department_name: rawInvite.department_name || null,
    is_lead: Boolean(rawInvite.is_lead),
    message: rawInvite.message || null,
    role: rawInvite.role as WorkspaceInvitation["role"],
    employment_type: (rawInvite.employment_type as WorkspaceInvitation["employment_type"]) || "Full-time",
    token: rawInvite.token || tokenHash,
    token_hash: rawInvite.token_hash || tokenHash,
    status: (rawInvite.status ? rawInvite.status.charAt(0).toUpperCase() + rawInvite.status.slice(1) : "Pending") as WorkspaceInvitation["status"],
    invited_by: rawInvite.invited_by || null,
    invited_by_name: rawInvite.invited_by_name || null,
    accepted_by: rawInvite.accepted_by || null,
    email_status: (rawInvite.email_status as EmailDeliveryStatus) || "sent",
    last_sent_at: rawInvite.last_sent_at || null,
    resend_count: Number(rawInvite.resend_count || 0),
    resend_message_id: rawInvite.resend_message_id || null,
    expires_at: rawInvite.expires_at || null,
    accepted_at: rawInvite.accepted_at || null,
    created_at: rawInvite.created_at || new Date().toISOString(),
    updated_at: rawInvite.updated_at || new Date().toISOString(),
  };

  // Determine state
  const statusLower = (invitation.status || "pending").toLowerCase();
  let state: InvitationVerificationState = "valid";

  if (statusLower === "accepted") {
    state = "accepted";
  } else if (statusLower === "revoked") {
    state = "revoked";
  } else if (invitation.expires_at && new Date() > new Date(invitation.expires_at)) {
    state = "expired";
    invitation.status = "Expired";
    recruitmentStore.saveInvitation?.(invitation);
    try {
      await adminClient
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
    } catch {}
  } else if (statusLower === "expired") {
    state = "expired";
  }

  // Resolve department names
  if (departmentIds.length > 0) {
    try {
      const { data: depts } = await adminClient
        .from("departments")
        .select("id, name")
        .in("id", departmentIds);
      if (depts && depts.length > 0) {
        departmentNames = depts.map((d) => d.name);
      }
    } catch {}
  }

  // Resolve inviter details
  if (invitation.invited_by) {
    try {
      const { data: inviter } = await adminClient
        .from("workspace_members")
        .select("full_name")
        .eq("workspace_id", invitation.workspace_id)
        .eq("user_id", invitation.invited_by)
        .maybeSingle();

      if (inviter?.full_name) {
        inviterName = inviter.full_name;
      }

      // Inviter auth email for Reply-To
      const { data: authUser } = await adminClient.auth.admin.getUserById(invitation.invited_by);
      if (authUser?.user?.email) {
        inviterEmail = authUser.user.email;
      }
    } catch {}
  }

  return {
    invitation,
    state,
    workspaceName,
    departmentNames,
    departmentName: departmentNames[0] || undefined,
    inviterName,
    inviterEmail,
    error: undefined,
  };
}

/**
 * Fetch all invitations for a workspace
 */
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
        department_ids: Array.isArray(d.department_ids) ? d.department_ids : d.department_id ? [d.department_id] : [],
        department_name: d.department_name,
        is_lead: Boolean(d.is_lead),
        message: d.message || null,
        role: d.role as WorkspaceInvitation["role"],
        employment_type: (d.employment_type as WorkspaceInvitation["employment_type"]) || "Full-time",
        token: d.token,
        token_hash: d.token_hash,
        status: (d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : "Pending") as WorkspaceInvitation["status"],
        invited_by: d.invited_by,
        invited_by_name: d.invited_by_name,
        accepted_by: d.accepted_by,
        email_status: (d.email_status as EmailDeliveryStatus) || "sent",
        last_sent_at: d.last_sent_at,
        resend_count: Number(d.resend_count || 0),
        resend_message_id: d.resend_message_id,
        expires_at: d.expires_at,
        accepted_at: d.accepted_at,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }
  } catch {}

  const storeInvs = recruitmentStore.getInvitations(workspaceId);
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

export async function getEmployeeInvitation(
  emailOrUserId: string,
  workspaceId: string
): Promise<WorkspaceInvitation | null> {
  if (!emailOrUserId || !workspaceId) return null;
  const invitations = await getWorkspaceInvitations(workspaceId);
  const normalized = emailOrUserId.toLowerCase();
  return (
    invitations.find(
      (inv) =>
        inv.email?.toLowerCase() === normalized ||
        inv.user_id === emailOrUserId ||
        inv.employee_id?.toLowerCase() === normalized
    ) || null
  );
}

export { type EmailAvailabilityMap, checkEmailsAvailability } from "./actions";
