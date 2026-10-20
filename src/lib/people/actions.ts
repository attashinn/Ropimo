"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  UpdatePersonInput,
  InvitePersonInput,
  AssignDepartmentInput,
  WorkspaceRole,
  WorkspaceInvitation,
  EmployeeOnboarding,
  OnboardingChecklistItem,
} from "@/types/people";
import { revalidatePath } from "next/cache";
import { getAppUrl } from "@/lib/utils";

export interface PeopleActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

const UpdatePersonSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  targetUserId: z.string().min(1, "Target user ID is required."),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  employmentType: z.string().optional(),
  employmentStatus: z.string().optional(),
  onboardingStatus: z.string().optional(),
  hireDate: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  linkedinUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  interests: z.array(z.string()).optional(),
  role: z.enum(["owner", "admin", "hr", "manager", "member", "guest"]).optional(),
  departmentIds: z.array(z.string()).optional(),
});

const InvitePersonSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  email: z.string().email("A valid email address is required."),
  fullName: z.string().min(1, "Full name is required."),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
  employmentType: z.string().optional(),
  employmentStatus: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  role: z.enum(["owner", "admin", "hr", "manager", "member", "guest"]).optional(),
});

const RemovePersonFromDeptSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
});

const AssignDepartmentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  departmentId: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
});

const UpdateMemberRoleSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  targetUserId: z.string().min(1, "Target user ID is required."),
  newRole: z.enum(["owner", "admin", "hr", "manager", "member", "guest"]),
});

const RemoveMemberSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  targetUserId: z.string().min(1, "Target user ID is required."),
});

const CompleteOnboardingSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  token: z.string().min(1, "Token is required."),
  fullName: z.string().min(1, "Full name is required."),
  password: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  cvUrl: z.string().optional(),
  cvFileName: z.string().optional(),
});

const ApproveOnboardingSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  departmentId: z.string().optional(),
  role: z.enum(["owner", "admin", "hr", "manager", "member", "guest"]).optional(),
  jobTitle: z.string().optional(),
});

const RejectOnboardingSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  reason: z.string().optional(),
});

/**
 * Edit an employee's profile and sync departments and user metadata
 */
