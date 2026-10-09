import * as React from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an account | Ropimo",
  description: "Get started with Ropimo in under 30 seconds.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Set up your workspace and bring your team together."
      panelColor="#FFE76A"
      imageSlotLabel="Woman creative in studio, cutout"
      imageSlotPath="/images/person-signup.png"
      chipText="Workspace ready"
      chipSubtitle="Free 14-day trial"
    >
      <React.Suspense
        fallback={
          <div className="h-64 flex items-center justify-center text-xs text-[#888]">
            Loading signup form...
          </div>
        }
      >
        <SignupForm />
      </React.Suspense>
    </AuthShell>
  );
}
