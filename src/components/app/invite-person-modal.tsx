"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  WorkspaceRole,
  EmploymentType,
  EmploymentStatus,
  WorkspacePerson,
} from "@/types/people";
import { Department } from "@/types/department";
import { invitePersonAction } from "@/lib/people/actions";
import { AppIcon } from "@/components/ui/app-icon";
import { DatePicker } from "@/components/ui/date-picker";

export interface InvitePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  departments?: Department[];
  people?: WorkspacePerson[];
  onSuccess?: () => void;
}

const EMPLOYMENT_TYPES: { label: string; value: EmploymentType; dot: string }[] = [
  { label: "Full-time", value: "Full-time", dot: "bg-emerald-500" },
  { label: "Part-time", value: "Part-time", dot: "bg-blue-500" },
  { label: "Contractor", value: "Contractor", dot: "bg-amber-500" },
  { label: "Intern", value: "Intern", dot: "bg-purple-500" },
];

const WORKSPACE_ROLES: { label: string; value: WorkspaceRole; desc: string; badge: string }[] = [
  { label: "Member", value: "member", desc: "Access to assigned work and department tasks", badge: "bg-slate-100 text-slate-700" },
  { label: "Manager", value: "manager", desc: "Manage projects, tasks, attendance, and team", badge: "bg-blue-50 text-blue-700" },
  { label: "Admin", value: "admin", desc: "Full administrative access and billing settings", badge: "bg-amber-50 text-amber-800" },
];

