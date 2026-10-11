"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function getPasswordStrength(password: string): { label: string; textClass: string } {
  if (!password || password.length === 0) {
    return { label: "", textClass: "text-[#888]" };
  }
  if (password.length < 8) {
    return { label: "Too short (min 8 characters)", textClass: "text-[#888]" };
  }

  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length >= 12 && score >= 3) {
    return { label: "Password strength: Strong", textClass: "text-[#248A3D]" };
  }
  if (score >= 2) {
    return { label: "Password strength: Medium", textClass: "text-[#65706A]" };
  }
  return { label: "Password strength: Weak", textClass: "text-[#888]" };
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const isEmailLocked = searchParams.get("locked") === "true";
  const nextParam = searchParams.get("next");

  const [isLoading, setIsLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: {
      email: emailParam || "",
      agreeToTerms: false,
    },
  });

  React.useEffect(() => {
    if (emailParam) {
      setValue("email", emailParam);
    }
  }, [emailParam, setValue]);

  const passwordValue = watch("password") || "";
  const strengthHint = getPasswordStrength(passwordValue);

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const { signUpAction } = await import("@/lib/auth/actions");
      const result = await signUpAction({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });

      if (!result.success) {
        setAuthError(result.error || "Could not create account. Please check your details and try again.");
        setIsLoading(false);
        return;
      }

      // Establish client session directly
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (signInErr) {
        window.location.href = `/login?email=${encodeURIComponent(
          data.email.trim()
        )}&message=${encodeURIComponent("Account created! Please sign in.")}${
          nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""
        }`;
        return;
      }

      toast.success("Account created successfully!");
      const target = nextParam || "/onboarding";
      window.location.href = target;
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setAuthError("Unable to create account right now. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {authError && (
        <div className="mb-4 rounded-2xl border border-[#F5C2BE] bg-[#FDF2F1] p-3 text-xs text-[#D93025] font-medium">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-[13px] font-semibold text-[#111] mb-1"
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            {...register("fullName")}
            className={`h-11 w-full rounded-2xl border bg-white px-4 text-[14px] text-[#111] placeholder:text-[#999] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              errors.fullName ? "border-[#D93025]" : "border-[#E5E2D6]"
            }`}
          />
          {errors.fullName && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Work Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-semibold text-[#111] mb-1"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="alex@company.com"
            readOnly={isEmailLocked}
            {...register("email")}
            className={`h-11 w-full rounded-2xl border px-4 text-[14px] text-[#111] placeholder:text-[#999] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              isEmailLocked ? "bg-[#FAF9F5] border-[#E5E2D6] cursor-not-allowed text-[#6B6B6B]" : "bg-white"
            } ${
              errors.email ? "border-[#D93025]" : "border-[#E5E2D6]"
            }`}
          />
          {isEmailLocked && (
            <p className="text-[12px] text-[#6B6B6B] mt-1 font-medium flex items-center gap-1">
              <span>🔒</span> Email locked for this invitation
            </p>
          )}
          {errors.email && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-[13px] font-semibold text-[#111] mb-1"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register("password")}
          />
          {strengthHint.label && (
            <p className={`text-[12px] mt-1 font-medium ${strengthHint.textClass}`}>
              {strengthHint.label}
            </p>
          )}
          {errors.password && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[13px] font-semibold text-[#111] mb-1"
          >
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms and Privacy Checkbox */}
        <div className="pt-0.5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("agreeToTerms")}
              className="mt-0.5 h-4 w-4 rounded-md border-[#D8DDD4] text-[#111] focus:ring-[#111] accent-[#111]"
            />
            <span className="text-[13px] text-[#65706A] leading-snug">
              I agree to the{" "}
              <span className="text-[#111] font-semibold underline hover:text-black">Terms</span> and{" "}
              <span className="text-[#111] font-semibold underline hover:text-black">Privacy Policy</span>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.agreeToTerms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 sm:h-12 w-full rounded-full bg-[#111] text-white text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-3.5 flex items-center justify-center">
        <div className="w-full border-t border-[#E5E2D6]" />
        <span className="absolute bg-[#FAF9F6] px-3 text-xs text-[#888] uppercase tracking-wider font-semibold">
          or
        </span>
      </div>

      {/* Google Button */}
      <GoogleButton redirectPath="/onboarding" />

      {/* Link to login */}
      <div className="mt-4 text-center text-[13px] text-[#65706A]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-[#111] underline hover:text-black"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
