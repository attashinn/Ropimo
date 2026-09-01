"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoIcon, SparklesIcon } from "@/components/landing/icons";
import { PrimaryButton } from "@/components/ui/primary-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/app";

  const [authMode, setAuthMode] = React.useState<"password" | "magic-link">("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        router.push(redirectPath);
        router.refresh();
      } else {
        // Magic link / passwordless OTP
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        setSuccessMsg("Magic sign-in link sent! Please check your email inbox.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-7 sm:p-8 shadow-2xs">
      {/* Auth Method Switcher */}
      <div className="mb-6 flex rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-1 text-xs font-semibold text-[#65706A]">
        <button
          type="button"
          onClick={() => {
            setAuthMode("password");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 rounded-[8px] py-1.5 transition-all ${
            authMode === "password"
              ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs"
              : "hover:text-[#18221E]"
          }`}
        >
          Password Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode("magic-link");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 rounded-[8px] py-1.5 transition-all ${
            authMode === "magic-link"
              ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs"
              : "hover:text-[#18221E]"
          }`}
        >
          Magic Link
        </button>
      </div>

      {errorMsg && (
        <div className="mb-5 rounded-[8px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {authMode === "password" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#65706A]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-medium text-[#65706A] hover:text-[#18221E]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        )}

        <div className="pt-2">
          <PrimaryButton
            type="submit"
            size="md"
            disabled={loading}
            className="w-full justify-between"
          >
            {loading
              ? "Signing in..."
              : authMode === "password"
              ? "Sign in to workspace"
              : "Send Magic Link"}
          </PrimaryButton>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-[#D8DDD4] text-center text-xs text-[#65706A]">
        Don&apos;t have a workspace account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#18221E] hover:underline"
        >
          Create workspace
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3EE] px-4 py-12 text-[#18221E] antialiased">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded focus:outline-none"
          >
            <LogoIcon size={36} />
            <span className="text-2xl font-bold tracking-tight text-[#18221E]">
              Ropimo
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#18221E]">
            Sign in to your workspace
          </h1>
          <p className="mt-1 text-sm text-[#65706A]">
            Enter your credentials or request a magic link
          </p>
        </div>

        <React.Suspense
          fallback={
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#65706A]">
              Loading sign in form...
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#65706A]">
          <SparklesIcon size={13} className="text-[#10251F]" />
          <span>Protected by Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
}
