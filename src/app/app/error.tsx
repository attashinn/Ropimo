"use client";

import * as React from "react";
import { PrimaryButton } from "@/components/ui/primary-button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Workspace Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center text-[#18221E]">
      <div className="max-w-md space-y-4 rounded-[16px] border border-[#D8DDD4] bg-white p-8 shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-[#65706A]">
            {error.message || "An unexpected error occurred while loading this workspace view."}
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-4 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
          >
            Reload Page
          </button>
          <PrimaryButton size="sm" onClick={() => reset()}>
            Try Again
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
