"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  Department,
  DepartmentRole,
} from "@/types/department";
import { getDepartmentUserRoleAndPermissions } from "./permissions";
import { revalidatePath } from "next/cache";

export interface DepartmentActionResult {
  success: boolean;
  department?: Department;
  error?: string;
  data?: any;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "department";
}

async function getCallerUser() {
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
  return user;
}

// ─── 1. CREATE DEPARTMENT ────────────────────────────────────────────────────

export async function createDepartmentAction(
  input: CreateDepartmentInput
): Promise<DepartmentActionResult> {
  const { workspaceId, name, description, icon, color, leadId } = input;

  if (!workspaceId) {
    return { success: false, error: "Workspace ID is required." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Department name must be at least 2 characters." };
  }

  const adminClient = createAdminClient();
  const user = await getCallerUser();

  if (!user) {
    return { success: false, error: "You must be logged in to create a department." };
  }

  // Verify workspace owner/admin
  const { data: member } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return {
      success: false,
      error: "Only workspace owners and admins can create departments.",
    };
  }

  let slug = generateSlug(trimmedName);
  const { data: existingDept } = await adminClient
    .from("departments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingDept) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  const { data: newDept, error: insertError } = await adminClient
    .from("departments")
    .insert({
      workspace_id: workspaceId,
      name: trimmedName,
      slug,
      description: description?.trim() || null,
      icon: icon || "building",
      color: color || "#10251F",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError || !newDept) {
    console.error("Department creation error:", insertError);
    return {
      success: false,
      error: insertError?.message || "Failed to create department. Please try again.",
    };
  }

  // If lead is specified, add them as department lead
  if (leadId) {
    await adminClient.from("department_members").upsert(
      {
        workspace_id: workspaceId,
        department_id: newDept.id,
        user_id: leadId,
        job_title: "Department Lead",
      },
      { onConflict: "department_id,user_id" }
    );
  }

  // Log activity
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: newDept.id,
      user_id: user.id,
      action_type: "department_created",
      message: `created department "${trimmedName}"`,
      details: { department_id: newDept.id, name: trimmedName },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
  } catch {}

  return {
    success: true,
    department: newDept as Department,
  };
}

// ─── 2. UPDATE DEPARTMENT SETTINGS ───────────────────────────────────────────

export async function updateDepartmentAction(
  input: UpdateDepartmentInput
): Promise<DepartmentActionResult> {
  const { departmentId, workspaceId, name, description, icon, color, leadId } = input;

  if (!departmentId || !workspaceId) {
    return { success: false, error: "Department ID and Workspace ID are required." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Department name must be at least 2 characters." };
  }

  const user = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, user?.id);

  if (!perms.canEditSettings) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can update department settings.",
    };
  }

  const adminClient = createAdminClient();

  const updates: Record<string, any> = {
    name: trimmedName,
    description: description?.trim() || null,
    icon: icon || "building",
    color: color || "#10251F",
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await adminClient
    .from("departments")
    .update(updates)
    .eq("id", departmentId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("Department update error:", updateError);
    return {
      success: false,
      error: updateError?.message || "Failed to update department.",
    };
  }

  // If lead changed, update department_members
  if (leadId) {
    await adminClient.from("department_members").upsert(
      {
        workspace_id: workspaceId,
        department_id: departmentId,
        user_id: leadId,
        job_title: "Department Lead",
      },
      { onConflict: "department_id,user_id" }
    );
  }

  // Audit log
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: user?.id || null,
      action_type: "department_settings_updated",
      message: `updated settings for department "${trimmedName}"`,
      details: { department_id: departmentId, name: trimmedName },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return {
    success: true,
    department: updated as Department,
  };
}

// ─── 3. DELETE DEPARTMENT ────────────────────────────────────────────────────

