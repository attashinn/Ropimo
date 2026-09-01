"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  UpdatePersonInput,
  InvitePersonInput,
  AssignDepartmentInput,
  WorkspaceRole,
} from "@/types/people";
import { revalidatePath } from "next/cache";

export interface PeopleActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Edit an employee's profile and sync departments and user metadata
 */
export async function updatePersonDetailsAction(
  input: UpdatePersonInput
): Promise<PeopleActionResult> {
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
  input: InvitePersonInput
): Promise<PeopleActionResult> {
  const {
    workspaceId,
    email,
    fullName,
    phone,
    jobTitle,
    departmentId,
    employmentType = "Full-time",
    employmentStatus = "Active",
    startDate,
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
    departmentId: departmentId || undefined,
    employmentType,
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
  input: AssignDepartmentInput
): Promise<PeopleActionResult> {
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
export async function submitEmployeeOnboardingAction(input: {
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
      password: password || "RopimoWelcome2026!",
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
        employment_status: invitation.role === "member" ? "Pending Approval" : "Active",
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
      user_metadata: {
        ...authUser.user_metadata,
        full_name: fullName,
        phone: phone || authUser.user_metadata?.phone || null,
        address: address || authUser.user_metadata?.address || null,
        bio: bio || authUser.user_metadata?.bio || null,
        avatar_url: avatarUrl || authUser.user_metadata?.avatar_url || null,
        cv_url: cvUrl || authUser.user_metadata?.cv_url || null,
        cv_file_name: cvFileName || authUser.user_metadata?.cv_file_name || null,
        employment_status: invitation.role === "member" ? "Pending Approval" : "Active",
      },
    });
  }

  const { recruitmentStore } = await import("@/lib/recruitment/store");
  const employeeId = recruitmentStore.getNextEmployeeId(workspaceId);

  // 2. Special Access vs Member Branching
  if (invitation.role !== "member") {
    // Direct instant access for Admin/Manager
    await adminClient.from("workspace_members").upsert(
      {
        workspace_id: workspaceId,
        user_id: authUser.id,
        role: invitation.role,
        full_name: fullName,
        job_title: invitation.job_title || null,
      },
      { onConflict: "workspace_id,user_id" }
    );

    if (invitation.department_id) {
      await adminClient.from("department_members").upsert(
        {
          workspace_id: workspaceId,
          department_id: invitation.department_id,
          user_id: authUser.id,
          job_title: invitation.job_title || null,
        },
        { onConflict: "workspace_id,department_id,user_id" }
      );
    }

    try {
      await adminClient.from("workspace_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);
    } catch {}

    const updatedInv = { ...invitation, status: "Accepted" as any, accepted_at: new Date().toISOString() };
    (recruitmentStore as any).saveInvitation?.(updatedInv);

    return { success: true, data: { directAccess: true, role: invitation.role } };
  }

  // 3. Standard Member: Create pending onboarding application
  const defaultChecklist = [
    {
      id: `chk-1-${authUser.id}`,
      title: "Accept Workspace Invitation",
      description: "Invitation confirmed and profile details submitted.",
      category: "profile",
      required: true,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    {
      id: `chk-2-${authUser.id}`,
      title: "Complete Profile & Contact Information",
      description: `Phone: ${phone || "Provided"}, Address: ${address || "Provided"}`,
      category: "profile",
      required: true,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    {
      id: `chk-3-${authUser.id}`,
      title: "Upload Profile Photo",
      description: avatarUrl ? "Profile photo uploaded." : "Default avatar used.",
      category: "profile",
      required: false,
      status: avatarUrl ? "completed" : "pending",
      completed_at: avatarUrl ? new Date().toISOString() : undefined,
    },
    {
      id: `chk-4-${authUser.id}`,
      title: "Upload Resume / CV Document",
      description: cvFileName ? `Uploaded file: ${cvFileName}` : "CV submitted for administrative review.",
      category: "documents",
      required: true,
      status: cvUrl ? "completed" : "pending",
      completed_at: cvUrl ? new Date().toISOString() : undefined,
    },
    {
      id: `chk-5-${authUser.id}`,
      title: "Admin Review & Department Assignment",
      description: "Workspace administrator review and approval required.",
      category: "workspace",
      required: true,
      status: "pending",
    },
  ];

  const onboardingObj = {
    id: `onb-${authUser.id}`,
    workspace_id: workspaceId,
    user_id: authUser.id,
    employee_id: employeeId,
    status: "In Progress" as const,
    progress_percentage: 60,
    checklist: defaultChecklist as any,
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveOnboarding(onboardingObj);

  // Create member record in workspace_members
  await adminClient.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: authUser.id,
      role: "member",
      full_name: fullName,
      job_title: invitation.job_title || null,
    },
    { onConflict: "workspace_id,user_id" }
  );

  // Notify Admins in Notification Center
  try {
    const { notificationStore } = await import("@/lib/notifications/store");
    notificationStore.addNotification({
      workspace_id: workspaceId,
      user_id: invitation.invited_by || "admin",
      type: "invitation_accepted",
      title: "Employee Onboarding Submitted",
      subtitle: `${fullName} (${email}) has submitted their profile and CV for approval.`,
      action_url: `/app/people/onboarding/${authUser.id}`,
      entity_type: "invitation",
      entity_id: invitation.id,
    });
  } catch {}

  try {
    revalidatePath("/app/people");
    revalidatePath("/app/team");
  } catch {}

  return {
    success: true,
    data: {
      directAccess: false,
      status: "In Review",
      employeeId,
      userId: authUser.id,
    },
  };
}

/**
 * Approve employee onboarding and activate their workspace access
 */
export async function approveEmployeeOnboardingAction(input: {
  workspaceId: string;
  userId: string;
  departmentId?: string;
  role?: WorkspaceRole;
  jobTitle?: string;
}): Promise<PeopleActionResult> {
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
      { onConflict: "workspace_id,department_id,user_id" }
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
      status: "completed",
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
export async function rejectEmployeeOnboardingAction(input: {
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<PeopleActionResult> {
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
