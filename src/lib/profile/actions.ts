"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProfileActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

const UpdateProfileNameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
});

const UpdateProfileAvatarSchema = z.object({
  avatarUrl: z.string().trim().min(1, "Avatar URL is required."),
});

const ChangePasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters long."),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.newPassword === data.confirmPassword,
    {
      message: "New password and confirmation do not match.",
      path: ["confirmPassword"],
    }
  );

/**
 * Update user's display name across profiles and auth metadata
 */
export async function updateProfileNameAction(params: {
  fullName: string;
}): Promise<ProfileActionResult> {
  const parsed = UpdateProfileNameSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const user = await requireUser();
    const trimmedName = parsed.data.fullName;

    const adminClient = createAdminClient();

    // 1. Update public.profiles
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name: trimmedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { success: false, error: profileError.message || "Failed to update profile." };
    }

    // 2. Update auth.users metadata
    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: trimmedName,
        },
      });
    } catch (authErr) {
      console.warn("Auth metadata update note:", authErr);
    }

    // 3. Update public.workspace_members full_name for consistency
    try {
      await adminClient
        .from("workspace_members")
        .update({ full_name: trimmedName })
        .eq("user_id", user.id);
    } catch {}

    revalidatePath("/app/profile");
    revalidatePath("/app");

    return { success: true, data: { fullName: trimmedName } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile name.";
    return { success: false, error: msg };
  }
}

/**
 * Update user's avatar URL across profiles and auth metadata
 */
export async function updateProfileAvatarAction(params: {
  avatarUrl: string;
}): Promise<ProfileActionResult> {
  const parsed = UpdateProfileAvatarSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const user = await requireUser();
    const avatarUrl = parsed.data.avatarUrl;

    const adminClient = createAdminClient();

    // 1. Update public.profiles
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { success: false, error: profileError.message || "Failed to update avatar in profile." };
    }

    // 2. Update auth metadata
    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          avatar_url: avatarUrl,
        },
      });
    } catch {}

    revalidatePath("/app/profile");
    revalidatePath("/app");

    return { success: true, data: { avatarUrl } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update avatar.";
    return { success: false, error: msg };
  }
}

/**
 * Change the authenticated user's account password
 */
export async function changePasswordAction(params: {
  newPassword: string;
  confirmPassword?: string;
}): Promise<ProfileActionResult> {
  const parsed = ChangePasswordSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    await requireUser();

    const { newPassword } = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message || "Failed to change password." };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change password.";
    return { success: false, error: msg };
  }
}
