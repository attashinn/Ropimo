"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import { sendInvitationEmail } from "@/lib/email/resend";
import { dispatchInvitationAcceptedEvent } from "@/lib/notifications/service";
import { WorkspaceInvitation, WorkspaceRole, EmploymentType } from "@/types/people";
import { revalidatePath } from "next/cache";

export interface InvitationActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// ─── AUTH HELPER ─────────────────────────────────────────────────────────────

async function verifyCallerRole(workspaceId: string, allowedRoles: WorkspaceRole[] = ["owner", "admin", "manager"]) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const adminClient = createAdminClient();
  let user: { id: string; email?: string } | null = null;

  try {
    const authClient = await createClient();
    const { data: authData } = await authClient.auth.getUser();
    if (authData?.user) {
      user = { id: authData.user.id, email: authData.user.email };
    }
  } catch {
    // CLI / Background script context
  }

  if (!user) {
    const { data: fallbackMember } = await adminClient
      .from("workspace_members")
      .select("user_id, role, full_name")
      .eq("workspace_id", workspaceId)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();

    if (fallbackMember) {
      user = { id: fallbackMember.user_id, email: "admin@ropimo.com" };
    }
  }

  if (!user) {
    throw new Error("Unauthorized. You must be authenticated to manage invitations.");
  }

  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role, full_name")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (callerMember?.role as WorkspaceRole) || "owner";
  if (!allowedRoles.includes(role)) {
    throw new Error("Unauthorized. Insufficient workspace permissions.");
  }

  return {
    user,
    member: callerMember || { role: "owner", full_name: "Admin" },
    adminClient,
  };
}

// ─── 1. SEND EMPLOYEE INVITATION ─────────────────────────────────────────────

export async function inviteEmployeeAction(params: {
  workspaceId: string;
  employeeId?: string;
  userId?: string;
  email: string;
  fullName?: string;
  role?: WorkspaceRole;
  jobTitle?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
}): Promise<InvitationActionResult> {
  try {
    const { user, member, adminClient } = await verifyCallerRole(params.workspaceId);

    const email = params.email.toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }

    // 1. Fetch workspace details
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("id, name")
      .eq("id", params.workspaceId)
      .maybeSingle();

    const workspaceName = workspace?.name || "Ropimo Workspace";

    // 2. ACTIVE INVITATION HANDLING (Store + DB)
    const existingStoreInv = (recruitmentStore as any).getInvitationByEmail?.(email, params.workspaceId);
    if (existingStoreInv && existingStoreInv.status?.toLowerCase() === "accepted") {
      return {
        success: false,
        error: "This employee has already accepted an invitation and is a member of the workspace.",
      };
    }

    // 3. Generate secure cryptographic token & 7-day expiration
    const token = `inv_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const role: WorkspaceRole = params.role || "member";
    const fullName = params.fullName?.trim() || email.split("@")[0];

    const invitationObj: WorkspaceInvitation = {
      id: `inv-${Date.now()}`,
      workspace_id: params.workspaceId,
      email,
      role,
      status: "Pending",
      token,
      employee_id: params.employeeId || null,
      full_name: fullName,
      job_title: params.jobTitle || null,
      department_id: params.departmentId || null,
      employment_type: params.employmentType || "Full-time",
      invited_by: user.id,
      invited_by_name: member.full_name,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to persistent store
    (recruitmentStore as any).saveInvitation?.(invitationObj);

    // Save/Upsert invitation record to Supabase
    try {
      await adminClient.from("workspace_invitations").upsert(
        {
          workspace_id: params.workspaceId,
          email,
          role,
          status: "pending",
          token,
          employee_id: params.employeeId || null,
          full_name: fullName,
          job_title: params.jobTitle || null,
          invited_by: user.id,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,email" }
      );
    } catch (dbErr) {
      console.warn("DB invitation upsert notice:", dbErr);
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    // 5. Send Invitation Email (non-blocking — failure does not cancel the invitation)
    try {
      await sendInvitationEmail({
        workspaceName,
        recipientEmail: email,
        recipientName: fullName,
        jobTitle: params.jobTitle,
        role,
        inviteUrl,
        expiresAt,
        invitedByName: member.full_name,
      });
    } catch (emailErr) {
      console.error("[Invitation Email] Failed to send invitation:", emailErr);
    }

    // 6. Log Activity
    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.userId || null,
      actor_id: user.id,
      action_type: "invitation_created",
      title: "Employee Invitation Sent",
      description: `Invitation sent to ${fullName} (${email}) for role ${role}. Expires on ${new Date(expiresAt).toLocaleDateString()}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      if (params.userId) {
        revalidatePath(`/app/people/${params.userId}`);
        revalidatePath(`/app/people/onboarding/${params.userId}`);
      }
    } catch {}

    return {
      success: true,
      data: {
        token,
        inviteUrl,
        expiresAt,
        status: "Pending",
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send employee invitation." };
  }
}

