"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LogoIcon } from "@/components/landing/icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { createWorkspaceAction } from "@/lib/workspace/actions";

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;
  const monogram = trimmedName.length > 0 ? trimmedName[0].toUpperCase() : "R";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await createWorkspaceAction(trimmedName, monogram);

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create workspace. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#F4F3EE] text-[#18221E] antialiased selection:bg-[#C7F34A] selection:text-[#10251F]">
      {/* LEFT SIDE: Calm, Minimal Editorial Column */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#D8DDD4] bg-[#E7EADF]/50 px-6 py-8 sm:px-10 sm:py-12 lg:w-5/12 lg:min-h-screen lg:px-14 lg:py-16"
      >
        {/* Top Brand Logo */}
        <div>
          <div className="inline-flex items-center gap-2.5">
            <LogoIcon size={30} />
            <span className="text-xl font-bold tracking-tight text-[#18221E]">
              Ropimo
            </span>
          </div>
        </div>

        {/* Center Editorial Statement */}
        <div className="my-10 lg:my-0 max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl lg:text-5xl leading-[1.12]">
            Create your team&apos;s home.
          </h1>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#65706A]">
            Projects, tasks, files, and the people behind them—all in one place.
          </p>
        </div>

        {/* Bottom Trust Mark */}
        <div className="hidden lg:block text-xs text-[#65706A]">
          <span>Protected workspace environment</span>
        </div>
      </motion.div>

      {/* RIGHT SIDE: Seamless Integrated Workspace Form */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-20 xl:px-28"
      >
        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221E]">
              Name your workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#65706A]">
              Choose a name for the place where your team will work together.
            </p>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-6 rounded-[10px] border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input with live Monogram */}
            <div>
              <label
                htmlFor="workspaceName"
                className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-2"
              >
                Workspace Name
              </label>

              <div className="flex items-center gap-3">
                {/* Auto-generated Monogram */}
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#10251F] text-base font-bold text-[#C7F34A] shadow-2xs transition-transform duration-150"
                >
                  {monogram}
                </div>

                <input
                  id="workspaceName"
                  type="text"
                  required
                  autoFocus
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your workspace name"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors duration-150"
                />
              </div>

              <p className="mt-2 text-xs text-[#65706A]">
                You can change this anytime.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <PrimaryButton
                type="submit"
                size="md"
                disabled={!isValid || loading}
                className="w-full justify-between"
              >
                {loading ? "Creating workspace..." : "Continue"}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
