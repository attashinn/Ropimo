"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function ForgotForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      await supabase.auth.resetPasswordForEmail(data.email.trim().toLowerCase(), {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      // Always show success to prevent email enumeration
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-[#C5E4C8] bg-[#F2FAF3] p-5 text-sm text-[#206A32]">
          <p className="font-semibold text-[#185327] mb-1">Check your inbox</p>
          <p className="text-xs leading-relaxed text-[#206A32]">
            If an account exists for <span className="font-semibold">{submittedEmail}</span>,
            we have sent instructions to reset your password. Please check your spam folder if it doesn&apos;t arrive in a couple of minutes.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E5E2D6] bg-white text-sm font-semibold text-[#111] transition-transform duration-150 hover:scale-[1.02] hover:bg-[#F9F8F5] active:scale-[0.99]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-semibold text-[#111] mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            {...register("email")}
            className={`h-11 sm:h-12 w-full rounded-2xl border bg-white px-4 text-[14px] text-[#111] placeholder:text-[#999] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              errors.email ? "border-[#D93025]" : "border-[#E5E2D6]"
            }`}
          />
          {errors.email && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 sm:h-12 w-full rounded-full bg-[#111] text-white text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Sending link...</span>
              </>
            ) : (
              <span>Send reset link</span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-[13px] text-[#65706A]">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-bold text-[#111] underline hover:text-black"
        >
          Back to log in
        </Link>
      </div>
    </div>
  );
}
