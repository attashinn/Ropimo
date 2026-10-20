"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ZambicLogo } from "@/components/ui/zambic-logo";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [cooldown, setCooldown] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email || isResending) return;

    setIsResending(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        toast.error("Could not resend email. Please try again later.");
      } else {
        toast.success("Verification email resent!");
        setCooldown(60);
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-[#FAF9F6] p-6 sm:p-10 lg:p-12 text-[#111] antialiased selection:bg-[#111] selection:text-white">
      {/* Top Logo */}
      <div className="w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 transition-transform duration-150 hover:scale-[1.02] focus:outline-none"
        >
          <ZambicLogo size={26} />
        </Link>
      </div>

      {/* Main Container */}
      <div className="my-auto w-full max-w-md mx-auto py-10">
        <div className="rounded-[32px] border border-[#E5E2D6] bg-white p-8 sm:p-10 shadow-xs text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF9F6] border border-[#E5E2D6] text-[#111]">
            <Mail className="h-6 w-6 stroke-[1.8]" />
          </div>

          <h1 className="text-[32px] font-extrabold tracking-tight leading-[1.15] text-[#111]">
            Check your inbox
          </h1>

          <p className="mt-3 text-sm text-[#65706A] leading-relaxed">
            We sent a verification link to{" "}
            {email ? (
              <span className="font-semibold text-[#111]">{email}</span>
            ) : (
              "your email address"
            )}
            . Click the link inside to confirm your account and get started.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending || !email}
              className="h-12 w-full rounded-full bg-[#111] text-white text-sm font-semibold transition-transform duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Sending email...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <span>Resend verification email</span>
              )}
            </button>

            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E5E2D6] bg-white text-sm font-semibold text-[#111] transition-transform duration-150 hover:scale-[1.02] hover:bg-[#F9F8F5] active:scale-[0.99]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to log in</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center">
        <p className="text-xs text-[#8A948E]">
          &copy; {new Date().getFullYear()} Zambic Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-xs text-[#888]">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </React.Suspense>
  );
}
