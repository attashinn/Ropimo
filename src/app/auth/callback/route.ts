import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/supabase/middleware";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Handle errors passed directly from Supabase auth redirects
  if (error || errorCode) {
    const params = new URLSearchParams();
    if (error) params.set("error", error);
    if (errorCode) params.set("error_code", errorCode);
    if (errorDescription) params.set("error_description", errorDescription);
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/login?error=auth-failed&error_description=${encodeURIComponent(
          exchangeError.message
        )}`
      );
    }

    // If this was a password recovery callback, redirect to reset-password
    if (type === "recovery" || (nextParam && nextParam.includes("reset-password"))) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    // If user was heading to an invitation, preserve their target
    const isInvitationTarget = Boolean(nextParam && nextParam.startsWith("/invite"));

    // Check if the user already has a workspace
    const user = data.user;
    if (user && !isInvitationTarget) {
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }

    const safeTarget = getSafeRedirectPath(nextParam, "/dashboard");
    return NextResponse.redirect(`${origin}${safeTarget}`);
  }

  // Fallback: return the user to login
  return NextResponse.redirect(`${origin}/login`);
}
