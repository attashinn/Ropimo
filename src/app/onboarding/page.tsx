"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  Users,
  Briefcase,
  Globe,
  Plus,
  X,
  ShieldCheck,
  ChevronRight,
  AtSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completeSmartOnboardingAction } from "@/lib/workspace/actions";
import { AnalyzedDepartment, CompanyAnalysisResult } from "@/app/api/onboarding/analyze-company/route";
import { cn } from "@/lib/utils";

type Step = "workspace" | "teams";

const ORG_TYPES = [
  { id: "agency", label: "Agency & Studio", desc: "Client services, design, marketing" },
  { id: "startup", label: "Tech & SaaS", desc: "Software, product, engineering" },
  { id: "corporate", label: "Company", desc: "Corporate operations, business teams" },
  { id: "solo", label: "Solo & Studio", desc: "Independent consultant or practice" },
];

const ROLE_PRESETS = [
  "Founder / CEO",
  "Partner / Director",
  "Head of Operations",
  "Creative Director",
  "Engineering Lead",
  "Product Manager",
  "Other",
];

const DEFAULT_DEPARTMENTS: AnalyzedDepartment[] = [
  { id: "d-1", name: "Management & Strategy", description: "Executive leadership, roadmaps, and strategic initiatives", color: "#10251F", icon: "Briefcase", enabled: true },
  { id: "d-2", name: "Client Operations", description: "Project delivery, resource planning, and account ops", color: "#1B4D3E", icon: "FolderKanban", enabled: true },
  { id: "d-3", name: "Design & Creative", description: "Brand design, product interfaces, and creative deliverables", color: "#6366F1", icon: "Palette", enabled: true },
  { id: "d-4", name: "Engineering & Tech", description: "Technical implementation, infrastructure, and QA", color: "#0EA5E9", icon: "Code", enabled: true },
  { id: "d-5", name: "Growth & Marketing", description: "Acquisition, content, brand narrative, and partnerships", color: "#F59E0B", icon: "TrendingUp", enabled: true },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard Stage
  const [step, setStep] = React.useState<Step>("workspace");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Stage 1 Fields
  const [fullName, setFullName] = React.useState("");
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [workspaceSlug, setWorkspaceSlug] = React.useState("");
  const [orgType, setOrgType] = React.useState("agency");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [isScanningWebsite, setIsScanningWebsite] = React.useState(false);
  const [scanCompleted, setScanCompleted] = React.useState(false);

  // Extracted Intelligence
  const [companyData, setCompanyData] = React.useState<CompanyAnalysisResult | null>(null);

  // Stage 2 Fields
  const [departments, setDepartments] = React.useState<AnalyzedDepartment[]>(DEFAULT_DEPARTMENTS);
  const [newDeptInput, setNewDeptInput] = React.useState("");
  const [isAddingCustomDept, setIsAddingCustomDept] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState(ROLE_PRESETS[0]);
  const [inviteInput, setInviteInput] = React.useState("");
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([]);

  // Load user data on mount
  React.useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const metaName = data.user.user_metadata?.full_name;
        if (metaName && !fullName) {
          setFullName(metaName);
          const defaultWs = `${metaName.split(" ")[0]}'s Workspace`;
          setWorkspaceName(defaultWs);
          setWorkspaceSlug(slugify(defaultWs));
        } else if (!fullName && data.user.email) {
          const userPrefix = data.user.email.split("@")[0];
          const formatted = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
          setFullName(formatted);
          const defaultWs = `${formatted}'s Workspace`;
          setWorkspaceName(defaultWs);
          setWorkspaceSlug(slugify(defaultWs));
        }
      }
    }
    loadUser();
  }, [supabase]);

  // Sync slug with workspace name
  const handleWorkspaceNameChange = (val: string) => {
    setWorkspaceName(val);
    setWorkspaceSlug(slugify(val));
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 32);

  // Intelligent Website Scan
  const handleScanWebsite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsScanningWebsite(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/onboarding/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const result: CompanyAnalysisResult = json.data;
        setCompanyData(result);
        if (result.companyName) {
          setWorkspaceName(result.companyName);
          setWorkspaceSlug(slugify(result.companyName));
        }
        if (result.departments && result.departments.length > 0) {
          setDepartments(result.departments);
        }
        setScanCompleted(true);
      } else {
        setScanCompleted(true);
      }
    } catch {
      setScanCompleted(true);
    } finally {
      setIsScanningWebsite(false);
    }
  };

  // Toggle department inclusion
  const toggleDepartment = (id: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
  };

  // Add custom department
  const handleAddDept = () => {
    if (!newDeptInput.trim()) return;
    const newDept: AnalyzedDepartment = {
      id: `custom-${Date.now()}`,
      name: newDeptInput.trim(),
      description: "Custom organizational space",
      color: "#10251F",
      icon: "FolderKanban",
      enabled: true,
    };
    setDepartments((prev) => [...prev, newDept]);
    setNewDeptInput("");
    setIsAddingCustomDept(false);
  };

  // Handle invite emails
  const handleAddInvite = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && "preventDefault" in e) e.preventDefault();
    const clean = inviteInput.trim().toLowerCase().replace(/,/g, "");
    if (clean && clean.includes("@") && !inviteEmails.includes(clean)) {
      setInviteEmails((prev) => [...prev, clean]);
      setInviteInput("");
    }
  };

  const removeInvite = (email: string) => {
    setInviteEmails((prev) => prev.filter((em) => em !== email));
  };

  // Submit complete onboarding
  const handleCompleteSetup = async () => {
    if (!workspaceName.trim()) {
      setErrorMessage("Please provide a workspace name.");
      setStep("workspace");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const activeDepts = departments
      .filter((d) => d.enabled)
      .map((d) => ({
        name: d.name,
        description: d.description,
        color: d.color,
        icon: d.icon,
      }));

    try {
      const res = await completeSmartOnboardingAction({
        fullName: fullName.trim() || "Workspace Owner",
        organizationType: orgType,
        workspaceName: workspaceName.trim(),
        monogram: (workspaceName.trim()[0] || "W").toUpperCase(),
        companyWebsite: websiteUrl.trim() || undefined,
        companySummary: companyData?.summary || undefined,
        role: selectedRole,
        departments: activeDepts,
        inviteEmails,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to initialize workspace.");
        setIsSubmitting(false);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  const monogram = (workspaceName.trim()[0] || fullName.trim()[0] || "R").toUpperCase();
  const enabledDepts = departments.filter((d) => d.enabled);

  return (
    <div className="flex min-h-screen bg-white text-[#18221E] selection:bg-[#10251F] selection:text-white">
      {/* ── LEFT BLUEPRINT & LIVE SYSTEM PANEL (42% width) ── */}
      <div className="hidden lg:flex w-[42%] flex-col justify-between border-r border-[#D8DDD4] bg-[#FAF9F5] p-10 xl:p-14 relative">
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/ropimo-logo.png"
              alt="Ropimo"
              width={108}
              height={26}
              className="h-6 w-auto object-contain"
              priority
            />
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#E7EADF] text-[#10251F] border border-[#D8DDD4]">
              Workspace Setup
            </span>
          </div>
        </div>

        {/* LIVE WORKSPACE BLUEPRINT (Real-time Mirror) */}
        <div className="my-auto py-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#738079] font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10251F]" />
              Live Workspace Blueprint
            </span>
            <span className="text-[11px] font-mono text-[#738079]">
              ropimo.com/{workspaceSlug || "studio"}
            </span>
          </div>

          {/* Blueprint Card */}
          <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-6 space-y-6">
            {/* Header: Monogram + Workspace identity */}
            <div className="flex items-start justify-between pb-5 border-b border-[#E7EADF]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#10251F] text-white font-bold text-sm">
                  {monogram}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18221E] tracking-tight">
                    {workspaceName || "New Workspace"}
                  </h3>
                  <p className="text-[11px] text-[#65706A] flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-[#18221E]">
                      {fullName || "Workspace Owner"}
                    </span>
                    <span>·</span>
                    <span>{ORG_TYPES.find((o) => o.id === orgType)?.label || "Studio"}</span>
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#E7EADF] text-[#10251F] border border-[#D8DDD4]">
                <Check size={11} /> Active Plan
              </span>
            </div>

            {/* Smart Website Overview (if analyzed) */}
            {companyData?.summary && (
              <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-3 text-[11px] leading-relaxed text-[#55635D]">
                <p className="font-semibold text-[#18221E] text-[10px] uppercase tracking-wider mb-1 font-mono">
                  Extracted Profile
                </p>
                <p className="line-clamp-2">{companyData.summary}</p>
                {companyData.services && companyData.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {companyData.services.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#E7EADF] text-[#18221E]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Configured Departments List */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#738079] mb-2.5">
                <span>Configured Team Spaces</span>
                <span className="font-semibold text-[#18221E]">{enabledDepts.length} active</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {enabledDepts.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3 py-2 rounded-[6px] bg-[#FAF9F5] border border-[#E7EADF] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color || "#10251F" }} />
                      <span className="font-medium text-[#18221E]">{d.name}</span>
                    </div>
                    <span className="text-[10px] text-[#738079] font-mono">Lead: You</span>
                  </div>
                ))}
                {enabledDepts.length > 4 && (
                  <p className="text-[10px] text-[#738079] text-center pt-1 font-mono">
                    + {enabledDepts.length - 4} additional spaces
                  </p>
                )}
              </div>
            </div>

            {/* Team Members Invite Preview */}
            <div className="pt-4 border-t border-[#E7EADF] flex items-center justify-between text-xs text-[#65706A]">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#10251F]" />
                <span className="text-[11px]">
                  {inviteEmails.length === 0
                    ? "Solo workspace (invite teammates anytime)"
                    : `${inviteEmails.length} teammate${inviteEmails.length === 1 ? "" : "s"} queued`}
                </span>
              </div>
              <span className="text-[10px] font-mono font-medium text-[#18221E]">
                Owner: {selectedRole}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Indicators */}
        <div className="flex items-center justify-between text-[11px] text-[#738079] pt-6 border-t border-[#D8DDD4]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#10251F]" />
            <span>End-to-end encrypted workspace</span>
          </div>
          <span className="font-mono text-[10px]">v2.4 Production Engine</span>
        </div>
      </div>

      {/* ── RIGHT WORKBENCH CONSOLE (58% width) ── */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 overflow-y-auto">
        {/* Top Header & Stage Indicator */}
        <div className="flex items-center justify-between pb-8 border-b border-[#D8DDD4]">
          <div className="flex items-center gap-2 text-xs">
            <span
              onClick={() => setStep("workspace")}
              className={cn(
                "font-mono px-2.5 py-1 rounded-[6px] cursor-pointer transition-colors",
                step === "workspace"
                  ? "bg-[#10251F] text-white font-semibold"
                  : "bg-[#FAF9F5] text-[#738079] hover:text-[#18221E]"
              )}
            >
              01 Workspace
            </span>
            <ChevronRight size={13} className="text-[#A2ADA7]" />
            <span
              onClick={() => {
                if (workspaceName.trim()) setStep("teams");
              }}
              className={cn(
                "font-mono px-2.5 py-1 rounded-[6px] transition-colors",
                step === "teams"
                  ? "bg-[#10251F] text-white font-semibold cursor-pointer"
                  : "bg-[#FAF9F5] text-[#738079]"
              )}
            >
              02 Team & Structure
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="text-xs font-medium text-[#738079] hover:text-[#18221E] transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Console Workspace Center */}
        <div className="my-auto py-8 max-w-xl w-full mx-auto">
          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-center justify-between rounded-[8px] border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="p-1 hover:text-red-950">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════════════════════
                STAGE 1: WORKSPACE & COMPANY IDENTIFIER
               ══════════════════════════════════════════════════════ */}
            {step === "workspace" && (
              <motion.div
                key="stage-workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
                    Create your workspace
                  </h1>
                  <p className="mt-1.5 text-sm text-[#65706A]">
                    Establish your organization identity. We&apos;ll configure your database, permissions, and team spaces.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Name & Workspace Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Tashin Khan"
                        className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-sm text-[#18221E] placeholder:text-[#9AA59F] focus:border-[#10251F] focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={workspaceName}
                        onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                        placeholder="e.g. Acme Studio"
                        className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-sm text-[#18221E] placeholder:text-[#9AA59F] focus:border-[#10251F] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Workspace URL Slug Preview */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                      Workspace URL
                    </label>
                    <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-sm text-[#65706A]">
                      <span className="text-[#88958E] select-none">ropimo.com/</span>
                      <input
                        type="text"
                        value={workspaceSlug}
                        onChange={(e) => setWorkspaceSlug(slugify(e.target.value))}
                        className="ml-1 flex-1 bg-transparent font-medium text-[#18221E] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Organization Discipline Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                      Organization Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ORG_TYPES.map((org) => {
                        const isSelected = orgType === org.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => setOrgType(org.id)}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-[8px] border text-left transition-colors",
                              isSelected
                                ? "border-[#10251F] bg-[#10251F] text-white"
                                : "border-[#D8DDD4] bg-white text-[#18221E] hover:border-[#B5BDB1] hover:bg-[#FAF9F5]"
                            )}
                          >
                            <span className="text-xs font-semibold leading-tight">{org.label}</span>
                            <span
                              className={cn(
                                "text-[10px] mt-1 leading-snug line-clamp-1",
                                isSelected ? "text-white/70" : "text-[#738079]"
                              )}
                            >
                              {org.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Company Importer */}
                  <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={15} className="text-[#10251F]" />
                        <span className="text-xs font-semibold text-[#18221E]">
                          Auto-detect company & team structure
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-[#738079]">
                        Optional
                      </span>
                    </div>

                    <p className="text-xs text-[#65706A] leading-relaxed">
                      Enter your website to automatically identify your services, derive company summary, and configure tailored department spaces.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="e.g. brnnd.com or company.com"
                        className="flex-1 rounded-[6px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] placeholder:text-[#9AA59F] focus:border-[#10251F] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleScanWebsite()}
                        disabled={!websiteUrl.trim() || isScanningWebsite}
                        className="inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-[#10251F] px-4 py-2 text-xs font-medium text-white hover:bg-[#18342C] disabled:opacity-50 transition-colors shrink-0"
                      >
                        {isScanningWebsite ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-white" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <>
                            <Globe size={13} className="text-white" />
                            <span>Scan Company</span>
                          </>
                        )}
                      </button>
                    </div>

                    {scanCompleted && companyData && (
                      <div className="pt-2 border-t border-[#D8DDD4] text-xs text-[#246244] flex items-center gap-1.5">
                        <Check size={14} />
                        <span className="font-medium">
                          Identified {companyData.companyName || "company"} ({companyData.departments?.length || 4} recommended departments ready).
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action */}
                <div className="pt-2 flex items-center justify-between border-t border-[#D8DDD4]">
                  <div className="text-[11px] text-[#738079] flex items-center gap-1 font-mono">
                    <span>Press</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#FAF9F5] text-[#18221E] font-mono text-[10px] border border-[#D8DDD4]">
                      Enter ↵
                    </kbd>
                    <span>to continue</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!workspaceName.trim()) {
                        setErrorMessage("Please enter a workspace name.");
                        return;
                      }
                      setErrorMessage(null);
                      setStep("teams");
                    }}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-[#10251F] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#18342C] transition-colors"
                  >
                    <span>Next: Configure Teams</span>
                    <ArrowRight size={14} className="text-white" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════
                STAGE 2: TEAMS, DEPARTMENTS & TEAMMATES
               ══════════════════════════════════════════════════════ */}
            {step === "teams" && (
              <motion.div
                key="stage-teams"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
                    Structure your organization
                  </h1>
                  <p className="mt-1.5 text-sm text-[#65706A]">
                    Select the operational spaces your team needs. You can edit, add, or customize these anytime.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Departments Multi-Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                        Team Departments ({enabledDepts.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomDept(!isAddingCustomDept)}
                        className="text-xs font-semibold text-[#18221E] hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Add custom space</span>
                      </button>
                    </div>

                    {isAddingCustomDept && (
                      <div className="flex gap-2 p-3 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4]">
                        <input
                          type="text"
                          autoFocus
                          value={newDeptInput}
                          onChange={(e) => setNewDeptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddDept();
                          }}
                          placeholder="e.g. Legal & Compliance"
                          className="flex-1 rounded-[6px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddDept}
                          className="rounded-[6px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#18342C]"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {departments.map((d) => {
                        const isEnabled = d.enabled;
                        return (
                          <div
                            key={d.id}
                            onClick={() => toggleDepartment(d.id)}
                            className={cn(
                              "flex items-start justify-between p-3.5 rounded-[8px] border text-left cursor-pointer transition-colors select-none",
                              isEnabled
                                ? "border-[#10251F] bg-white"
                                : "border-[#D8DDD4] bg-[#FAF9F5] opacity-60 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-start gap-2.5 pr-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full mt-1 shrink-0"
                                style={{ backgroundColor: d.color || "#10251F" }}
                              />
                              <div>
                                <p className="text-xs font-semibold text-[#18221E]">{d.name}</p>
                                <p className="text-[10px] text-[#65706A] mt-0.5 line-clamp-1 leading-snug">
                                  {d.description}
                                </p>
                              </div>
                            </div>

                            <div
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                                isEnabled
                                  ? "border-[#10251F] bg-[#10251F] text-white"
                                  : "border-[#D8DDD4] bg-white"
                              )}
                            >
                              {isEnabled && <Check size={11} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Your Executive Role in the Workspace */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                      Your Primary Role
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ROLE_PRESETS.slice(0, 4).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className={cn(
                            "py-2 px-2.5 rounded-[6px] border text-xs font-medium transition-colors",
                            selectedRole === role
                              ? "border-[#10251F] bg-[#10251F] text-white"
                              : "border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                          )}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Teammates Invitation Input */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#65706A] font-semibold">
                      Invite Teammates (Optional)
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#88958E]" />
                        <input
                          type="email"
                          value={inviteInput}
                          onChange={(e) => setInviteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddInvite();
                            }
                          }}
                          placeholder="colleague@company.com (press Enter to add)"
                          className="w-full rounded-[6px] border border-[#D8DDD4] bg-white pl-9 pr-3 py-2 text-xs text-[#18221E] placeholder:text-[#9AA59F] focus:border-[#10251F] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddInvite()}
                        className="rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] hover:bg-[#E7EADF] px-3.5 py-2 text-xs font-medium text-[#18221E] transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {/* Email Pills List */}
                    {inviteEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {inviteEmails.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAF9F5] border border-[#D8DDD4] text-xs font-medium text-[#18221E]"
                          >
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeInvite(email)}
                              className="text-[#88958E] hover:text-red-600 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Bar */}
                <div className="pt-4 flex items-center justify-between border-t border-[#D8DDD4]">
                  <button
                    type="button"
                    onClick={() => setStep("workspace")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#65706A] hover:text-[#18221E] transition-colors py-2"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCompleteSetup}
                    className="inline-flex items-center gap-2.5 rounded-[8px] bg-[#10251F] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#18342C] disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>Provisioning Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch Workspace</span>
                        <ArrowRight size={14} className="text-white" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Console Footer */}
        <div className="flex items-center justify-between text-[11px] text-[#88958E] pt-6 border-t border-[#D8DDD4]">
          <span>Ropimo Executive Workspace Engine</span>
          <div className="flex items-center gap-4">
            <span>Documentation</span>
            <span>Security</span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