export async function updatePersonDetailsAction(
  rawInput: UpdatePersonInput
): Promise<PeopleActionResult> {
  const parsed = UpdatePersonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const {
    workspaceId,
    targetUserId,
    fullName,
    phone,
    jobTitle,
    location,
    employeeId,
    employmentType,
    employmentStatus,
    hireDate,
    managerId,
    bio,
    skills,
    linkedinUrl,
    websiteUrl,
    emergencyContactName,
    emergencyContactPhone,
    interests,
    role,
    departmentIds,
  } = input;

  let user: { id: string; email?: string } | null = null;
  try {
    const authClient = await createClient();
    const { data: authData } = await authClient.auth.getUser();
    if (authData?.user) {
      user = { id: authData.user.id, email: authData.user.email };
    }
  } catch {
    // CLI / Script execution context
  }

  const adminClient = createAdminClient();

  if (!user) {
    const { data: fallbackMember } = await adminClient
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (fallbackMember) {
      user = { id: fallbackMember.user_id };
    }
  }

  if (!user) {
    return { success: false, error: "You must be logged in to update employee details." };
  }

  // 1. Verify caller permissions
  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  const isOwnerOrAdmin =
    callerMember.role === "owner" || callerMember.role === "admin";
  const isSelf = user.id === targetUserId;

  if (!isOwnerOrAdmin && !isSelf) {
    return {
      success: false,
      error: "You do not have permission to edit other members.",
    };
  }

  // 2. Fetch current member details
  const { data: currentMember } = await adminClient
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, error: "Member not found in this workspace." };
  }

  // Enforce HR-controlled field protection for self-service updates
  if (!isOwnerOrAdmin) {
    if (
      employeeId !== undefined ||
      role !== undefined ||
      departmentIds !== undefined ||
      employmentType !== undefined ||
      managerId !== undefined ||
      hireDate !== undefined ||
      (jobTitle !== undefined && jobTitle !== currentMember?.job_title)
    ) {
      return {
        success: false,
        error: "Unauthorized. Employees cannot modify HR-controlled employment fields (Employee ID, Role, Department, Job Title, Manager, or Employment Type).",
      };
    }
  }

  // 3. Update workspace_members table (only existing columns)
  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.full_name = fullName?.trim() || null;
  if (jobTitle !== undefined && isOwnerOrAdmin) updates.job_title = jobTitle?.trim() || null;
  if (role !== undefined && isOwnerOrAdmin) {
    updates.role = role;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await adminClient
      .from("workspace_members")
      .update(updates)
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (updateErr) {
      console.error("Error updating workspace_members:", updateErr);
    }
  }

  // 4. Update auth user metadata for extended profile fields
  try {
    const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
    if (targetUser?.user) {
      const existingMeta = targetUser.user.user_metadata || {};
      const newMeta = {
        ...existingMeta,
        ...(fullName !== undefined ? { full_name: fullName?.trim() || null } : {}),
        ...(jobTitle !== undefined ? { job_title: jobTitle?.trim() || null } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(location !== undefined ? { location: location?.trim() || null } : {}),
        ...(employeeId !== undefined ? { employee_id: employeeId?.trim() || null } : {}),
        ...(employmentType !== undefined ? { employment_type: employmentType } : {}),
        ...(employmentStatus !== undefined ? { employment_status: employmentStatus } : {}),
        ...(bio !== undefined ? { bio: bio?.trim() || null } : {}),
        ...(skills !== undefined ? { skills } : {}),
        ...(emergencyContactName !== undefined ? { emergency_contact_name: emergencyContactName?.trim() || null } : {}),
        ...(emergencyContactPhone !== undefined ? { emergency_contact_phone: emergencyContactPhone?.trim() || null } : {}),
        ...(interests !== undefined ? { interests } : {}),
        ...(linkedinUrl !== undefined ? { linkedin_url: linkedinUrl?.trim() || null } : {}),
        ...(websiteUrl !== undefined ? { website_url: websiteUrl?.trim() || null } : {}),
      };
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: newMeta,
      });
    }
  } catch (err) {
    console.error("Error updating user auth metadata:", err);
  }

  // 5. Sync department memberships if provided
  if (departmentIds !== undefined) {
    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (departmentIds.length > 0) {
      const rows = departmentIds.map((deptId) => ({
        workspace_id: workspaceId,
        department_id: deptId,
        user_id: targetUserId,
        job_title: jobTitle || currentMember?.job_title || null,
      }));

      await adminClient.from("department_members").insert(rows);
    }
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
    revalidatePath(`/app/people/${targetUserId}`);
  } catch {}

  return { success: true };
}

/**
 * Toggle a member's active/inactive status
 */
export async function toggleMemberStatusAction(
  workspaceId: string,
  targetUserId: string,
  employmentStatus: "Active" | "Inactive" | "On Leave" | "Terminated"
): Promise<PeopleActionResult> {
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const adminClient = createAdminClient();

  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return { success: false, error: "Only owners and admins can change member status." };
  }

  try {
    const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
    if (targetUser?.user) {
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...targetUser.user.user_metadata,
          employment_status: employmentStatus,
        },
      });
    }
  } catch (err) {
    console.error("Error updating member status:", err);
    return { success: false, error: "Failed to update member status." };
  }

  try {
    revalidatePath("/app/people");
    revalidatePath(`/app/people/${targetUserId}`);
  } catch {}

  return { success: true };
}

/**
 * Invite a person to the workspace with full employee metadata
 */
export async function invitePersonAction(
  rawInput: InvitePersonInput
): Promise<PeopleActionResult> {
  const parsed = InvitePersonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const {
    workspaceId,
    email,
    fullName,
    jobTitle,
    departmentId,
    employmentType = "Full-time",
    role = "member",
  } = input;

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to invite team members." };
  }

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Please provide a valid email address." };
  }

  const trimmedName = fullName?.trim();
  if (!trimmedName) {
    return { success: false, error: "Please provide the employee's full name." };
  }

  const adminClient = createAdminClient();

  // 1. Verify caller permissions
  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return {
      success: false,
      error: "Only workspace owners and admins can invite new employees.",
    };
  }

  // Delegate directly to the centralized employee invitation workflow to generate invitation record and send email
  const { inviteEmployeeAction } = await import("@/lib/invitations/actions");
  const inviteResult = await inviteEmployeeAction({
    workspaceId,
    email: trimmedEmail,
    fullName: trimmedName,
    role,
    jobTitle: jobTitle?.trim() || undefined,
    employmentType: (employmentType as any) || undefined,
  });

  if (!inviteResult.success && inviteResult.error) {
    return { success: false, error: inviteResult.error };
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
  } catch {}

  return {
    success: true,
    data: inviteResult.data,
  };
}

