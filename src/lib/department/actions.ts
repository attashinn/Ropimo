"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  Department,
  DepartmentRole,
} from "@/types/department";
import { getDepartmentUserRoleAndPermissions } from "./permissions";
import { requirePermission } from "@/lib/permissions-server";
import { revalidatePath } from "next/cache";

export interface DepartmentActionResult {
  success: boolean;
  department?: Department;
  error?: string;
  data?: unknown;
}

const CreateDepartmentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  name: z.string().min(2, "Department name must be at least 2 characters."),
  description: z.string().optional().nullable(),
  icon: z.string().optional().default("building"),
  color: z.string().optional().default("#10251F"),
  leadId: z.string().optional().nullable(),
});

const UpdateDepartmentSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  name: z.string().min(2, "Department name must be at least 2 characters."),
  description: z.string().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  leadId: z.string().optional().nullable(),
});

const DeleteDepartmentSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

const AddDepartmentMemberSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  role: z.enum(["lead", "manager", "member"]).optional().default("member"),
  jobTitle: z.string().optional(),
});

const RemoveDepartmentMemberSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
});

const UpdateDepartmentMemberRoleSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  role: z.enum(["lead", "manager", "member"]),
});

const AssignDepartmentLeadSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  userId: z.string().min(1, "User ID is required."),
  jobTitle: z.string().optional(),
});

const ArchiveDepartmentSchema = z.object({
  departmentId: z.string().min(1, "Department ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

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
  rawInput: CreateDepartmentInput
): Promise<DepartmentActionResult> {
  const parsed = CreateDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { workspaceId, name, description, icon, color, leadId } = input;
  const trimmedName = name.trim();

  const adminClient = createAdminClient();
  const user = await getCallerUser();

  if (!user) {
    return { success: false, error: "You must be logged in to create a department." };
  }

  try {
    await requirePermission("departments:create_delete", { workspaceId }, user.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  rawInput: UpdateDepartmentInput
): Promise<DepartmentActionResult> {
  const parsed = UpdateDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;
  const { departmentId, workspaceId, name, description, icon, color, leadId } = input;
  const trimmedName = name.trim();

  const user = await getCallerUser();
  if (!user) {
    return { success: false, error: "You must be logged in to update department settings." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, user.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
    };
  }

  const adminClient = createAdminClient();

  const updates: Record<string, unknown> = {
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
  const parsed = DeleteDepartmentSchema.safeParse({ departmentId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const user = await getCallerUser();
  if (!user) {
    return { success: false, error: "You must be logged in to delete a department." };
  }

  try {
    await requirePermission("departments:create_delete", { workspaceId }, user.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  const parsed = AddDepartmentMemberSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const { departmentId, workspaceId, userId, role = "member", jobTitle } = parsed.data;

  const callerUser = await getCallerUser();
  if (!callerUser) {
    return { success: false, error: "You must be logged in to add department members." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, callerUser.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  const parsed = RemoveDepartmentMemberSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const { departmentId, workspaceId, userId } = parsed.data;

  const callerUser = await getCallerUser();
  if (!callerUser) {
    return { success: false, error: "You must be logged in to remove department members." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, callerUser.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  const parsed = UpdateDepartmentMemberRoleSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const { departmentId, workspaceId, userId, role } = parsed.data;

  const callerUser = await getCallerUser();
  if (!callerUser) {
    return { success: false, error: "You must be logged in to change member roles." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, callerUser.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  const parsed = AssignDepartmentLeadSchema.safeParse({ departmentId, workspaceId, userId, jobTitle });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const callerUser = await getCallerUser();
  if (!callerUser) {
    return { success: false, error: "You must be logged in to assign a department lead." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, callerUser.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
  const parsed = ArchiveDepartmentSchema.safeParse({ departmentId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const callerUser = await getCallerUser();
  if (!callerUser) {
    return { success: false, error: "You must be logged in to archive departments." };
  }

  try {
    await requirePermission("departments:edit", { workspaceId, departmentId }, callerUser.id);
  } catch (permErr: unknown) {
    const msg = permErr instanceof Error ? permErr.message : "Forbidden";
    return {
      success: false,
      error: msg,
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