export async function deleteDepartmentAction(
  departmentId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!departmentId || !workspaceId) {
    return { success: false, error: "Department ID and Workspace ID are required." };
  }

  const user = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, user?.id);

  if (!perms.canDeleteDepartment) {
    return {
      success: false,
      error: "Unauthorized: Only Workspace Owners and Admins can delete departments.",
    };
  }

  const adminClient = createAdminClient();

  const { error: deleteError } = await adminClient
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .eq("workspace_id", workspaceId);

  if (deleteError) {
    console.error("Department deletion error:", deleteError);
    return {
      success: false,
      error: deleteError.message || "Failed to delete department.",
    };
  }

  try {
    revalidatePath("/app/departments");
  } catch {}

  return { success: true };
}

// ─── 4. ADD DEPARTMENT MEMBER ────────────────────────────────────────────────

export async function addDepartmentMemberAction(params: {
  departmentId: string;
  workspaceId: string;
  userId: string;
  role?: DepartmentRole;
  jobTitle?: string;
}): Promise<DepartmentActionResult> {
  const { departmentId, workspaceId, userId, role = "member", jobTitle } = params;

  if (!departmentId || !workspaceId || !userId) {
    return { success: false, error: "Department, Workspace, and User ID are required." };
  }

  const callerUser = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, callerUser?.id);

  if (!perms.canManageMembers) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can add members.",
    };
  }

  const adminClient = createAdminClient();

  // Verify target user is a workspace member
  const { data: targetMember } = await adminClient
    .from("workspace_members")
    .select("user_id, full_name, job_title")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMember) {
    return { success: false, error: "Selected user is not a member of this workspace." };
  }

  // Prevent duplicate department membership
  const { data: existing } = await adminClient
    .from("department_members")
    .select("id")
    .eq("department_id", departmentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "This user is already a member of this department.",
    };
  }

  let finalJobTitle = jobTitle?.trim();
  if (!finalJobTitle) {
    if (role === "lead") finalJobTitle = "Department Lead";
    else if (role === "manager") finalJobTitle = "Manager";
    else finalJobTitle = targetMember.job_title || "Team Member";
  }

  const { data: newMember, error: insertError } = await adminClient
    .from("department_members")
    .insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: userId,
      job_title: finalJobTitle,
    })
    .select()
    .single();

  if (insertError || !newMember) {
    console.error("Add department member error:", insertError);
    return { success: false, error: insertError?.message || "Failed to add member to department." };
  }

  // Audit activity log
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: callerUser?.id || null,
      action_type: "department_member_added",
      message: `added ${targetMember.full_name || "a member"} to the department as ${role}`,
      details: { department_id: departmentId, user_id: userId, role },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
    revalidatePath(`/app/people/${userId}`);
  } catch {}

  return { success: true, data: newMember };
}

// ─── 5. REMOVE DEPARTMENT MEMBER ─────────────────────────────────────────────

export async function removeDepartmentMemberAction(params: {
  departmentId: string;
  workspaceId: string;
  userId: string;
}): Promise<DepartmentActionResult> {
  const { departmentId, workspaceId, userId } = params;

  if (!departmentId || !workspaceId || !userId) {
    return { success: false, error: "Department, Workspace, and User ID are required." };
  }

  const callerUser = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, callerUser?.id);

  if (!perms.canManageMembers) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can remove members.",
    };
  }

  const adminClient = createAdminClient();

  // Remove ONLY department_members record
  const { error: deleteError } = await adminClient
    .from("department_members")
    .delete()
    .eq("department_id", departmentId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Remove department member error:", deleteError);
    return { success: false, error: deleteError.message || "Failed to remove member from department." };
  }

  // Audit activity log
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: callerUser?.id || null,
      action_type: "department_member_removed",
      message: `removed a member from the department`,
      details: { department_id: departmentId, user_id: userId },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
    revalidatePath(`/app/people/${userId}`);
  } catch {}

  return { success: true };
}

// ─── 6. UPDATE DEPARTMENT MEMBER ROLE ─────────────────────────────────────────