/**
 * Remove a person from a department
 */
export async function removePersonFromDepartmentAction(
  departmentId: string,
  workspaceId: string,
  userId: string
): Promise<PeopleActionResult> {
  const parsed = RemovePersonFromDeptSchema.safeParse({ departmentId, workspaceId, userId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const adminClient = createAdminClient();

  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return {
      success: false,
      error: "Only workspace owners and admins can manage department memberships.",
    };
  }

  const { error } = await adminClient
    .from("department_members")
    .delete()
    .eq("department_id", departmentId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing department member:", error);
    return { success: false, error: error.message };
  }

  try {
    revalidatePath("/app/people");
    revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}

/**
 * Assign a person to a department
 */
export async function assignPersonToDepartmentAction(
  rawInput: AssignDepartmentInput
): Promise<PeopleActionResult> {
  const parsed = AssignDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { workspaceId, departmentId, userId, jobTitle } = input;

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const adminClient = createAdminClient();

  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return {
      success: false,
      error: "Only workspace owners and admins can manage department memberships.",
    };
  }

  await adminClient
    .from("department_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (departmentId) {
    const { error } = await adminClient.from("department_members").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: userId,
      job_title: jobTitle?.trim() || null,
    });

    if (error) {
      console.error("Error assigning department member:", error);
      return { success: false, error: error.message };
    }
  }

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
    if (departmentId) revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}

/**
 * Submit employee onboarding application with profile, photo, CV, and password
 */
