"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
  // 1. Verify Authentication using user session cookies
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a workspace." };
  }

  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Workspace name must be at least 2 characters long." };
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
  try {
    const cookieStore = await cookies();
    cookieStore.set("ropimo_active_workspace", workspaceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/app");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to switch workspace." };
  }
}


