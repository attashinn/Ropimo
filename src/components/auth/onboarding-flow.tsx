"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { LogoIcon } from "@/components/landing/icons";
import Link from "next/link";
import { saveOnboardingAction } from "@/lib/auth/onboarding-action";

const INDUSTRIES = [
  "Software & Technology",
  "Design & Creative Studio",
  "Marketing & Advertising",
  "Professional Services & Consulting",
  "Financial & Banking",
  "Healthcare & Life Sciences",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Education",
  "Other",
];

const TEAM_SIZES = ["1-10", "11-50", "51-200", "200+"] as const;

const ROLES = [
  { id: "Owner", title: "Owner", desc: "Founder, executive, or lead administrator" },
  { id: "HR", title: "HR", desc: "People operations, talent, and culture" },
  { id: "Manager", title: "Manager", desc: "Team lead or project supervisor" },
  { id: "Team member", title: "Team member", desc: "Individual contributor" },
] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = React.useState("");
  const [teamSize, setTeamSize] = React.useState<(typeof TEAM_SIZES)[number]>("1-10");
  const [industry, setIndustry] = React.useState(INDUSTRIES[0]);
  const [role, setRole] = React.useState<(typeof ROLES)[number]["id"]>("Owner");
  const [emails, setEmails] = React.useState<string[]>(["", "", "", "", ""]);

  // Field validation errors
  const [companyNameError, setCompanyNameError] = React.useState<string | null>(null);

  const handleEmailChange = (index: number, val: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const validateStep1 = () => {
    if (!companyName.trim()) {
      setCompanyNameError("Please enter your company or workspace name");
      return false;
    }
    if (companyName.trim().length < 2) {
      setCompanyNameError("Company name must be at least 2 characters");
      return false;
    }
    setCompanyNameError(null);
    return true;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleSaveAndFinish = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await saveOnboardingAction({
        companyName: companyName.trim(),
        teamSize,
        industry,
        role,
        emails,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Could not create workspace. Please try again.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Workspace ready!");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Failed to finish onboarding. Please try again.");
      setErrorMessage("An unexpected error occurred while setting up your workspace.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#FAF9F6] p-4 sm:p-8 antialiased selection:bg-[#111] selection:text-white font-[family-name:var(--font-plus-jakarta)]">
      {/* Top Logo */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 transition-transform duration-150 hover:scale-[1.02] focus:outline-none"
        >
          <LogoIcon size={32} />
          <span className="text-xl font-extrabold tracking-tight text-[#111]">
            Ropimo
          </span>
        </Link>
      </div>

      {/* Main Single Centered Card */}
      <div className="w-full max-w-lg rounded-[32px] border border-[#E5E2D6] bg-white p-7 sm:p-10 shadow-xs">
        {/* Step Progress Pill Indicator */}
        <div className="mb-8 flex items-center justify-between border-b border-[#F0EFEA] pb-5">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  currentStep === stepNum
                    ? "bg-[#111] text-white"
                    : currentStep > stepNum
                    ? "bg-[#EAE8DD] text-[#111]"
                    : "bg-[#F5F4EE] text-[#888]"
                }`}
              >
                {currentStep > stepNum ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : stepNum}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-[#738079]">
            Step {currentStep} of 3
          </span>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-[#F5C2BE] bg-[#FDF2F1] p-3.5 text-xs text-[#D93025] font-medium">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: CREATE WORKSPACE */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#111]">
                Create your workspace
              </h2>
              <p className="mt-1.5 text-sm text-[#65706A]">
                Tell us about your organization to set up your team space.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-[13px] font-semibold text-[#111] mb-1.5"
                >
                  Company or team name
                </label>
                <input
                  id="companyName"
                  type="text"
                  autoFocus
                  placeholder="Acme Studio"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (companyNameError) setCompanyNameError(null);
                  }}
                  className={`h-11 sm:h-12 w-full rounded-2xl border bg-white px-4 text-[14px] text-[#111] placeholder:text-[#999] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                    companyNameError ? "border-[#D93025]" : "border-[#E5E2D6]"
                  }`}
                />
                {companyNameError && (
                  <p className="text-[13px] text-[#D93025] mt-1.5 font-medium">
                    {companyNameError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#111] mb-2">
                  Team size
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTeamSize(size)}
                      className={`h-11 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        teamSize === size
                          ? "border-[#111] bg-[#111] text-white"
                          : "border-[#E5E2D6] bg-white text-[#111] hover:bg-[#F9F8F5]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="industry"
                  className="block text-[13px] font-semibold text-[#111] mb-1.5"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-11 sm:h-12 w-full rounded-2xl border border-[#E5E2D6] bg-white px-4 text-[14px] text-[#111] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="h-11 sm:h-12 w-full rounded-full bg-[#111] text-white text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: YOUR ROLE */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#111]">
                What is your role?
              </h2>
              <p className="mt-1.5 text-sm text-[#65706A]">
                This helps customize your default workspace permissions and views.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {ROLES.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-[#111] bg-[#FAF9F6]"
                        : "border-[#E5E2D6] bg-white hover:bg-[#FDFDFD]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-[#111]">{r.title}</p>
                      <p className="text-xs text-[#65706A] mt-0.5">{r.desc}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? "border-[#111] bg-[#111] text-white"
                          : "border-[#D0CDBF] bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-12 px-5 rounded-full border border-[#E5E2D6] bg-white text-sm font-semibold text-[#111] transition-transform duration-150 hover:scale-[1.02] hover:bg-[#F9F8F5] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                className="h-12 flex-1 rounded-full bg-[#111] text-white text-sm font-semibold transition-transform duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INVITE TEAMMATES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#111]">
                  Invite teammates
                </h2>
                <span className="text-xs font-semibold text-[#738079] uppercase tracking-wider">
                  Skippable
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[#65706A]">
                Add up to 5 teammates now, or invite them later from your workspace settings.
              </p>
            </div>

            <div className="space-y-2.5">
              {emails.map((val, idx) => (
                <div key={idx}>
                  <input
                    type="email"
                    placeholder={`teammate${idx + 1}@company.com`}
                    value={val}
                    onChange={(e) => handleEmailChange(idx, e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#E5E2D6] bg-white px-4 text-sm text-[#111] placeholder:text-[#888] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={isSubmitting}
                className="h-12 w-full sm:w-auto px-5 rounded-full border border-[#E5E2D6] bg-white text-sm font-semibold text-[#111] transition-transform duration-150 hover:scale-[1.02] hover:bg-[#F9F8F5] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveAndFinish}
                className="h-12 flex-1 w-full rounded-full bg-[#111] text-white text-sm font-semibold transition-transform duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Setting up workspace...</span>
                  </>
                ) : (
                  <span>
                    {emails.some((e) => e.trim().length > 0)
                      ? "Invite & finish setup"
                      : "Skip & finish setup"}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
