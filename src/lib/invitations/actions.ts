"use server";

import crypto from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import { sendEmail } from "@/lib/email/sendEmail";
import { InvitationEmail, generateInvitationPlainText } from "@/lib/email/invitation-template";
import { render } from "@react-email/components";
import { can, requirePermission } from "@/lib/permissions";
import { WorkspaceInvitation, WorkspaceRole, EmploymentType } from "@/types/people";
import { revalidatePath } from "next/cache";

const InviteBatchSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  emails: z.array(z.string().email("Invalid email format")).min(1, "At least one email is required"),
  role: z.enum(["admin", "hr", "manager", "member"]),
  departmentIds: z.array(z.string().uuid()).default([]),
  isLead: z.boolean().default(false),
  message: z.string().max(300, "Message cannot exceed 300 characters").optional().nullable(),
});

export interface InviteEmailResult {
  email: string;
  status: "Sent" | "Failed";
  reason?: string;
  inviteUrl?: string;
  token?: string;
}

export interface BatchInviteActionResult {
  success: boolean;
  results: InviteEmailResult[];
  error?: string;
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/**
 * ─── 1. BATCH INVITE ACTION ─────────────────────────────────────────────────
 * Enforces:
 * - Permissions matrix (e.g. HR cannot invite Admin, Manager/Member cannot invite)
 * - Rate limiting: max 20 invites per hour per workspace
 * - Chip email validation, deduplication, member & pending detection
 * - 32-byte cryptographic token with SHA-256 token_hash
 * - Email dispatch via sendEmail() with inviter Reply-To
 */
export async function inviteMembersBatchAction(
  rawInput: z.infer<typeof InviteBatchSchema>
): Promise<BatchInviteActionResult> {
  const parsed = InviteBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      results: [],
      error: parsed.error.issues[0]?.message || "Validation failed.",
    };
  }

  const { workspaceId, emails, role, departmentIds, isLead, message } = parsed.data;

  // 1. Department requirement validation (required for member and manager)
  if ((role === "member" || role === "manager") && departmentIds.length === 0) {
    return {
      success: false,
      results: [],
      error: `Department selection is required for ${role === "member" ? "Member" : "Manager"} role.`,
    };
  }

  // 2. Permission Verification
  let callerUser;
  try {
    callerUser = await requirePermission("members:invite", {
      workspaceId,
      targetRole: role,
    });
  } catch (permErr: any) {
    return {
      success: false,
      results: [],
      error: permErr?.message || "You do not have permission to invite members with this role.",
    };
  }

  const adminClient = createAdminClient();

  // Fetch caller details (name and email for Reply-To)
  let inviterName = "A team administrator";
  let inviterEmail: string | undefined;

  try {
    const { data: callerMember } = await adminClient
      .from("workspace_members")
      .select("full_name, profiles:user_id(email)")
      .eq("workspace_id", workspaceId)
      .eq("user_id", callerUser.userId)
      .maybeSingle();

    if (callerMember?.full_name) {
      inviterName = callerMember.full_name;
    }
    const prof = callerMember?.profiles as { email?: string } | null;
    if (prof?.email) {
      inviterEmail = prof.email;
    } else {
      const { data: authUser } = await adminClient.auth.admin.getUserById(callerUser.userId);
      inviterEmail = authUser?.user?.email;
    }
  } catch {}

  // Fetch workspace details
  let workspaceName = "Ropimo Workspace";
  try {
    const { data: ws } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (ws?.name) workspaceName = ws.name;
  } catch {}

  // Fetch department names for email body
  let departmentNames: string[] = [];
  if (departmentIds.length > 0) {
    try {
      const { data: depts } = await adminClient
        .from("departments")
        .select("name")
        .in("id", departmentIds);
      if (depts) departmentNames = depts.map((d) => d.name);
    } catch {}
  }

  // 3. Rate Limit Enforcement: max 20 invites per hour per workspace
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let recentCount = 0;
  try {
    const { count, error: countErr } = await adminClient
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", oneHourAgo);

    if (!countErr && typeof count === "number") {
      recentCount = count;
    }
  } catch {}

  // Normalize and deduplicate emails
  const uniqueEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase())));

  if (recentCount + uniqueEmails.length > 20) {
    return {
      success: false,
      results: [],
      error: `Rate limit reached: Workspaces are limited to 20 invitations per hour (${recentCount} sent in the last hour).`,
    };
  }

  // 4. Check existing members
  const existingMemberEmails = new Set<string>();
  try {
    const { data: members } = await adminClient
      .from("workspace_members")
      .select("profiles:user_id(email)")
      .eq("workspace_id", workspaceId);

    if (members) {
      for (const m of members) {
        const p = m.profiles as { email?: string } | null;
        if (p?.email) existingMemberEmails.add(p.email.toLowerCase());
      }
    }
  } catch {}

  // Check pending invites
  const existingPendingMap = new Map<string, string>(); // email -> invite id
  try {
    const { data: pendingInvs } = await adminClient
      .from("workspace_invitations")
      .select("id, email, status")
      .eq("workspace_id", workspaceId)
      .in("email", uniqueEmails);

    if (pendingInvs) {
      for (const inv of pendingInvs) {
        const em = inv.email?.toLowerCase();
        const st = (inv.status || "").toLowerCase();
        if (em && st === "pending") {
          existingPendingMap.set(em, inv.id);
        }
      }
    }
  } catch {}

  const results: InviteEmailResult[] = [];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = getBaseUrl();

  for (const email of uniqueEmails) {
    // Check if already a member
    if (existingMemberEmails.has(email)) {
      results.push({
        email,
        status: "Failed",
        reason: "Already a member of this workspace",
      });
      continue;
    }

    // Check if pending invite exists
    if (existingPendingMap.has(email)) {
      results.push({
        email,
        status: "Failed",
        reason: "Invite pending, resend?",
      });
      continue;
    }

    // Generate random 32-byte token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const inviteUrl = `${baseUrl}/invite/${rawToken}`;

    const invitationRecord = {
      workspace_id: workspaceId,
      email,
      role,
      department_ids: departmentIds,
      department_id: departmentIds[0] || null,
      is_lead: isLead,
      message: message?.trim() || null,
      token: tokenHash, // Backward compat with legacy column
      token_hash: tokenHash,
      status: "pending",
      invited_by: callerUser.userId,
      expires_at: expiresAt,
      email_status: "queued",
      last_sent_at: new Date().toISOString(),
      resend_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let inviteId: string | null = null;

    try {
      const { data: inserted, error: insertErr } = await adminClient
        .from("workspace_invitations")
        .insert(invitationRecord)
        .select("id")
        .single();

      if (insertErr) {
        // Handle race condition or unique constraint on pending email
        console.warn("[inviteMembersBatchAction] Insert notice:", insertErr.message);
        results.push({
          email,
          status: "Failed",
          reason: insertErr.message.includes("unique")
            ? "Invite pending, resend?"
            : insertErr.message,
        });
        continue;
      }
      inviteId = inserted?.id || null;
    } catch (e: any) {
      results.push({ email, status: "Failed", reason: e?.message || "Database insert failed" });
      continue;
    }

    // Also persist in local store
    const storeObj: WorkspaceInvitation = {
      id: inviteId || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workspace_id: workspaceId,
      email,
      role,
      department_ids: departmentIds,
      department_id: departmentIds[0] || null,
      is_lead: isLead,
      message: message?.trim() || null,
      token: tokenHash,
      token_hash: tokenHash,
      status: "Pending",
      invited_by: callerUser.userId,
      invited_by_name: inviterName,
      expires_at: expiresAt,
      email_status: "queued",
      last_sent_at: new Date().toISOString(),
      resend_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    recruitmentStore.saveInvitation?.(storeObj);

    // Build email HTML and plain text
    const emailProps = {
      inviterName,
      workspaceName,
      roleName: role,
      departmentNames,
      inviteUrl,
      expiresInDays: 7,
      personalMessage: message?.trim() || null,
    };

    let emailHtml = "";
    try {
      emailHtml = await render(InvitationEmail(emailProps));
    } catch {
      emailHtml = `<div style="font-family:sans-serif;padding:24px;"><h2>ROPIMO</h2><p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in 7 days.</p></div>`;
    }

    const emailText = generateInvitationPlainText(emailProps);

    // Dispatch email via central engine
    const sendResult = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${workspaceName} on Ropimo`,
      html: emailHtml,
      text: emailText,
      template: "workspace-invitation",
      workspaceId,
      replyTo: inviterEmail,
      metadata: { inviteUrl, role, workspaceName },
    });

    // Update invite record with message ID and delivery status
    if (inviteId) {
      try {
        await adminClient
          .from("workspace_invitations")
          .update({
            email_status: sendResult.isOutbox ? "queued" : sendResult.success ? "sent" : "failed",
            resend_message_id: sendResult.messageId || null,
            last_sent_at: new Date().toISOString(),
          })
          .eq("id", inviteId);
      } catch {}
    }

    results.push({
      email,
      status: sendResult.success ? "Sent" : "Failed",
      reason: sendResult.success ? undefined : sendResult.error,
      inviteUrl,
      token: rawToken,
    });
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/dev/mailbox");
  } catch {}

  const hasSuccess = results.some((r) => r.status === "Sent");
  return {
    success: hasSuccess,
    results,
  };
}

/**
 * ─── 2. RESEND INVITATION ACTION ────────────────────────────────────────────
 * Enforces:
 * - 60-second cooldown per invitation
 * - Max 5 resends limit
 * - Generates new 32-byte token and hash
 * - Updates last_sent_at and increments resend_count
 */
export async function resendEmployeeInvitationAction(params: {
  workspaceId: string;
  invitationId?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string; data?: { inviteUrl: string; cooldownRemaining?: number } }> {
  const { workspaceId, invitationId, email } = params;
  if (!workspaceId) return { success: false, error: "Workspace ID is required." };

  let callerUser;
  try {
    callerUser = await requirePermission("members:invite", { workspaceId });
  } catch (err: any) {
    return { success: false, error: err?.message || "Permission denied." };
  }

  const adminClient = createAdminClient();

  // Find invitation
  let inviteRecord: any = null;
  if (invitationId) {
    const { data } = await adminClient
      .from("workspace_invitations")
      .select("*")
      .eq("id", invitationId)
      .maybeSingle();
    inviteRecord = data;
  } else if (email) {
    const { data } = await adminClient
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    inviteRecord = data;
  }

  if (!inviteRecord) {
    const storeInvs = recruitmentStore.getInvitations?.(workspaceId) || [];
    inviteRecord = storeInvs.find((i: WorkspaceInvitation) => i.id === invitationId || i.email === email?.toLowerCase());
  }

  if (!inviteRecord) {
    return { success: false, error: "Invitation not found." };
  }

  if ((inviteRecord.status || "").toLowerCase() === "accepted") {
    return { success: false, error: "This invitation has already been accepted." };
  }

  // Cooldown check (60 seconds)
  if (inviteRecord.last_sent_at) {
    const lastSentTime = new Date(inviteRecord.last_sent_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - lastSentTime) / 1000);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        error: `Please wait ${waitSeconds} seconds before resending this invitation.`,
        data: { inviteUrl: "", cooldownRemaining: waitSeconds },
      };
    }
  }

  // Max 5 resends
  const currentCount = Number(inviteRecord.resend_count || 0);
  if (currentCount >= 5) {
    return {
      success: false,
      error: "Maximum resend limit (5) reached for this invitation.",
    };
  }

  // Generate fresh token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inviteUrl = `${getBaseUrl()}/invite/${rawToken}`;

  // Update record
  try {
    await adminClient
      .from("workspace_invitations")
      .update({
        token: tokenHash,
        token_hash: tokenHash,
        status: "pending",
        expires_at: newExpiresAt,
        last_sent_at: new Date().toISOString(),
        resend_count: currentCount + 1,
        email_status: "queued",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inviteRecord.id);
  } catch {}

  // Update store
  inviteRecord.token = tokenHash;
  inviteRecord.token_hash = tokenHash;
  inviteRecord.status = "Pending";
  inviteRecord.expires_at = newExpiresAt;
  inviteRecord.last_sent_at = new Date().toISOString();
  inviteRecord.resend_count = currentCount + 1;
  recruitmentStore.saveInvitation?.(inviteRecord);

  // Inviter details
  let inviterName = "A team administrator";
  let inviterEmail: string | undefined;
  try {
    const { data: callerMember } = await adminClient
      .from("workspace_members")
      .select("full_name, profiles:user_id(email)")
      .eq("workspace_id", workspaceId)
      .eq("user_id", callerUser.userId)
      .maybeSingle();

    if (callerMember?.full_name) inviterName = callerMember.full_name;
    const p = callerMember?.profiles as { email?: string } | null;
    if (p?.email) inviterEmail = p.email;
  } catch {}

  // Workspace details
  let workspaceName = "Ropimo Workspace";
  try {
    const { data: ws } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (ws?.name) workspaceName = ws.name;
  } catch {}

  // Department names
  const deptIds: string[] = Array.isArray(inviteRecord.department_ids)
    ? inviteRecord.department_ids
    : inviteRecord.department_id
    ? [inviteRecord.department_id]
    : [];

  let departmentNames: string[] = [];
  if (deptIds.length > 0) {
    try {
      const { data: depts } = await adminClient
        .from("departments")
        .select("name")
        .in("id", deptIds);
      if (depts) departmentNames = depts.map((d) => d.name);
    } catch {}
  }

  const emailProps = {
    inviterName,
    workspaceName,
    roleName: inviteRecord.role,
    departmentNames,
    inviteUrl,
    expiresInDays: 7,
    personalMessage: inviteRecord.message || null,
  };

  const emailHtml = await render(InvitationEmail(emailProps));
  const emailText = generateInvitationPlainText(emailProps);

  const sendResult = await sendEmail({
    to: inviteRecord.email,
    subject: `${inviterName} invited you to join ${workspaceName} on Ropimo`,
    html: emailHtml,
    text: emailText,
    template: "workspace-invitation-resend",
    workspaceId,
    replyTo: inviterEmail,
    metadata: { inviteUrl, role: inviteRecord.role },
  });

  if (sendResult.messageId) {
    try {
      await adminClient
        .from("workspace_invitations")
        .update({
          resend_message_id: sendResult.messageId,
          email_status: sendResult.isOutbox ? "queued" : "sent",
        })
        .eq("id", inviteRecord.id);
    } catch {}
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/dev/mailbox");
  } catch {}

  return {
    success: true,
    data: { inviteUrl },
  };
}

/**
 * ─── 3. REVOKE INVITATION ACTION ────────────────────────────────────────────
 */
export async function revokeEmployeeInvitationAction(params: {
  workspaceId: string;
  invitationId?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId, invitationId, email } = params;
  if (!workspaceId) return { success: false, error: "Workspace ID is required." };

  let callerUser;
  try {
    callerUser = await requirePermission("members:manage_roles", { workspaceId });
  } catch (err: any) {
    return { success: false, error: err?.message || "Permission denied." };
  }

  const adminClient = createAdminClient();

  let targetId = invitationId;
  if (!targetId && email) {
    const { data: inv } = await adminClient
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    targetId = inv?.id;
  }

  if (!targetId) return { success: false, error: "Invitation not found." };

  try {
    await adminClient
      .from("workspace_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);
  } catch (dbErr: any) {
    return { success: false, error: dbErr?.message || "Failed to revoke invitation." };
  }

  const storeInvs = recruitmentStore.getInvitations?.(workspaceId) || [];
  const storeInv = storeInvs.find((i: WorkspaceInvitation) => i.id === targetId);
  if (storeInv) {
    storeInv.status = "Revoked";
    storeInv.updated_at = new Date().toISOString();
    recruitmentStore.saveInvitation?.(storeInv);
  }

  try {
    revalidatePath("/app/people");
  } catch {}

  return { success: true };
}

/**
 * ─── 4. ACCEPT INVITATION ATOMIC FLOW ───────────────────────────────────────
 * In one transaction or RPC:
 * - add workspace_members with role
 * - add department_members (+ is_lead)
 * - mark accepted
 * - create next employee ID (EMP-001, EMP-002, ...)
 * - write audit_log
 * - notify inviter by email & in-app
 * - idempotent: double clicks and refreshes never create duplicates
 */
export async function acceptWorkspaceInvitationAction(params: {
  token: string;
  fullName?: string;
  jobTitle?: string;
}): Promise<{
  success: boolean;
  alreadyAccepted?: boolean;
  workspaceId?: string;
  role?: string;
  employeeId?: string;
  error?: string;
}> {
  const { token, fullName, jobTitle } = params;
  if (!token || !token.trim()) {
    return { success: false, error: "Missing invitation token." };
  }

  const trimmedToken = token.trim();
  const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

  // Get authenticated user
  const authClient = await createClient();
  const { data: authData, error: authErr } = await authClient.auth.getUser();
  if (authErr || !authData?.user) {
    return { success: false, error: "You must be signed in to accept an invitation." };
  }

  const currentUser = authData.user;
  const userEmail = currentUser.email?.toLowerCase().trim() || "";
  const adminClient = createAdminClient();

  // 1. Try calling the PostgreSQL atomic RPC function
  try {
    const { data: rpcResult, error: rpcError } = await adminClient.rpc(
      "accept_workspace_invitation_atomic",
      {
        p_token_hash: tokenHash,
        p_user_id: currentUser.id,
        p_user_email: userEmail,
        p_full_name: fullName || currentUser.user_metadata?.full_name || null,
        p_job_title: jobTitle || null,
      }
    );

    if (!rpcError && rpcResult) {
      if (!rpcResult.success) {
        return { success: false, error: rpcResult.error };
      }
      return {
        success: true,
        alreadyAccepted: Boolean(rpcResult.already_accepted),
        workspaceId: rpcResult.workspace_id,
        role: rpcResult.role,
        employeeId: rpcResult.employee_id,
      };
    }
  } catch (rpcErr) {
    console.warn("[acceptWorkspaceInvitationAction] RPC call fallback:", rpcErr);
  }

  // 2. Sequential fallback if RPC is not present in PostgreSQL schema
  let dbInvite: any = null;
  const { data: queriedInvite } = await adminClient
    .from("workspace_invitations")
    .select("*")
    .or(`token_hash.eq.${tokenHash},token.eq.${tokenHash},token.eq.${trimmedToken}`)
    .maybeSingle();

  dbInvite = queriedInvite;
  if (!dbInvite) {
    dbInvite =
      recruitmentStore.getInvitationByToken?.(tokenHash) ||
      recruitmentStore.getInvitationByToken?.(trimmedToken);
  }

  if (!dbInvite) {
    return { success: false, error: "Invalid invitation token." };
  }

  // Verify status
  const currentStatus = (dbInvite.status || "pending").toLowerCase();
  if (currentStatus === "accepted") {
    return {
      success: true,
      alreadyAccepted: true,
      workspaceId: dbInvite.workspace_id,
      role: dbInvite.role,
    };
  }

  if (currentStatus === "revoked") {
    return { success: false, error: "This invitation has been revoked by an administrator." };
  }

  if (dbInvite.expires_at && new Date() > new Date(dbInvite.expires_at)) {
    try {
      await adminClient.from("workspace_invitations").update({ status: "expired" }).eq("id", dbInvite.id);
    } catch {}
    return { success: false, error: "This invitation has expired. Please ask for a new invite." };
  }

  // Enforce email matching
  const invitedEmail = dbInvite.email?.toLowerCase().trim();
  if (invitedEmail !== userEmail) {
    return {
      success: false,
      error: `This invite is for ${invitedEmail}. Sign out to continue.`,
    };
  }

  const workspaceId = dbInvite.workspace_id;
  const role = dbInvite.role || "member";
  const finalFullName = fullName || dbInvite.full_name || currentUser.user_metadata?.full_name || userEmail.split("@")[0];
  const finalJobTitle = jobTitle || dbInvite.job_title || "Team Member";

  // Calculate next sequential employee ID: EMP-001, EMP-002...
  let nextEmpId = "EMP-001";
  try {
    const { data: existingMembers } = await adminClient
      .from("workspace_members")
      .select("employee_id")
      .eq("workspace_id", workspaceId)
      .like("employee_id", "EMP-%");

    if (existingMembers && existingMembers.length > 0) {
      let maxNum = 0;
      for (const m of existingMembers) {
        const num = parseInt(m.employee_id?.replace("EMP-", "") || "0", 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      nextEmpId = `EMP-${String(maxNum + 1).padStart(3, "0")}`;
    }
  } catch {}

  // Upsert workspace_members
  try {
    await adminClient.from("workspace_members").upsert(
      {
        workspace_id: workspaceId,
        user_id: currentUser.id,
        role,
        full_name: finalFullName,
        job_title: finalJobTitle,
        employee_id: nextEmpId,
        employment_type: dbInvite.employment_type || "Full-time",
        employment_status: "Active",
        is_deactivated: false,
        hire_date: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id" }
    );
  } catch (memberErr: any) {
    return { success: false, error: memberErr?.message || "Failed to join workspace members." };
  }

  // Connect department memberships (+ is_lead)
  const deptIds: string[] = Array.isArray(dbInvite.department_ids) && dbInvite.department_ids.length > 0
    ? dbInvite.department_ids
    : dbInvite.department_id
    ? [dbInvite.department_id]
    : [];

  const isLead = Boolean(dbInvite.is_lead);

  for (const deptId of deptIds) {
    try {
      await adminClient.from("department_members").upsert(
        {
          workspace_id: workspaceId,
          department_id: deptId,
          user_id: currentUser.id,
          role: isLead ? "lead" : "member",
          is_lead: isLead,
          job_title: finalJobTitle,
        },
        { onConflict: "department_id,user_id" }
      );
    } catch {}
  }

  // Mark invitation accepted
  try {
    await adminClient
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dbInvite.id);
  } catch {}

  // Audit log
  try {
    await adminClient.from("audit_logs").insert({
      workspace_id: workspaceId,
      actor_id: currentUser.id,
      action: "invitation_accepted",
      target_user_id: currentUser.id,
      entity_type: "workspace_invitation",
      entity_id: dbInvite.id,
      details: {
        email: userEmail,
        role,
        employee_id: nextEmpId,
      },
    });
  } catch {}

  // Notify inviter via email and in-app event
  if (dbInvite.invited_by) {
    try {
      const { data: inviterAuth } = await adminClient.auth.admin.getUserById(dbInvite.invited_by);
      if (inviterAuth?.user?.email) {
        let workspaceName = "Ropimo";
        const { data: ws } = await adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
        if (ws?.name) workspaceName = ws.name;

        await sendEmail({
          to: inviterAuth.user.email,
          subject: `${finalFullName} accepted your invitation to join ${workspaceName}`,
          html: `<div style="font-family:sans-serif;padding:24px;"><h2>ROPIMO</h2><p><strong>${finalFullName}</strong> (${userEmail}) has accepted your invitation and joined <strong>${workspaceName}</strong> as a <strong>${role}</strong> (Employee ID: ${nextEmpId}).</p></div>`,
          text: `${finalFullName} (${userEmail}) accepted your invitation to join ${workspaceName} as a ${role} (${nextEmpId}).`,
          template: "invitation-accepted-notice",
          workspaceId,
        });
      }
    } catch (notifErr) {
      console.warn("[acceptWorkspaceInvitationAction] Inviter notification notice:", notifErr);
    }
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/app");
  } catch {}

  return {
    success: true,
    alreadyAccepted: false,
    workspaceId,
    role,
    employeeId: nextEmpId,
  };
}

/**
 * ─── 5. REQUEST NEW INVITE ACTION (EXPIRED SCREEN) ──────────────────────────
 * Notifies the inviter that the recipient clicked "Ask for a new invite".
 */
export async function requestNewInviteAction(token: string): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "Token is required." };
  const trimmedToken = token.trim();
  const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

  const adminClient = createAdminClient();
  const { data: inv } = await adminClient
    .from("workspace_invitations")
    .select("*, workspaces:workspace_id(name)")
    .or(`token_hash.eq.${tokenHash},token.eq.${tokenHash},token.eq.${trimmedToken}`)
    .maybeSingle();

  if (!inv) return { success: false, error: "Invitation record not found." };
  if (!inv.invited_by) return { success: false, error: "Original inviter record not found." };

  try {
    const { data: inviterAuth } = await adminClient.auth.admin.getUserById(inv.invited_by);
    if (!inviterAuth?.user?.email) {
      return { success: false, error: "Inviter email not found." };
    }

    const ws = inv.workspaces as { name?: string } | null;
    const wsName = ws?.name || "Ropimo Workspace";

    await sendEmail({
      to: inviterAuth.user.email,
      subject: `${inv.email} requested a new invitation to join ${wsName}`,
      html: `<div style="font-family:sans-serif;padding:24px;"><h2>ROPIMO</h2><p><strong>${inv.email}</strong> clicked "Ask for a new invite" because their previous invitation to <strong>${wsName}</strong> expired.</p><p>You can resend them a fresh invite from the <strong>Invites & Onboarding</strong> tab in Ropimo.</p></div>`,
      text: `${inv.email} requested a new invitation to join ${wsName} on Ropimo because their previous invite expired. Please send them a new invite from Invites & Onboarding tab.`,
      template: "invitation-expired-request",
      workspaceId: inv.workspace_id,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to notify inviter." };
  }
}

/**
 * ─── 6. LEGACY SINGLE-EMPLOYEE ADAPTER ──────────────────────────────────────
 * Preserves backward compatibility with existing callers.
 */
export async function inviteEmployeeAction(params: {
  workspaceId: string;
  email: string;
  role?: WorkspaceRole;
  fullName?: string;
  jobTitle?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  employeeId?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string; data?: { token?: string; inviteUrl?: string } }> {
  try {
    const role = (params.role || "member") as "admin" | "hr" | "manager" | "member";
    const safeRole: "admin" | "hr" | "manager" | "member" = ["admin", "hr", "manager", "member"].includes(role)
      ? role
      : "member";
    const deptIds = params.departmentId ? [params.departmentId] : [];

  const res = await inviteMembersBatchAction({
    workspaceId: params.workspaceId,
    emails: [params.email],
    role: safeRole,
    departmentIds: deptIds,
    isLead: false,
    message: null,
  });

  const firstResult = res.results[0];
  if (!res.success || !firstResult || firstResult.status === "Failed") {
    return {
      success: false,
      error: firstResult?.reason || res.error || "Failed to invite employee.",
    };
  }

    return {
      success: true,
      data: {
        token: firstResult.token,
        inviteUrl: firstResult.inviteUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export interface EmailAvailabilityMap {
  [email: string]: {
    isMember: boolean;
    isPending: boolean;
    pendingInviteId?: string;
  };
}

/**
 * Server action to validate a list of emails against active members and pending invites.
 */
export async function checkEmailsAvailability(
  workspaceId: string,
  emails: string[]
): Promise<EmailAvailabilityMap> {
  const result: EmailAvailabilityMap = {};
  if (!workspaceId || !emails || emails.length === 0) return result;

  const normalized = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  for (const email of normalized) {
    result[email] = { isMember: false, isPending: false };
  }

  const adminClient = createAdminClient();

  // 1. Check existing members
  try {
    const { data: memberRows } = await adminClient
      .from("workspace_members")
      .select("id, user_id, profiles:user_id(email)")
      .eq("workspace_id", workspaceId);

    if (memberRows) {
      for (const row of memberRows) {
        const profile = row.profiles as { email?: string } | null;
        const memberEmail = profile?.email?.toLowerCase();
        if (memberEmail && result[memberEmail]) {
          result[memberEmail].isMember = true;
        }
      }
    }
  } catch {}

  // 2. Check pending invitations
  try {
    const { data: pendingRows } = await adminClient
      .from("workspace_invitations")
      .select("id, email, status")
      .eq("workspace_id", workspaceId)
      .in("email", normalized);

    if (pendingRows) {
      for (const row of pendingRows) {
        const em = row.email?.toLowerCase();
        if (em && result[em]) {
          const st = (row.status || "").toLowerCase();
          if (st === "pending") {
            result[em].isPending = true;
            result[em].pendingInviteId = row.id;
          } else if (st === "accepted") {
            result[em].isMember = true;
          }
        }
      }
    }
  } catch {}

  // Also check recruitmentStore
  for (const em of normalized) {
    const storeInv = recruitmentStore.getInvitationByEmail?.(em, workspaceId);
    if (storeInv) {
      const st = (storeInv.status || "").toLowerCase();
      if (st === "pending") {
        result[em].isPending = true;
        result[em].pendingInviteId = storeInv.id;
      } else if (st === "accepted") {
        result[em].isMember = true;
      }
    }
  }

  return result;
}
