"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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