function CustomDropdown({
  label,
  icon,
  triggerContent,
  isOpen,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  triggerContent: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAF9F5] transition-colors rounded-[8px]">
      <div className="flex items-center gap-2.5 text-xs font-medium text-[#65706A]">
        <span className="text-[#8A958F]">{icon}</span>
        <span>{label}</span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#EAEFE5] transition-all cursor-pointer"
      >
        {triggerContent}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#8A958F] ml-0.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-3.5 top-full z-40 mt-1 min-w-[220px] max-h-56 overflow-y-auto rounded-[10px] border border-[#D8DDD4] bg-white p-1.5 shadow-2xl text-xs"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvitePersonPanel({
  workspaceId,
  departments = [],
  people = [],
  onClose,
  onSuccess,
}: {
  workspaceId: string;
  departments?: Department[];
  people?: WorkspacePerson[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(departments[0]?.id || "");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [employmentStatus, setEmploymentStatus] = React.useState<EmploymentStatus>("Active");
  const [managerId, setManagerId] = React.useState("");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [role, setRole] = React.useState<WorkspaceRole>("member");

  // Dropdown States
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const isValid = fullName.trim().length > 1 && email.trim().includes("@");

  // Filter unique team members for manager dropdown
  const uniquePeople = React.useMemo(() => {
    const seen = new Set<string>();
    return (people || []).filter((p) => {
      if (seen.has(p.user_id)) return false;
      seen.add(p.user_id);
      return true;
    });
  }, [people]);

  const selectedDepartment = departments.find((d) => d.id === departmentId);
  const selectedManager = uniquePeople.find((p) => p.user_id === managerId);
  const selectedRole = WORKSPACE_ROLES.find((r) => r.value === role) || WORKSPACE_ROLES[0];
  const selectedEmpType = EMPLOYMENT_TYPES.find((t) => t.value === employmentType) || EMPLOYMENT_TYPES[0];

  const handleCopyLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await invitePersonAction({
        workspaceId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        departmentId: departmentId || undefined,
        employmentType,
        employmentStatus,
        managerId: managerId || undefined,
        startDate,
        role,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to send invitation.");
        setLoading(false);
        return;
      }

      const inviteUrl = res.data?.inviteUrl;
      if (inviteUrl) {
        setGeneratedInviteUrl(inviteUrl);
      }

      setSuccessMsg(`Invitation recorded for ${fullName}.`);
      setLoading(false);
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-[#D8DDD4] bg-[#FCFCFA] shadow-2xl text-[#18221E]"
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7EADF] bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#10251F] text-white font-bold text-sm shadow-xs">
            +
          </div>
          <div>
            <h2 className="text-base font-bold text-[#18221E] tracking-tight">
              Invite teammate
            </h2>
            <p className="text-[11px] text-[#65706A]">
              Add a new member to your workspace operating system.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── STATUS BANNERS ──────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="px-6 pt-3 shrink-0">
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── GENERATED LINK BANNER (COPY DIRECTLY) ────────────────────────── */}
      {generatedInviteUrl && (
        <div className="px-6 pt-3 shrink-0 space-y-2">
          <div className="rounded-[12px] border border-[#246244]/30 bg-[#EAF4E2] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#246244]">
                ✓ Invitation Created Successfully
              </span>
              <span className="text-[10px] font-semibold text-[#246244]/80 bg-white/70 px-2 py-0.5 rounded-full border border-[#D8DDD4]">
                Valid for 7 days
              </span>
            </div>

            <p className="text-[11px] text-[#246244] leading-relaxed">
              If your email domain isn't verified on Resend yet, you can copy and share this link directly with your teammate:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedInviteUrl}
                className="flex-1 rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#18221E] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shrink-0 shadow-xs"
              >
                <span>{copied ? "Copied! ✓" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCROLLABLE FORM BODY ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 flex flex-col justify-between">
        <div className="space-y-5">
          {/* PRIMARY PROFILE INPUTS */}
          <div className="rounded-[12px] border border-[#E7EADF] bg-white p-4 space-y-3.5 shadow-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full text-base font-bold tracking-tight text-[#18221E] placeholder:text-[#65706A]/30 bg-transparent border-0 border-b border-[#E7EADF] pb-1.5 focus:border-[#10251F] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. elena@company.com"
                className="w-full text-sm font-medium text-[#18221E] placeholder:text-[#65706A]/30 bg-transparent border-0 border-b border-[#E7EADF] pb-1.5 focus:border-[#10251F] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Principal Product Designer"
                className="w-full text-xs font-semibold text-[#18221E] placeholder:text-[#65706A]/30 bg-transparent border-0 border-b border-[#E7EADF] pb-1 focus:border-[#10251F] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* CLICKUP STYLE CUSTOM PROPERTY ROWS */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] px-1">
              Member Properties
            </span>

            <div className="rounded-[12px] border border-[#E7EADF] bg-white divide-y divide-[#E7EADF] shadow-xs">
              {/* Department */}
              <CustomDropdown
                label="Department"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                }
                triggerContent={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
                    <AppIcon name="departments" size={12} />
                    <span>{selectedDepartment?.name || "No department"}</span>
                  </span>
                }
                isOpen={openDropdown === "department"}
                onToggle={() => setOpenDropdown(openDropdown === "department" ? null : "department")}
                onClose={() => setOpenDropdown(null)}
              >
                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentId("");
                      setOpenDropdown(null);
                    }}
                    className={`flex items-center justify-between w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                      !departmentId ? "bg-[#EAF4E2] font-bold text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                    }`}
                  >
                    <span>No department</span>
                    {!departmentId && <AppIcon name="check" size={12} className="text-[#246244]" />}
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDepartmentId(d.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                        departmentId === d.id ? "bg-[#EAF4E2] font-bold text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <AppIcon name="departments" size={12} />
                        <span>{d.name}</span>
                      </span>
                      {departmentId === d.id && <AppIcon name="check" size={12} className="text-[#246244]" />}
                    </button>
                  ))}
                </div>
              </CustomDropdown>

              {/* Reports To (Manager) */}
              <CustomDropdown
                label="Reports to"
                icon={<AppIcon name="people" size={14} />}
                triggerContent={
                  selectedManager ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10251F] text-white px-2 py-0.5 text-[11px] font-medium">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EAF4E2] text-[8px] font-bold text-[#246244]">
                        {(selectedManager.full_name || selectedManager.email)[0].toUpperCase()}
                      </span>
                      <span className="truncate max-w-[120px]">{selectedManager.full_name || selectedManager.email}</span>
                    </span>
                  ) : (
                    <span className="text-[#65706A] font-medium">None (Founder)</span>
                  )
                }
                isOpen={openDropdown === "manager"}
                onToggle={() => setOpenDropdown(openDropdown === "manager" ? null : "manager")}
                onClose={() => setOpenDropdown(null)}
              >
                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setManagerId("");
                      setOpenDropdown(null);
                    }}
                    className={`flex items-center justify-between w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                      !managerId ? "bg-[#EAF4E2] font-bold text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                    }`}
                  >
                    <span>None (Reports to Founder)</span>
                    {!managerId && <AppIcon name="check" size={12} className="text-[#246244]" />}
                  </button>
                  {uniquePeople.map((p) => (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => {
                        setManagerId(p.user_id);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                        managerId === p.user_id ? "bg-[#EAF4E2] font-bold text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-semibold">{p.full_name || p.email}</p>
                        <p className="text-[10px] text-[#8A958F]">{p.job_title || p.role}</p>
                      </div>
                      {managerId === p.user_id && <AppIcon name="check" size={12} className="text-[#246244] ml-2" />}
                    </button>
                  ))}
                </div>
              </CustomDropdown>

              {/* Workspace Access Role */}
              <CustomDropdown
                label="Access role"
                icon={<AppIcon name="shield" size={14} />}
                triggerContent={
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${selectedRole.badge}`}>
                    <AppIcon name="shield" size={10} />
                    <span>{selectedRole.label}</span>
                  </span>
                }
                isOpen={openDropdown === "role"}
                onToggle={() => setOpenDropdown(openDropdown === "role" ? null : "role")}
                onClose={() => setOpenDropdown(null)}
              >
                <div className="p-1 space-y-1">
                  {WORKSPACE_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        setOpenDropdown(null);
                      }}
                      className={`flex flex-col w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                        role === r.value ? "bg-[#EAF4E2] text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{r.label}</span>
                        {role === r.value && <AppIcon name="check" size={12} className="text-[#246244]" />}
                      </div>
                      <span className="text-[10px] text-[#65706A] mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </CustomDropdown>

              {/* Employment Type */}
              <CustomDropdown
                label="Employment type"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                triggerContent={
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#18221E]">
                    <span className={`h-2 w-2 rounded-full ${selectedEmpType.dot}`} />
                    <span>{selectedEmpType.label}</span>
                  </span>
                }
                isOpen={openDropdown === "employmentType"}
                onToggle={() => setOpenDropdown(openDropdown === "employmentType" ? null : "employmentType")}
                onClose={() => setOpenDropdown(null)}
              >
                <div className="p-1 space-y-0.5">
                  {EMPLOYMENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setEmploymentType(t.value);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full rounded-[6px] px-2.5 py-1.5 text-left text-xs ${
                        employmentType === t.value ? "bg-[#EAF4E2] font-bold text-[#246244]" : "hover:bg-[#FAF9F5] text-[#18221E]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                        <span>{t.label}</span>
                      </span>
                      {employmentType === t.value && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </CustomDropdown>

              {/* Start Date */}
              <div className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAF9F5] transition-colors rounded-[8px]">
                <div className="flex items-center gap-2.5 text-xs font-medium text-[#65706A]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Start date</span>
                </div>
                <div className="w-44">
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="Select start date"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAF9F5] transition-colors rounded-[8px]">
                <div className="flex items-center gap-2.5 text-xs font-medium text-[#65706A]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Phone (optional)</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="font-medium text-xs text-[#18221E] bg-transparent text-right focus:outline-none placeholder:text-[#8A958F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── FIXED BOTTOM ACTION BAR ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E7EADF] bg-[#FAF9F5] -mx-6 -mb-5 px-6 py-3.5 shrink-0 rounded-b-[16px]">
          <p className="text-[11px] text-[#65706A]">
            Teammate will receive an onboarding invite link.
          </p>

          <div className="flex items-center gap-2.5">
            {generatedInviteUrl ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.refresh();
                  if (onSuccess) onSuccess();
                }}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all shadow-md focus:outline-none cursor-pointer"
              >
                <span>Done</span>
                <span className="text-[#C7F34A]">✓</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-white hover:text-[#18221E] border border-transparent hover:border-[#D8DDD4] transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#18342C] disabled:opacity-40 transition-all shadow-md focus:outline-none cursor-pointer"
                >
                  <span>{loading ? "Sending..." : "Send Invitation"}</span>
                  <span className="text-[#C7F34A]">→</span>
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}

export function InvitePersonModal({
  isOpen,
  onClose,
  workspaceId,
  departments = [],
  people = [],
  onSuccess,
}: InvitePersonModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/15"
          />

          <InvitePersonPanel
            workspaceId={workspaceId}
            departments={departments}
            people={people}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
