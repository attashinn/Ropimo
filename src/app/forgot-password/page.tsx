import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZambicLogo } from "@/components/ui/zambic-logo";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = {
  title: "Forgot password | Zambic",
  description: "Reset your Zambic password.",
};

export default function ForgotPasswordPage() {
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
      <div className="my-auto w-full max-w-sm mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-[36px] font-extrabold tracking-tight leading-[1.15] text-[#111]">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-[#65706A] leading-relaxed">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <React.Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-xs text-[#888]">
              Loading...
            </div>
          }
        >
          <ForgotForm />
        </React.Suspense>
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
