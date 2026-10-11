"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const SaveOnboardingSchema = z.object({
  companyName: z.string().min(2, "Workspace name must be at least 2 characters."),
  teamSize: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  role: z.string().optional().default("owner"),
  emails: z.array(z.string()).optional(),
});

export type SaveOnboardingInput = z.infer<typeof SaveOnboardingSchema>;

export async function saveOnboardingAction(rawInput: SaveOnboardingInput) {
  const parsed = SaveOnboardingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

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
  const fullPayload: Record<string, unknown> = {
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
    const fallbackPayload: Record<string, unknown> = {
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

  const userFullName = (user.user_metadata?.full_name as string) || null;

  // 2. Insert into workspace_members
  const { error: memberError } = await adminClient.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: dbRole,
    full_name: userFullName,
  });

  if (memberError) {
    // Fallback if check constraint rejected custom role or extra column
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
  revalidatePath("/app");

  return { success: true, workspaceId };
}
