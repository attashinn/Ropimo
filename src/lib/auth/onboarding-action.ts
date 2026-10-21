"use server";

import crypto from "crypto";
import React from "react";
import { z } from "zod";
import { createClient } from "@/lib/neon/server";
import { createAdminClient } from "@/lib/neon/admin";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/components";
import { sendEmail } from "@/lib/email/sendEmail";
import { InvitationEmail, generateInvitationPlainText } from "@/lib/email/invitation-template";

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

  // Check if workspace already exists for this owner
  let workspaceId: string | null = null;
  const { data: existingWorkspaces } = await adminClient
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1);

  const existingWs = Array.isArray(existingWorkspaces) ? existingWorkspaces[0] : existingWorkspaces;

  if (existingWs?.id) {
    workspaceId = existingWs.id;
  } else {
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
    } else {
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
    }

    const userFullName = (user.user_metadata?.full_name as string) || null;

    // 2. Insert into workspace_members
    await adminClient.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: dbRole,
      full_name: userFullName,
    });
  }

  const userFullName = (user.user_metadata?.full_name as string) || null;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.zambic.com").replace(/\/$/, "");
  const inviterDisplayName = userFullName || user.email?.split("@")[0] || "A teammate";

  // 3. Process invitations if provided
  const validEmails = (input.emails || [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (validEmails.length > 0 && workspaceId) {
    for (const email of validEmails) {
      try {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await adminClient.from("workspace_invitations").insert({
          workspace_id: workspaceId,
          email,
          role: "member",
          invited_by: user.id,
          status: "pending",
          token,
          token_hash: tokenHash,
          expires_at: expiresAt,
          message: `Welcome to ${name}!`,
        });

        const inviteUrl = `${baseUrl}/invite/${token}`;
        const templateProps = {
          inviterName: inviterDisplayName,
          workspaceName: name,
          roleName: "member",
          departmentNames: [],
          inviteUrl,
          expiresInDays: 7,
          personalMessage: `You've been invited to join ${name} on Zambic.`,
        };

        const emailHtml = await render(React.createElement(InvitationEmail, templateProps));
        const emailText = generateInvitationPlainText(templateProps);

        await sendEmail({
          to: email,
          subject: `${inviterDisplayName} invited you to join ${name} on Zambic`,
          html: emailHtml,
          text: emailText,
          template: "workspace_invitation",
          workspaceId,
          fromName: "Zambic",
        });
      } catch (inviteErr) {
        console.error(`[Onboarding Invitation Error for ${email}]:`, inviteErr);
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/app");

  return { success: true, workspaceId };
}
