import * as React from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in — Ropimo",
  description: "Log in to your Ropimo workspace.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Enter your credentials to access your workspace."
      panelColor="#7ED08A"
      imageSlotLabel="Man smiling in office, cutout"
      imageSlotPath="/images/person-login.png"
      chipText="Offer signed"
      chipSubtitle="Just now"
    >
      <React.Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-[#888]">
            Loading login form...
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </AuthShell>
  );
}