export async function updateDepartmentMemberRoleAction(params: {
  departmentId: string;
  workspaceId: string;
  userId: string;
  role: DepartmentRole;
}): Promise<DepartmentActionResult> {
  const { departmentId, workspaceId, userId, role } = params;

  if (!departmentId || !workspaceId || !userId || !role) {
    return { success: false, error: "Missing required parameters." };
  }

  const callerUser = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, callerUser?.id);

  if (!perms.canManageMembers) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can change member roles.",
    };
  }

  const adminClient = createAdminClient();

  let newJobTitle = "Team Member";
  if (role === "lead") newJobTitle = "Department Lead";
  else if (role === "manager") newJobTitle = "Manager";

  const { error: updateError } = await adminClient
    .from("department_members")
    .update({ job_title: newJobTitle })
    .eq("department_id", departmentId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (updateError) {
    console.error("Update department role error:", updateError);
    return { success: false, error: updateError.message || "Failed to update member role." };
  }

  // Audit log
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: callerUser?.id || null,
      action_type: "department_role_changed",
      message: `updated member role to ${role}`,
      details: { department_id: departmentId, user_id: userId, role },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}

// ─── 7. ASSIGN DEPARTMENT LEAD ───────────────────────────────────────────────

export async function assignDepartmentLeadAction(
  departmentId: string,
  workspaceId: string,
  userId: string,
  jobTitle?: string
): Promise<{ success: boolean; error?: string }> {
  if (!departmentId || !workspaceId || !userId) {
    return { success: false, error: "Missing required parameters." };
  }

  const callerUser = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, callerUser?.id);

  if (!perms.canAssignLead) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can assign a department lead.",
    };
  }

  const adminClient = createAdminClient();

  // Verify target user is a workspace member
  const { data: targetMember } = await adminClient
    .from("workspace_members")
    .select("user_id, full_name")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMember) {
    return { success: false, error: "Selected user is not a member of this workspace." };
  }

  // Demote previous lead if their job_title was "Department Lead"
  const { data: currentMembers } = await adminClient
    .from("department_members")
    .select("id, user_id, job_title")
    .eq("department_id", departmentId)
    .eq("workspace_id", workspaceId);

  for (const m of currentMembers || []) {
    if (m.user_id !== userId && m.job_title?.toLowerCase() === "department lead") {
      await adminClient
        .from("department_members")
        .update({ job_title: "Member" })
        .eq("id", m.id);
    }
  }

  // Upsert member as lead
  await adminClient.from("department_members").upsert(
    {
      department_id: departmentId,
      workspace_id: workspaceId,
      user_id: userId,
      job_title: jobTitle || "Department Lead",
    },
    { onConflict: "department_id,user_id" }
  );

  // Audit activity log
  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: callerUser?.id || null,
      action_type: "department_lead_assigned",
      message: `assigned ${targetMember.full_name || "user"} as Department Lead`,
      details: { department_id: departmentId, user_id: userId },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}

// ─── 8. ARCHIVE DEPARTMENT ───────────────────────────────────────────────────

export async function archiveDepartmentAction(
  departmentId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const callerUser = await getCallerUser();
  const perms = await getDepartmentUserRoleAndPermissions(departmentId, workspaceId, callerUser?.id);

  if (!perms.canEditSettings) {
    return {
      success: false,
      error: "Unauthorized: Only Department Leads, Workspace Owners, and Admins can archive departments.",
    };
  }

  const adminClient = createAdminClient();

  try {
    await adminClient.from("workspace_activities").insert({
      workspace_id: workspaceId,
      department_id: departmentId,
      user_id: callerUser?.id || null,
      action_type: "department_settings_updated",
      message: "archived this department",
      details: { department_id: departmentId },
    });
  } catch {}

  try {
    revalidatePath("/app/departments");
    revalidatePath(`/app/departments/${departmentId}`);
  } catch {}

  return { success: true };
}
