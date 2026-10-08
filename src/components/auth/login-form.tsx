"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSafeRedirectPath } from "@/lib/supabase/middleware";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const targetRedirect = getSafeRedirectPath(nextParam, "/dashboard");
  const urlMessage = searchParams.get("message");

  const [isLoading, setIsLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("invalid login credentials") ||
          msg.includes("invalid credentials") ||
          msg.includes("email not confirmed")
        ) {
          if (msg.includes("email not confirmed")) {
            setAuthError("Please verify your email before logging in.");
          } else {
            setAuthError("That email or password doesn't match");
          }
        } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
          setAuthError("Too many attempts. Please wait a moment and try again.");
        } else {
          setAuthError("That email or password doesn't match");
        }
        setIsLoading(false);
        return;
      }

      // Check if user has an existing workspace
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: memberships } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", userData.user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          window.location.href = "/onboarding";
          return;
        }
      }

      window.location.href = targetRedirect;
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setAuthError("Unable to log in at this moment. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {urlMessage && (
        <div className="mb-4 rounded-2xl border border-[#C5E4C8] bg-[#F2FAF3] p-3 text-xs text-[#206A32]">
          {urlMessage}
        </div>
      )}

      {authError && (
        <div className="mb-4 rounded-2xl border border-[#F5C2BE] bg-[#FDF2F1] p-3 text-xs text-[#D93025] font-medium">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-semibold text-[#111] mb-1.5"
          >
            Email
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

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold text-[#111]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#65706A] hover:text-[#111] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 sm:h-12 w-full rounded-full bg-[#111] text-white text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Log in</span>
            )}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-[#E5E2D6]" />
        <span className="absolute bg-[#FAF9F6] px-3 text-xs text-[#888] uppercase tracking-wider font-semibold">
          or
        </span>
      </div>

      {/* Google Button */}
      <GoogleButton redirectPath={targetRedirect} />

      {/* Link to sign up */}
      <div className="mt-6 text-center text-[13px] text-[#65706A]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-[#111] underline hover:text-black"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
