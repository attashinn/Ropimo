import "server-only";

/**
 * Server-side Cloudflare Turnstile verification helper.
 * If TURNSTILE_SECRET_KEY is not configured in development, passes through gracefully.
 */
export async function verifyTurnstileToken(
  token?: string | null,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In development without secret key, allow test bypass
  if (!secretKey) {
    return { success: true };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      error: "Cloudflare Turnstile verification token is missing. Please complete the captcha.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (ip) {
      formData.append("remoteip", ip);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      return { success: false, error: "Failed to communicate with Cloudflare Turnstile verification service." };
    }

    const outcome = await res.json();
    if (!outcome.success) {
      return {
        success: false,
        error: "Captcha verification failed. Please verify that you are human and try again.",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Turnstile] Verification error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during captcha verification.",
    };
  }
}
