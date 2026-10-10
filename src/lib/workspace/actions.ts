"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters."),
  icon: z.string().optional().default("W"),
});

const SwitchWorkspaceSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

const UpdateWorkspaceSettingsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters."),
  slug: z.string().trim().min(2, "Workspace slug must be at least 2 characters."),
  logoUrl: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export interface CreateWorkspaceResult {
  success: boolean;
  workspaceId?: string;
  slug?: string;
  error?: string;
}

function generateBaseSlug(name: string): string {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || "workspace";
}

export async function createWorkspaceAction(
  name: string,
  icon: string = "W"
): Promise<CreateWorkspaceResult> {
  const parsed = CreateWorkspaceSchema.safeParse({ name, icon });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid workspace name." };
  }
  const trimmedName = parsed.data.name;

  // 1. Verify Authentication using user session cookies
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a workspace." };
  }

  // 2. Generate unique slug
  let slug = generateBaseSlug(trimmedName);
  const adminClient = createAdminClient();

  // Check if slug already exists
  const { data: existingSlug } = await adminClient
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  // 3. Atomically insert Workspace and Owner Membership using verified user.id
  const { data: wsData, error: wsError } = await adminClient
    .from("workspaces")
    .insert({
      name: trimmedName,
      slug,
      icon,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (wsError || !wsData) {
    console.error("Workspace creation error:", wsError);
    return {
      success: false,
      error: wsError?.message || "Failed to create workspace. Please try again.",
    };
  }

  // Add user as owner in workspace_members
  const { error: memberError } = await adminClient
    .from("workspace_members")
    .insert({
      workspace_id: wsData.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    console.error("Workspace member assignment error:", memberError);
    return {
      success: false,
      error: "Workspace created, but could not set membership. Please try again.",
    };
  }

  revalidatePath("/app");
  revalidatePath("/onboarding");

  return {
    success: true,
    workspaceId: wsData.id,
    slug: wsData.slug,
  };
}

export interface SmartOnboardingDepartmentInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CompleteSmartOnboardingInput {
  fullName: string;
  organizationType?: string;
  workspaceName: string;
  monogram?: string;
  companyWebsite?: string;
  companySummary?: string;
  role?: string;
  departments?: SmartOnboardingDepartmentInput[];
  inviteEmails?: string[];
}

export async function completeSmartOnboardingAction(
  input: CompleteSmartOnboardingInput
): Promise<CreateWorkspaceResult> {
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to set up your workspace." };
  }

  const trimmedName = input.workspaceName?.trim() || "My Workspace";
  if (trimmedName.length < 2) {
    return { success: false, error: "Workspace name must be at least 2 characters long." };
  }

  // 1. Update user auth metadata
  if (input.fullName?.trim() || input.role?.trim()) {
    try {
      await authClient.auth.updateUser({
        data: {
          full_name: input.fullName.trim() || user.user_metadata?.full_name,
          role: input.role?.trim() || "Founder",
          onboarding_completed: true,
        },
      });
    } catch (err) {
      console.warn("Auth user metadata update note:", err);
    }
  }

  const adminClient = createAdminClient();

  // 2. Generate unique slug
  let slug = generateBaseSlug(trimmedName);
  const { data: existingSlug } = await adminClient
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  const icon = input.monogram || (trimmedName ? trimmedName[0].toUpperCase() : "W");

  // 3. Insert Workspace
  const { data: wsData, error: wsError } = await adminClient
    .from("workspaces")
    .insert({
      name: trimmedName,
      slug,
      icon,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (wsError || !wsData) {
    console.error("Workspace creation error:", wsError);
    return {
      success: false,
      error: wsError?.message || "Failed to create workspace. Please try again.",
    };
  }

  // 4. Set user as Owner
  await adminClient.from("workspace_members").insert({
    workspace_id: wsData.id,
    user_id: user.id,
    role: "owner",
  });

  // 5. Upsert into people table if available
  try {
    await adminClient.from("people").upsert(
      {
        workspace_id: wsData.id,
        user_id: user.id,
        email: user.email,
        full_name: input.fullName?.trim() || user.user_metadata?.full_name || "Workspace Owner",
        role: "owner",
        job_title: input.role?.trim() || "Founder / Executive",
        status: "active",
      },
      { onConflict: "workspace_id,user_id" }
    );
  } catch (err) {
    console.warn("People upsert note:", err);
  }

  // 6. Provision approved starter departments
  if (input.departments && input.departments.length > 0) {
    for (const dept of input.departments) {
      if (!dept.name?.trim()) continue;
      const deptName = dept.name.trim();
      let deptSlug = deptName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!deptSlug) deptSlug = "department";

      try {
        const { data: createdDept } = await adminClient
          .from("departments")
          .insert({
            workspace_id: wsData.id,
            name: deptName,
            slug: deptSlug,
            description: dept.description?.trim() || null,
            icon: dept.icon || "building",
            color: dept.color || "#10251F",
            created_by: user.id,
          })
          .select("id")
          .single();

        if (createdDept) {
          await adminClient.from("department_members").insert({
            workspace_id: wsData.id,
            department_id: createdDept.id,
            user_id: user.id,
            job_title: input.role?.trim() || "Department Lead",
          });
        }
      } catch (deptErr) {
        console.warn("Department provisioning note:", deptErr);
      }
    }
  }

  // 7. Dispatch team invitations if emails provided
  if (input.inviteEmails && input.inviteEmails.length > 0) {
    try {
      const { inviteEmployeeAction } = await import("@/lib/invitations/actions");
      for (const email of input.inviteEmails) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes("@")) {
          await inviteEmployeeAction({
            workspaceId: wsData.id,
            email: cleanEmail,
            role: "member",
            jobTitle: "Team Member",
          });
        }
      }
    } catch (invErr) {
      console.warn("Invitation dispatch note:", invErr);
    }
  }

  revalidatePath("/app");
  revalidatePath("/onboarding");
  revalidatePath("/app/departments");

  return {
    success: true,
    workspaceId: wsData.id,
    slug: wsData.slug,
  };
}