export async function submitEmployeeOnboardingAction(rawInput: {
  workspaceId: string;
  token: string;
  fullName: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
  cvUrl?: string;
  cvFileName?: string;
  password?: string;
}): Promise<PeopleActionResult> {
  const parsed = CompleteOnboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { workspaceId, token, fullName, phone, address, bio, avatarUrl, cvUrl, cvFileName, password } = input;

  const { getInvitationByToken } = await import("@/lib/invitations/queries");
  const { invitation, error: invError } = await getInvitationByToken(token);

  if (invError || !invitation) {
    return { success: false, error: invError || "Invalid or expired invitation token." };
  }

  const email = invitation.email.toLowerCase().trim();
  const adminClient = createAdminClient();

  // 1. Find or create auth user
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  let authUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!authUser) {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: password || "ZambicWelcome2026!",
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        cv_url: cvUrl || null,
        cv_file_name: cvFileName || null,
        employment_type: invitation.employment_type || "Full-time",
        employment_status: "Active",
      },
    });

    if (createError || !newUser.user) {
      return { success: false, error: createError?.message || "Failed to create user account." };
    }
    authUser = newUser.user;
  } else {
    // Update metadata & password
    await adminClient.auth.admin.updateUserById(authUser.id, {
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        ...authUser.user_metadata,
        full_name: fullName,
        phone: phone || authUser.user_metadata?.phone || null,
        address: address || authUser.user_metadata?.address || null,
        bio: bio || authUser.user_metadata?.bio || null,
        avatar_url: avatarUrl || authUser.user_metadata?.avatar_url || null,
        cv_url: cvUrl || authUser.user_metadata?.cv_url || null,
        cv_file_name: cvFileName || authUser.user_metadata?.cv_file_name || null,
        employment_status: "Active",
      },
    });
  }

  const { recruitmentStore } = await import("@/lib/recruitment/store");
  const employeeId = recruitmentStore.getNextEmployeeId(workspaceId);

  // 2. Add member directly to workspace_members table in Database
  await adminClient.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: authUser.id,
      role: invitation.role || "member",
      full_name: fullName?.trim() || (authUser.user_metadata?.full_name as string) || authUser.email?.split("@")[0] || "Team Member",
      job_title: invitation.job_title || null,
      avatar_url: avatarUrl || null,
      phone: phone || null,
      location: address || null,
      bio: bio || null,
      employee_id: employeeId || null,
      employment_type: invitation.employment_type || "Full-time",
      employment_status: "Active",
      hire_date: new Date().toISOString().split("T")[0],
    },
    { onConflict: "workspace_id,user_id" }
  );

  // 3. Add to department_members if department was assigned
  if (invitation.department_id) {
    try {
      await adminClient.from("department_members").upsert(
        {
          workspace_id: workspaceId,
          department_id: invitation.department_id,
          user_id: authUser.id,
          job_title: invitation.job_title || null,
          role: invitation.role || "member",
        },
        { onConflict: "department_id,user_id" }
      );
    } catch (deptErr) {
      console.warn("Department member assignment warning:", deptErr);
    }
  }

  // 4. Mark invitation as accepted in database
  try {
    if (invitation.id) {
      await adminClient
        .from("workspace_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);
    }
    if (token) {
      await adminClient
        .from("workspace_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("token", token);
    }
    if (email) {
      await adminClient
        .from("workspace_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("email", email);
    }
  } catch {}

  const updatedInv: WorkspaceInvitation = {
    ...invitation,
    status: "accepted",
    accepted_at: new Date().toISOString(),
  };
  recruitmentStore.saveInvitation(updatedInv);

  // 5. Complete recruitment onboarding record
  const completedChecklist: OnboardingChecklistItem[] = [
    {
      id: `chk-1-${authUser.id}`,
      title: "Accept Workspace Invitation",
      description: "Invitation confirmed and account profile created.",
      section: "profile",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: `chk-2-${authUser.id}`,
      title: "Complete Profile & Contact Information",
      description: `Phone: ${phone || "Provided"}, Address: ${address || "Provided"}`,
      section: "profile",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: `chk-3-${authUser.id}`,
      title: "Upload Profile Photo",
      description: avatarUrl ? "Profile photo uploaded." : "Default avatar used.",
      section: "profile",
      required: false,
      completed: Boolean(avatarUrl),
      completed_at: avatarUrl ? new Date().toISOString() : undefined,
    },
    {
      id: `chk-4-${authUser.id}`,
      title: "Upload Resume / CV Document",
      description: cvFileName ? `Uploaded file: ${cvFileName}` : "Profile setup complete.",
      section: "documents",
      required: false,
      completed: Boolean(cvUrl),
      completed_at: cvUrl ? new Date().toISOString() : undefined,
    },
  ];

  const onboardingObj: EmployeeOnboarding = {
    id: `onb-${authUser.id}`,
    workspace_id: workspaceId,
    user_id: authUser.id,
    employee_id: employeeId,
    status: "Completed",
    progress_percentage: 100,
    checklist: completedChecklist,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveOnboarding(onboardingObj);

  // 6. Notify workspace owner / inviter
  try {
    const { notificationStore } = await import("@/lib/notifications/store");
    notificationStore.addNotification({
      workspace_id: workspaceId,
      user_id: invitation.invited_by || "admin",
      type: "invitation_accepted",
      title: "New Team Member Joined!",
      subtitle: `${fullName} (${email}) has completed onboarding and joined the workspace.`,
      action_url: `/app/people/${authUser.id}`,
      entity_type: "invitation",
      entity_id: invitation.id,
    });
  } catch {}

  // 7. Auto-sign-in the newly registered user so they can immediately access /app
  try {
    if (password) {
      const userClient = await createClient();
      await userClient.auth.signInWithPassword({
        email,
        password,
      });
    }
  } catch (authErr) {
    console.warn("[Onboarding Auto-login notice]", authErr);
  }

  // 8. Send Welcome Email via Resend
  try {
    const { sendWelcomeEmail } = await import("@/lib/email/resend");
    const { data: ws } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle();

    await sendWelcomeEmail({
      workspaceName: ws?.name || "Zambic Workspace",
      recipientEmail: email,
      recipientName: fullName,
      dashboardUrl: `${getAppUrl()}/app`,
    });
  } catch {}

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
    revalidatePath("/app");
  } catch {}

  return {
    success: true,
    data: {
      directAccess: true,
      role: invitation.role || "member",
      employeeId,
      userId: authUser.id,
    },
  };
}

/**
 * Approve employee onboarding and activate their workspace access
 */
export async function approveEmployeeOnboardingAction(rawInput: {
  workspaceId: string;
  userId: string;
  departmentId?: string;
  role?: WorkspaceRole;
  jobTitle?: string;
}): Promise<PeopleActionResult> {
  const parsed = ApproveOnboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { workspaceId, userId, departmentId, role = "member", jobTitle } = input;

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const adminClient = createAdminClient();

  // 1. Verify caller is owner/admin
  const { data: callerMember } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return { success: false, error: "Only owners and admins can approve employee onboardings." };
  }

  // 2. Activate member in workspace_members
  await adminClient.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role,
      job_title: jobTitle?.trim() || null,
    },
    { onConflict: "workspace_id,user_id" }
  );

  // 3. Assign Department if provided
  if (departmentId) {
    await adminClient.from("department_members").upsert(
      {
        workspace_id: workspaceId,
        department_id: departmentId,
        user_id: userId,
        job_title: jobTitle?.trim() || null,
      },
      { onConflict: "department_id,user_id" }
    );
  }

  // 4. Update auth metadata to Active
  try {
    const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
    if (targetUser?.user) {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...targetUser.user.user_metadata,
          employment_status: "Active",
          job_title: jobTitle?.trim() || targetUser.user.user_metadata?.job_title || null,
        },
      });
    }
  } catch {}

  // 5. Update Onboarding status in store to Completed
  const { recruitmentStore } = await import("@/lib/recruitment/store");
  const onboarding = recruitmentStore.getOnboardingByUserId(userId, workspaceId);
  if (onboarding) {
    onboarding.status = "Completed";
    onboarding.progress_percentage = 100;
    onboarding.completed_at = new Date().toISOString();
    onboarding.checklist = (onboarding.checklist || []).map((c) => ({
      ...c,
      completed: true,
      completed_at: c.completed_at || new Date().toISOString(),
    }));
    recruitmentStore.saveOnboarding(onboarding);
  }

  // 6. Update invitations table
  try {
    await adminClient
      .from("workspace_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
  } catch {}

  // 7. Dispatch welcome notification
  try {
    const { notificationStore } = await import("@/lib/notifications/store");
    notificationStore.addNotification({
      workspace_id: workspaceId,
      user_id: userId,
      type: "system",
      title: "Onboarding Approved! 🎉",
      subtitle: "Your onboarding application has been approved. Welcome to the team!",
      action_url: "/app",
      entity_type: "system",
    });
  } catch {}

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
    revalidatePath(`/app/people/onboarding/${userId}`);
    if (departmentId) revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}

