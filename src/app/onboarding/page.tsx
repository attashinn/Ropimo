import * as React from "react";
import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your workspace | Ropimo",
  description: "Complete your workspace setup.",
};

export default function OnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-xs text-[#888]">
          Loading onboarding...
        </div>
      }
    >
      <OnboardingFlow />
    </React.Suspense>
  );
}