/**
 * Switch the user's active workspace by storing preference in cookie
 */
export async function switchActiveWorkspaceAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = SwitchWorkspaceSchema.safeParse({ workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid workspace ID." };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set("ropimo_active_workspace", parsed.data.workspaceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to switch workspace.";
    return { success: false, error: msg };
  }
}

/**
 * Update workspace name, slug, and logo/icon with owner/admin role verification
 */
export async function updateWorkspaceSettingsAction(rawParams: {
  workspaceId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  icon?: string | null;
}): Promise<{
  success: boolean;
  workspace?: { id: string; name: string; slug: string; logoUrl?: string | null; icon?: string | null };
  error?: string;
}> {
  const parsed = UpdateWorkspaceSettingsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const params = parsed.data;

  try {
    const { requireWorkspaceRole } = await import("@/lib/auth/require-user");

    // 1. Enforce strict role check: owner or admin only
    await requireWorkspaceRole(params.workspaceId, ["owner", "admin"]);

    const trimmedName = params.name.trim();

    const normalizedSlug = params.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!normalizedSlug || normalizedSlug.length < 3) {
      return { success: false, error: "Workspace slug must be at least 3 characters." };
    }
    if (normalizedSlug.length > 50) {
      return { success: false, error: "Workspace slug cannot exceed 50 characters." };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return {
        success: false,
        error: "Slug may only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).",
      };
    }

    const adminClient = createAdminClient();

    // 2. Check slug uniqueness across workspaces
    const { data: existingWorkspace } = await adminClient
      .from("workspaces")
      .select("id")
      .eq("slug", normalizedSlug)
      .neq("id", params.workspaceId)
      .maybeSingle();

    if (existingWorkspace) {
      return { success: false, error: "This workspace slug is already taken. Please choose another." };
    }

    // 3. Update workspace details
    const updateData: Record<string, unknown> = {
      name: trimmedName,
      slug: normalizedSlug,
      updated_at: new Date().toISOString(),
    };
    if (params.logoUrl !== undefined) {
      updateData.logo_url = params.logoUrl;
    }
    if (params.icon !== undefined) {
      updateData.icon = params.icon;
    }

    const { data: updated, error } = await adminClient
      .from("workspaces")
      .update(updateData)
      .eq("id", params.workspaceId)
      .select("id, name, slug, logo_url, icon")
      .single();

    if (error || !updated) {
      return { success: false, error: error?.message || "Failed to update workspace settings." };
    }

    revalidatePath("/app/settings");
    revalidatePath("/app");

    return {
      success: true,
      workspace: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logo_url,
        icon: updated.icon,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}



