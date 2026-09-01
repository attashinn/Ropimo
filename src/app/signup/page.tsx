"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoIcon, SparklesIcon } from "@/components/landing/icons";
import { PrimaryButton } from "@/components/ui/primary-button";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/app");
        router.refresh();
      } else {
        setSuccessMsg(
          "Account created! Please check your email inbox to verify your account."
        );
        setLoading(false);
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

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
            Create your workspace
          </h1>
          <p className="mt-1 text-sm text-[#65706A]">
            Get started with Ropimo in under 30 seconds
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-7 sm:p-8 shadow-2xs">
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

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
              >
                Work Email Address
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

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
              >
                Create Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
              <PrimaryButton
                type="submit"
                size="md"
                disabled={loading}
                className="w-full justify-between"
              >
                {loading ? "Creating..." : "Create free workspace"}
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#D8DDD4] text-center text-xs text-[#65706A]">
            Already have a workspace?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#18221E] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#65706A]">
          <SparklesIcon size={13} className="text-[#10251F]" />
          <span>Protected by Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
}
