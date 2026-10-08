"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface SaveOnboardingInput {
  companyName: string;
  teamSize: string;
  industry: string;
  role: string;
  emails?: string[];
}

export async function saveOnboardingAction(input: SaveOnboardingInput) {
  // 1. Verify user session securely on server
  const serverClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Authentication session expired. Please log in again." };
  }

  const name = input.companyName.trim();
  if (!name || name.length < 2) {
    return { success: false, error: "Workspace name must be at least 2 characters." };
  }

  const adminClient = createAdminClient();

  // Generate safe unique slug
  const baseSlug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

  // Map role
  let dbRole: "owner" | "admin" | "hr" | "manager" | "member" = "owner";
  if (input.role === "HR") dbRole = "hr";
  else if (input.role === "Manager") dbRole = "manager";
  else if (input.role === "Team member") dbRole = "member";

  // Try insert with team_size & industry
  let workspaceId: string | null = null;
  const fullPayload: Record<string, any> = {
    name,
    slug,
    team_size: input.teamSize,
    industry: input.industry,
    owner_id: user.id,
    created_by: user.id,
  };

  const { data: wsData, error: wsError } = await adminClient
    .from("workspaces")
    .insert(fullPayload)
    .select("id")
    .single();

  if (!wsError && wsData) {
    workspaceId = wsData.id;
  } else if (
    wsError &&
    (wsError.message.includes("industry") ||
      wsError.message.includes("team_size") ||
      wsError.message.includes("owner_id"))
  ) {
    // Fallback if older table schema without industry/team_size columns
    const fallbackPayload: Record<string, any> = {
      name,
      slug,
      created_by: user.id,
    };
    const { data: fbData, error: fbError } = await adminClient
      .from("workspaces")
      .insert(fallbackPayload)
      .select("id")
      .single();

    if (fbError || !fbData) {
      return { success: false, error: fbError?.message || "Failed to create workspace." };
    }
    workspaceId = fbData.id;
  } else {
    return { success: false, error: wsError?.message || "Failed to create workspace." };
  }

  // 2. Insert into workspace_members
  const { error: memberError } = await adminClient.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: dbRole,
  });

  if (memberError) {
    // If check constraint on role rejected 'hr' or 'manager', fallback to 'owner'
    await adminClient.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: "owner",
    });
  }

  // 3. Insert invitations if provided
  const validEmails = (input.emails || [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (validEmails.length > 0) {
    try {
      const invitationRows = validEmails.map((email) => ({
        workspace_id: workspaceId,
        email,
        role: "member",
        invited_by: user.id,
        status: "pending",
      }));
      await adminClient.from("invitations").insert(invitationRows);
    } catch {
      // Non-blocking if invitations table isn't created yet
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { success: true, workspaceId };
}