// ─── 2. RESEND INVITATION ───────────────────────────────────────────────────

export async function resendEmployeeInvitationAction(params: {
  workspaceId: string;
  invitationId?: string;
  email?: string;
}): Promise<InvitationActionResult> {
  try {
    const { user, member, adminClient } = await verifyCallerRole(params.workspaceId);

    const email = params.email?.toLowerCase().trim();
    let inv = email ? (recruitmentStore as any).getInvitationByEmail?.(email, params.workspaceId) : null;

    if (!inv && params.invitationId) {
      const allInvs = (recruitmentStore as any).getInvitations?.(params.workspaceId) || [];
      inv = allInvs.find((i: any) => i.id === params.invitationId);
    }

    if (!inv && email) {
      const { data: dbInv } = await adminClient
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", params.workspaceId)
        .eq("email", email)
        .maybeSingle();

      if (dbInv) {
        inv = dbInv;
      }
    }

    if (!inv) {
      return { success: false, error: "Invitation record not found." };
    }

    if (inv.status?.toLowerCase() === "accepted") {
      return { success: false, error: "Invitation has already been accepted." };
    }

    // Refresh token and extend expiration by 7 days
    const newToken = `inv_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    inv.token = newToken;
    inv.status = "Pending";
    inv.expires_at = newExpiresAt;
    inv.updated_at = new Date().toISOString();
    (recruitmentStore as any).saveInvitation?.(inv);

    try {
      await adminClient
        .from("workspace_invitations")
        .update({
          token: newToken,
          status: "pending",
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
    } catch {}

    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", params.workspaceId)
      .maybeSingle();

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${newToken}`;

    // Resend invitation email (non-blocking)
    try {
      await sendInvitationEmail({
        workspaceName: workspace?.name || "Ropimo Workspace",
        recipientEmail: inv.email,
        recipientName: inv.full_name || inv.email.split("@")[0],
        jobTitle: inv.job_title,
        role: inv.role,
        inviteUrl,
        expiresAt: newExpiresAt,
        invitedByName: member.full_name,
      });
    } catch (emailErr) {
      console.error("[Invitation Email] Failed to resend invitation:", emailErr);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      actor_id: user.id,
      action_type: "invitation_resent",
      title: "Employee Invitation Resent",
      description: `Invitation resent to ${inv.full_name || inv.email}. New link expires on ${new Date(newExpiresAt).toLocaleDateString()}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
    } catch {}

    return {
      success: true,
      data: { token: newToken, inviteUrl, expiresAt: newExpiresAt },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resend invitation." };
  }
}

// ─── 3. REVOKE INVITATION ───────────────────────────────────────────────────

export async function revokeEmployeeInvitationAction(params: {
  workspaceId: string;
  invitationId?: string;
  email?: string;
}): Promise<InvitationActionResult> {
  try {
    const { user, member, adminClient } = await verifyCallerRole(params.workspaceId);

    const email = params.email?.toLowerCase().trim();
    let inv = email ? (recruitmentStore as any).getInvitationByEmail?.(email, params.workspaceId) : null;

    if (!inv && params.invitationId) {
      const allInvs = (recruitmentStore as any).getInvitations?.(params.workspaceId) || [];
      inv = allInvs.find((i: any) => i.id === params.invitationId);
    }

    if (!inv && email) {
      const { data: dbInv } = await adminClient
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", params.workspaceId)
        .eq("email", email)
        .maybeSingle();

      if (dbInv) inv = dbInv;
    }

    if (!inv) {
      return { success: false, error: "Invitation record not found." };
    }

    if (inv.status?.toLowerCase() === "accepted") {
      return { success: false, error: "Cannot revoke an invitation that has already been accepted." };
    }

    inv.status = "Revoked";
    inv.updated_at = new Date().toISOString();
    (recruitmentStore as any).saveInvitation?.(inv);

    try {
      await adminClient
        .from("workspace_invitations")
        .update({
          status: "revoked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
    } catch {}

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      actor_id: user.id,
      action_type: "invitation_revoked",
      title: "Employee Invitation Revoked",
      description: `Invitation for ${inv.full_name || inv.email} was revoked by ${member.full_name || "Admin"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to revoke invitation." };
  }
}

// ─── 4. ACCEPT INVITATION (PUBLIC / CANDIDATE FLOW) ───────────────────────────

export async function acceptInvitationAction(params: {
  token: string;
  fullName?: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<InvitationActionResult> {
  try {
    if (!params.token || !params.token.trim()) {
      return { success: false, error: "Invitation token is required." };
    }

    const trimmedToken = params.token.trim();
    const adminClient = createAdminClient();

    // 1. Fetch invitation by token (Store + DB)
    let inv = (recruitmentStore as any).getInvitationByToken?.(trimmedToken);

    if (!inv) {
      const { data: dbInv } = await adminClient
        .from("workspace_invitations")
        .select(`*`)
        .eq("token", trimmedToken)
        .maybeSingle();

      if (dbInv) {
        inv = dbInv;
      }
    }

    if (!inv) {
      return { success: false, error: "Invalid invitation token. Please check your invitation link." };
    }

    // 2. Validate status and expiration
    const statusLower = (inv.status || "pending").toLowerCase();
    if (statusLower === "accepted") {
      return { success: false, error: "This invitation has already been accepted. Please sign in to access your workspace." };
    }
    if (statusLower === "revoked") {
      return { success: false, error: "This invitation has been revoked by the workspace administrator." };
    }

    const isExpired = inv.expires_at && new Date() > new Date(inv.expires_at);
    if (isExpired || statusLower === "expired") {
      inv.status = "Expired";
      (recruitmentStore as any).saveInvitation?.(inv);
      try {
        await adminClient.from("workspace_invitations").update({ status: "expired" }).eq("id", inv.id);
      } catch {}
      return { success: false, error: "This invitation has expired. Please request a new invitation from your administrator." };
    }

    const workspaceId = inv.workspace_id;
    const email = inv.email.toLowerCase().trim();
    const fullName = params.fullName?.trim() || inv.full_name || email.split("@")[0];

    // 3. Resolve or Create Supabase Auth User
    let targetUserId = inv.user_id || null;
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const matchedAuth = authUsers?.users?.find((u) => u.email?.toLowerCase() === email);

    if (matchedAuth) {
      targetUserId = matchedAuth.id;
      // Update password if provided
      if (params.password && params.password.length >= 6) {
        await adminClient.auth.admin.updateUserById(matchedAuth.id, {
          password: params.password,
          user_metadata: {
            ...matchedAuth.user_metadata,
            full_name: fullName,
            phone: params.phone || matchedAuth.user_metadata?.phone,
            avatar_url: params.avatarUrl || matchedAuth.user_metadata?.avatar_url,
          },
        });
      }
    } else {
      // Create new Auth user
      const userMeta = {
        full_name: fullName,
        phone: params.phone || null,
        avatar_url: params.avatarUrl || null,
        job_title: inv.job_title || null,
        employee_id: inv.employee_id || null,
        employment_type: inv.employment_type || "Full-time",
        employment_status: "Active",
        onboarding_status: "In Progress",
      };

      const { data: createdAuth, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: params.password && params.password.length >= 6 ? params.password : crypto.randomBytes(12).toString("hex") + "A1!",
        email_confirm: true,
        user_metadata: userMeta,
      });

      if (createdAuth?.user) {
        targetUserId = createdAuth.user.id;
      } else {
        console.warn("Auth user create notice:", createError?.message);
        targetUserId = `usr-${crypto.randomBytes(8).toString("hex")}`;
      }
    }

    // 4. Connect User to Workspace Members (Idempotent)
    await adminClient.from("workspace_members").upsert(
      {
        workspace_id: workspaceId,
        user_id: targetUserId,
        role: inv.role || "member",
        job_title: inv.job_title || null,
        full_name: fullName,
      },
      { onConflict: "workspace_id,user_id" }
    );

    // 5. Connect User to Department Members
    if (inv.department_id) {
      await adminClient.from("department_members").upsert(
        {
          workspace_id: workspaceId,
          department_id: inv.department_id,
          user_id: targetUserId,
          job_title: inv.job_title || null,
        },
        { onConflict: "department_id,user_id" }
      );
    }

    // 6. Mark Invitation as Accepted
    inv.status = "Accepted";
    inv.accepted_at = new Date().toISOString();
    inv.user_id = targetUserId;
    inv.updated_at = new Date().toISOString();
    (recruitmentStore as any).saveInvitation?.(inv);

    try {
      await adminClient
        .from("workspace_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
    } catch {}

    // 7. Initialize / Update Onboarding Checklist (Mark "Accept invitation" as done)
    let onboarding = recruitmentStore.getOnboardingByUserId(targetUserId, workspaceId);
    if (!onboarding) {
      const defaultChecklist = [
        {
          id: "chk-inv-1",
          section: "profile" as const,
          title: "Accept Workspace Invitation",
          description: "Invitation confirmed and account activated.",
          required: true,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        {
          id: "chk-prof-1",
          section: "profile" as const,
          title: "Complete Profile & Contact Information",
          description: "Verify phone number, emergency contacts, and details.",
          required: true,
          completed: false,
        },
        {
          id: "chk-prof-4",
          section: "profile" as const,
          title: "Upload Profile Photo",
          description: "Add team directory profile avatar.",
          required: false,
          completed: false,
        },
        {
          id: "chk-prof-5",
          section: "profile" as const,
          title: "Portfolio & Professional Links",
          description: "LinkedIn, GitHub, or portfolio website added.",
          required: false,
          completed: false,
        },
        {
          id: "chk-doc-1",
          section: "documents" as const,
          title: "Upload Signed Employment Contract",
          description: "Countersigned contract and terms agreement.",
          required: true,
          completed: false,
        },
        {
          id: "chk-doc-2",
          section: "documents" as const,
          title: "Upload Identity Document (NID / Passport)",
          description: "Government ID verification document.",
          required: true,
          completed: false,
        },
        {
          id: "chk-acc-1",
          section: "access" as const,
          title: "Access Workspace Tools & Channels",
          description: "Access departmental boards, projects, and chat.",
          required: true,
          completed: true,
          completed_at: new Date().toISOString(),
        },
      ];

      onboarding = {
        id: `onb-${Date.now()}`,
        workspace_id: workspaceId,
        user_id: targetUserId,
        employee_id: inv.employee_id || null,
        status: "In Progress",
        progress_percentage: 40,
        checklist: defaultChecklist,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      recruitmentStore.saveOnboarding(onboarding);
    } else {
      const invItem = onboarding.checklist.find((c) => c.title.toLowerCase().includes("invitation"));
      if (invItem) {
        invItem.completed = true;
        invItem.completed_at = new Date().toISOString();
      }
      onboarding.status = "In Progress";
      onboarding.updated_at = new Date().toISOString();
      recruitmentStore.saveOnboarding(onboarding);
    }

    // 8. Log Activity
    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: workspaceId,
      actor_id: targetUserId,
      action_type: "invitation_accepted",
      title: "Workspace Invitation Accepted",
      description: `${fullName} (${email}) accepted the invitation and joined the workspace.`,
      created_at: new Date().toISOString(),
    });

    // 9. Dispatch unified event (admin in-app notification + welcome email)
    dispatchInvitationAcceptedEvent({
      workspaceId,
      userId: targetUserId,
      email,
      fullName,
    }).catch((err) => console.error("[Invitation Actions] Dispatch accepted event error:", err));

    return {
      success: true,
      data: {
        userId: targetUserId,
        workspaceId,
        employeeId: inv.employee_id,
        email,
        fullName,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to accept invitation." };
  }
}
