"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/utils";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
  needsEmailVerification?: boolean;
  message?: string;
  redirect?: string;
}

/**
 * Server Action for signing up a new user.
 * Provisions confirmed account directly via Supabase admin service role,
 * preventing email rate limits (HTTP 429 over_email_send_rate_limit)
 * and ensuring instantaneous, frictionless onboarding.
 */
export async function signUpAction({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  try {
    const adminClient = createAdminClient();

    // Check if user already exists
    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error("[signUpAction] listUsers error:", listError);
    }

    const existing = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existing) {
      // If user is already confirmed, prompt them to log in
      if (existing.email_confirmed_at) {
        return {
          success: false,
          alreadyExists: true,
          error: "An account with this email already exists. Please log in instead.",
        };
      }

      // If user was previously unconfirmed (e.g. from an earlier rate-limited signup),
      // update password, confirm email, and update metadata
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existing.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
          },
        }
      );

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Ensure profile row exists
      await adminClient.from("profiles").upsert({
        id: existing.id,
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      });

      return { success: true };
    }

    // Create a brand new confirmed user
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
      },
    });

    if (createError) {
      return { success: false, error: createError.message };
    }

    if (created?.user) {
      await adminClient.from("profiles").upsert({
        id: created.user.id,
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to connect to authentication service. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action to auto-confirm an unconfirmed user account if needed
 * (e.g., healing legacy accounts that got stuck without email confirmation).
 */
export async function autoConfirmUserAction({
  email,
}: {
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const cleanEmail = email.trim().toLowerCase();
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existing = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existing && !existing.email_confirmed_at) {
      await adminClient.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
      });
      return { success: true };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Confirmation failed" };
  }
}

/**
 * Server Action for signing in with email and password.
 */
export async function signInWithPasswordAction({
  email,
  password,
  redirectPath = "/dashboard",
}: {
  email: string;
  password: string;
  redirectPath?: string;
}): Promise<AuthActionResult> {
  const supabase = await createClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, redirect: redirectPath };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to sign in. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action for sending a magic link OTP.
 */
export async function signInWithOtpAction({
  email,
  redirectPath = "/dashboard",
}: {
  email: string;
  redirectPath?: string;
}): Promise<AuthActionResult> {
  const reqHeaders = await headers();
  const origin = getAppUrl(reqHeaders);
  const supabase = await createClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Magic sign-in link sent! Please check your email inbox.",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to send magic link. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
