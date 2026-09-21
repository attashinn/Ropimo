"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

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
 * Avoids browser cross-origin, ad-blocker, and third-party cookie issues ("Failed to fetch").
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
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const supabase = await createClient();

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If the user already exists in Supabase Auth, identities is returned as empty array
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: false,
        alreadyExists: true,
        error: "An account with this email already exists. Please sign in instead.",
      };
    }

    if (data.session) {
      return { success: true, redirect: "/app" };
    }

    return {
      success: true,
      needsEmailVerification: true,
      message: "Account created! Please check your email inbox to verify your account.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to authentication service. Please check your internet connection.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action for signing in with email and password.
 */
export async function signInWithPasswordAction({
  email,
  password,
  redirectPath = "/app",
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
    const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
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
  redirectPath = "/app",
}: {
  email: string;
  redirectPath?: string;
}): Promise<AuthActionResult> {
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
    const message = err instanceof Error ? err.message : "Failed to send magic link. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}