/**
 * Reject employee onboarding application
 */
export async function rejectEmployeeOnboardingAction(rawInput: {
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<PeopleActionResult> {
  const parsed = RejectOnboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { workspaceId, userId } = input;

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized." };

  const { recruitmentStore } = await import("@/lib/recruitment/store");
  const onboarding = recruitmentStore.getOnboardingByUserId(userId, workspaceId);
  if (onboarding) {
    onboarding.status = "Documents Pending";
    recruitmentStore.saveOnboarding(onboarding);
  }

  try {
    revalidatePath("/app/people");
    revalidatePath(`/app/people/onboarding/${userId}`);
  } catch {}

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ROW MENU ACTIONS: Role, Depts, Dept Lead, Deactivate, Remove (Req 6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get count of open tasks assigned to a member before deactivating/removing
 */
export async function getMemberOpenTasksAction(
  workspaceId: string,
  targetUserId: string
): Promise<{ success: boolean; count: number; tasks: { id: string; title: string }[] }> {
  try {
    const adminClient = createAdminClient();
    const { data: tasks, error } = await adminClient
      .from("tasks")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .eq("assignee_id", targetUserId)
      .neq("status", "done")
      .limit(50);

    if (error) {
      return { success: false, count: 0, tasks: [] };
    }

    return {
      success: true,
      count: tasks?.length || 0,
      tasks: tasks || [],
    };
  } catch (err) {
    return { success: false, count: 0, tasks: [] };
  }
}

/**
 * Change member role with safety validations & audit log
 */
export async function changeMemberRoleAction(rawInput: {
  workspaceId: string;
  targetUserId: string;
  newRole: WorkspaceRole;
}): Promise<PeopleActionResult> {
  try {
    const { requirePermission, validateRoleChangeSafety, logAuditEvent } = await import(
      "@/lib/permissions-server"
    );

    const actor = await requirePermission("members:manage_roles", {
      workspaceId: rawInput.workspaceId,
      targetUserId: rawInput.targetUserId,
      targetRole: rawInput.newRole as any,
    });

    const safety = await validateRoleChangeSafety(actor, rawInput.targetUserId, rawInput.newRole as any);
    if (!safety.allowed) {
      return { success: false, error: safety.error || "Cannot perform this role change." };
    }

    const adminClient = createAdminClient();
    const { error: updateErr } = await adminClient
      .from("workspace_members")
      .update({ role: rawInput.newRole })
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await logAuditEvent({
      workspaceId: rawInput.workspaceId,
      actorId: actor.userId,
      action: "member_role_changed",
      targetUserId: rawInput.targetUserId,
      entityType: "workspace_member",
      details: { newRole: rawInput.newRole },
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/${rawInput.targetUserId}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change member role.";
    return { success: false, error: msg };
  }
}

/**
 * Change member departments with audit log
 */
export async function changeMemberDepartmentsAction(rawInput: {
  workspaceId: string;
  targetUserId: string;
  departmentIds: string[];
}): Promise<PeopleActionResult> {
  try {
    const { requirePermission, logAuditEvent } = await import("@/lib/permissions-server");

    const actor = await requirePermission("members:manage_roles", {
      workspaceId: rawInput.workspaceId,
      targetUserId: rawInput.targetUserId,
    });

    const adminClient = createAdminClient();

    // Remove existing department memberships
    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    // Insert new department memberships
    if (rawInput.departmentIds.length > 0) {
      const rows = rawInput.departmentIds.map((deptId) => ({
        workspace_id: rawInput.workspaceId,
        department_id: deptId,
        user_id: rawInput.targetUserId,
        role: "member",
        is_lead: false,
      }));
      await adminClient.from("department_members").insert(rows);
    }

    await logAuditEvent({
      workspaceId: rawInput.workspaceId,
      actorId: actor.userId,
      action: "member_departments_changed",
      targetUserId: rawInput.targetUserId,
      entityType: "workspace_member",
      details: { departmentIds: rawInput.departmentIds },
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/departments");
      revalidatePath(`/app/people/${rawInput.targetUserId}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member departments.";
    return { success: false, error: msg };
  }
}

/**
 * Set or unset a member as department lead with audit log
 */
export async function setDepartmentLeadAction(rawInput: {
  workspaceId: string;
  departmentId: string;
  targetUserId: string;
  isLead: boolean;
}): Promise<PeopleActionResult> {
  try {
    const { requirePermission, logAuditEvent } = await import("@/lib/permissions-server");

    const actor = await requirePermission("departments:edit", {
      workspaceId: rawInput.workspaceId,
      departmentId: rawInput.departmentId,
    });

    const adminClient = createAdminClient();

    // Ensure user is in department_members
    const { data: existing } = await adminClient
      .from("department_members")
      .select("id")
      .eq("department_id", rawInput.departmentId)
      .eq("user_id", rawInput.targetUserId)
      .maybeSingle();

    if (!existing) {
      await adminClient.from("department_members").insert({
        workspace_id: rawInput.workspaceId,
        department_id: rawInput.departmentId,
        user_id: rawInput.targetUserId,
        role: rawInput.isLead ? "lead" : "member",
        is_lead: rawInput.isLead,
      });
    } else {
      await adminClient
        .from("department_members")
        .update({
          is_lead: rawInput.isLead,
          role: rawInput.isLead ? "lead" : "member",
        })
        .eq("department_id", rawInput.departmentId)
        .eq("user_id", rawInput.targetUserId);
    }

    // Update departments lead_id column
    if (rawInput.isLead) {
      await adminClient
        .from("departments")
        .update({ lead_id: rawInput.targetUserId })
        .eq("id", rawInput.departmentId);
    } else {
      await adminClient
        .from("departments")
        .update({ lead_id: null })
        .eq("id", rawInput.departmentId)
        .eq("lead_id", rawInput.targetUserId);
    }

    await logAuditEvent({
      workspaceId: rawInput.workspaceId,
      actorId: actor.userId,
      action: rawInput.isLead ? "department_lead_assigned" : "department_lead_removed",
      targetUserId: rawInput.targetUserId,
      entityType: "department",
      entityId: rawInput.departmentId,
      details: { isLead: rawInput.isLead },
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/departments/${rawInput.departmentId}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update department lead.";
    return { success: false, error: msg };
  }
}

/**
 * Deactivate a workspace member with task reassignment & audit log
 */
export async function deactivateMemberAction(rawInput: {
  workspaceId: string;
  targetUserId: string;
  reassignToUserId?: string | null;
}): Promise<PeopleActionResult> {
  try {
    const { requirePermission, validateMemberRemovalSafety, logAuditEvent } = await import(
      "@/lib/permissions-server"
    );

    const actor = await requirePermission("members:manage_roles", {
      workspaceId: rawInput.workspaceId,
      targetUserId: rawInput.targetUserId,
    });

    const safety = await validateMemberRemovalSafety(actor, rawInput.targetUserId);
    if (!safety.allowed) {
      return { success: false, error: safety.error || "Cannot deactivate this member." };
    }

    const adminClient = createAdminClient();

    // Mark as deactivated in workspace_members
    const { error: updateErr } = await adminClient
      .from("workspace_members")
      .update({
        is_deactivated: true,
        employment_status: "Inactive",
      })
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Reassign open tasks if replacement user is specified
    let reassignedCount = 0;
    if (rawInput.reassignToUserId) {
      const { data: reassignedTasks } = await adminClient
        .from("tasks")
        .update({ assignee_id: rawInput.reassignToUserId })
        .eq("workspace_id", rawInput.workspaceId)
        .eq("assignee_id", rawInput.targetUserId)
        .neq("status", "done")
        .select("id");

      reassignedCount = reassignedTasks?.length || 0;
    }

    await logAuditEvent({
      workspaceId: rawInput.workspaceId,
      actorId: actor.userId,
      action: "member_deactivated",
      targetUserId: rawInput.targetUserId,
      entityType: "workspace_member",
      details: {
        reassignToUserId: rawInput.reassignToUserId,
        reassignedTasksCount: reassignedCount,
      },
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/tasks");
      revalidatePath(`/app/people/${rawInput.targetUserId}`);
    } catch {}

    return { success: true, data: { reassignedCount } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to deactivate member.";
    return { success: false, error: msg };
  }
}

/**
 * Remove a member completely from workspace with task reassignment & audit log
 */
export async function removeMemberAction(rawInput: {
  workspaceId: string;
  targetUserId: string;
  reassignToUserId?: string | null;
}): Promise<PeopleActionResult> {
  try {
    const { requirePermission, validateMemberRemovalSafety, logAuditEvent } = await import(
      "@/lib/permissions-server"
    );

    const actor = await requirePermission("members:manage_roles", {
      workspaceId: rawInput.workspaceId,
      targetUserId: rawInput.targetUserId,
    });

    const safety = await validateMemberRemovalSafety(actor, rawInput.targetUserId);
    if (!safety.allowed) {
      return { success: false, error: safety.error || "Cannot remove this member." };
    }

    const adminClient = createAdminClient();

    // Reassign open tasks if specified
    let reassignedCount = 0;
    if (rawInput.reassignToUserId) {
      const { data: reassignedTasks } = await adminClient
        .from("tasks")
        .update({ assignee_id: rawInput.reassignToUserId })
        .eq("workspace_id", rawInput.workspaceId)
        .eq("assignee_id", rawInput.targetUserId)
        .neq("status", "done")
        .select("id");

      reassignedCount = reassignedTasks?.length || 0;
    }

    // Delete memberships
    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    await adminClient
      .from("project_members")
      .delete()
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    const { error: deleteErr } = await adminClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", rawInput.workspaceId)
      .eq("user_id", rawInput.targetUserId);

    if (deleteErr) {
      return { success: false, error: deleteErr.message };
    }

    await logAuditEvent({
      workspaceId: rawInput.workspaceId,
      actorId: actor.userId,
      action: "member_removed",
      targetUserId: rawInput.targetUserId,
      entityType: "workspace_member",
      details: {
        reassignToUserId: rawInput.reassignToUserId,
        reassignedTasksCount: reassignedCount,
      },
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/tasks");
      revalidatePath("/app/departments");
    } catch {}

    return { success: true, data: { reassignedCount } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove member.";
    return { success: false, error: msg };
  }
}

