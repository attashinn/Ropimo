"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  Mail,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  Building2,
  Shield,
  User,
  Users,
  Send,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { Department } from "@/types/department";
import { PERMISSION_MATRIX } from "@/lib/permissions";
import {
  inviteMembersBatchAction,
  InviteEmailResult,
  checkEmailsAvailability,
  EmailAvailabilityMap,
} from "@/lib/invitations/actions";
import { cn } from "@/lib/utils";

export interface InvitePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userRole?: string;
  departments?: Department[];
  onSuccess?: () => void;
}

type AssignableRole = "admin" | "hr" | "manager" | "member";

interface RoleConfig {
  key: AssignableRole;
  label: string;
  badge: string;
  summary: string;
  canDo: string[];
  cannotDo: string[];
}

const ROLE_CONFIGS: Record<AssignableRole, RoleConfig> = {
  admin: {
    key: "admin",
    label: "Admin",
    badge: "bg-[#ECE9DD] text-[#111111]",
    summary: "Full administrative workspace access except billing & ownership transfer.",
    canDo: [
      "Manage workspace settings & branding",
      "Invite members (HR, Manager, Member)",
      "Create & edit all departments & projects",
      "Publish jobs & manage hiring offers",
      "Inspect workspace audit logs",
    ],
    cannotDo: [
      "Manage billing or payment subscriptions",
      "Delete workspace or transfer ownership",
      "Invite or demote workspace owners",
    ],
  },
  hr: {
    key: "hr",
    label: "HR",
    badge: "bg-[#EAEFE5] text-[#246244]",
    summary: "Manage hiring pipelines, department onboarding, and member leave.",
    canDo: [
      "Invite team members & managers",
      "Publish job openings & manage offers",
      "View sensitive employee profile info",
      "Approve leave requests across departments",
      "Access company & HR-only folders",
    ],
    cannotDo: [
      "Edit workspace settings or branding",
      "Manage billing or audit logs",
      "Assign Admin or Owner roles",
      "Delete organizational departments",
    ],
  },
  manager: {
    key: "manager",
    label: "Manager",
    badge: "bg-[#E8F0FE] text-[#1A73E8]",
    summary: "Leads projects and coordinates work within assigned departments.",
    canDo: [
      "Manage projects & tasks in own departments",
      "Draft job openings for own departments",
      "Approve leave & view team attendance for own department",
      "Conduct candidate interviews & scorecards",
    ],
    cannotDo: [
      "Invite new workspace members",
      "Publish job listings publicly",
      "Access other departments' private folders",
      "Modify workspace settings or roles",
    ],
  },
  member: {
    key: "member",
    label: "Member",
    badge: "bg-[#FAF9F5] text-[#6B6B6B]",
    summary: "Collaborate on assigned projects, tasks, and team deliverables.",
    canDo: [
      "View & complete assigned project tasks",
      "Submit leave requests for themselves",
      "Access official company & department files",
      "Submit interview scorecards if assigned",
    ],
    cannotDo: [
      "Invite members or manage roles",
      "Approve team leave or view timesheets",
      "Publish job listings or send offers",
      "Create or delete departments",
    ],
  },
};

export function InvitePersonModal({
  isOpen,
  onClose,
  workspaceId,
  userRole = "owner",
  departments = [],
  onSuccess,
}: InvitePersonModalProps) {
  const router = useRouter();

  // Determine allowed roles the inviter may assign
  const allowedRoles = React.useMemo<AssignableRole[]>(() => {
    const r = userRole.toLowerCase();
    if (r === "owner") return ["admin", "hr", "manager", "member"];
    if (r === "admin") return ["hr", "manager", "member"];
    if (r === "hr") return ["manager", "member"];
    return [];
  }, [userRole]);

  // Form State
  const [emailInput, setEmailInput] = React.useState("");
  const [emailChips, setEmailChips] = React.useState<string[]>([]);
  const [availabilityMap, setAvailabilityMap] = React.useState<EmailAvailabilityMap>({});
  const [checkingAvailability, setCheckingAvailability] = React.useState(false);

  const [selectedRole, setSelectedRole] = React.useState<AssignableRole>(
    allowedRoles[0] || "member"
  );
  const [selectedDepartmentIds, setSelectedDepartmentIds] = React.useState<string[]>([]);
  const [isLead, setIsLead] = React.useState(false);
  const [message, setMessage] = React.useState("");

  // Submission & Results State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorNotice, setErrorNotice] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<InviteEmailResult[] | null>(null);
  const [copiedLinkEmail, setCopiedLinkEmail] = React.useState<string | null>(null);

  // Sync role when allowedRoles change
  React.useEffect(() => {
    if (!allowedRoles.includes(selectedRole) && allowedRoles.length > 0) {
      setSelectedRole(allowedRoles[0]);
    }
  }, [allowedRoles, selectedRole]);

  // Parse raw text into emails (supports comma, space, newline)
  const addEmailsFromText = React.useCallback(
    (text: string) => {
      const rawTokens = text.split(/[\s,;]+/);
      const newValidEmails: string[] = [];

      for (const token of rawTokens) {
        const clean = token.trim().toLowerCase();
        if (clean && clean.includes("@") && !emailChips.includes(clean)) {
          newValidEmails.push(clean);
        }
      }

      if (newValidEmails.length > 0) {
        const updated = Array.from(new Set([...emailChips, ...newValidEmails]));
        setEmailChips(updated);
        setEmailInput("");
        checkAvailability(updated);
      }
    },
    [emailChips]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (emailInput.trim()) {
        addEmailsFromText(emailInput);
      }
    } else if (e.key === "Backspace" && !emailInput && emailChips.length > 0) {
      const updated = emailChips.slice(0, -1);
      setEmailChips(updated);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      addEmailsFromText(pasted);
    }
  };

  const removeChip = (emailToRemove: string) => {
    const updated = emailChips.filter((e) => e !== emailToRemove);
    setEmailChips(updated);
  };

  const checkAvailability = async (emailsToCheck: string[]) => {
    if (emailsToCheck.length === 0) return;
    setCheckingAvailability(true);
    try {
      const map = await checkEmailsAvailability(workspaceId, emailsToCheck);
      setAvailabilityMap((prev) => ({ ...prev, ...map }));
    } catch {}
    setCheckingAvailability(false);
  };

  const handleDepartmentToggle = (deptId: string) => {
    setSelectedDepartmentIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const isDepartmentRequired = selectedRole === "member" || selectedRole === "manager";
  const hasSelectedDepartment = selectedDepartmentIds.length > 0;
  const isFormValid =
    emailChips.length > 0 &&
    (!isDepartmentRequired || hasSelectedDepartment) &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setErrorNotice(null);
    setIsSubmitting(true);

    try {
      const res = await inviteMembersBatchAction({
        workspaceId,
        emails: emailChips,
        role: selectedRole,
        departmentIds: selectedDepartmentIds,
        isLead,
        message: message.trim() || null,
      });

      if (!res.success && res.results.length === 0) {
        setErrorNotice(res.error || "Failed to dispatch invitations.");
      } else {
        setResults(res.results);
        router.refresh();
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorNotice(msg || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteUrl = (email: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLinkEmail(email);
    setTimeout(() => setCopiedLinkEmail(null), 2500);
  };

  const handleResetAndClose = () => {
    setEmailChips([]);
    setEmailInput("");
    setSelectedDepartmentIds([]);
    setIsLead(false);
    setMessage("");
    setResults(null);
    setErrorNotice(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E9E6DA] flex items-center justify-between bg-[#FAF9F5]">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-[8px] bg-[#111111] text-white flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-[#111111]">Invite people</h2>
                <p className="text-[12px] text-[#6B6B6B]">
                  Send invitations to teammates to join your workspace
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-7 h-7 rounded-[6px] text-[#6B6B6B] hover:text-[#111111] hover:bg-[#ECE9DD] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results Screen */}
          {results ? (
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="p-4 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA]">
                <h3 className="text-[13px] font-semibold text-[#111111] mb-1">
                  Invitation dispatch results
                </h3>
                <p className="text-[12px] text-[#6B6B6B]">
                  {results.filter((r) => r.status === "Sent").length} of {results.length} invites
                  dispatched successfully.
                </p>
              </div>

              <div className="divide-y divide-[#E9E6DA] border border-[#E9E6DA] rounded-[8px] overflow-hidden">
                {results.map((r) => {
                  const isCopied = copiedLinkEmail === r.email;
                  return (
                    <div
                      key={r.email}
                      className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-[#FAF9F5]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#111111] truncate">
                            {r.email}
                          </span>
                          {r.status === "Sent" ? (
                            <span className="px-2 py-0.5 rounded-[4px] bg-[#EAF4E2] text-[#246244] text-[11px] font-semibold">
                              Sent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-[4px] bg-[#FCE8E6] text-[#D93025] text-[11px] font-semibold">
                              Failed
                            </span>
                          )}
                        </div>
                        {r.reason && (
                          <p className="text-[11px] text-[#D93025] mt-0.5">{r.reason}</p>
                        )}
                      </div>

                      {r.inviteUrl && (
                        <button
                          type="button"
                          onClick={() => handleCopyInviteUrl(r.email, r.inviteUrl)}
                          className="h-7 px-2.5 rounded-[6px] border border-[#E9E6DA] bg-white text-[11px] font-medium text-[#111111] hover:bg-[#ECE9DD] transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-[#246244]" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#6B6B6B]" />
                              Copy link
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-white text-[12px] font-semibold hover:bg-[#222222] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorNotice && (
                <div className="p-3 rounded-[8px] bg-[#FCE8E6] border border-[#F5C2C7] text-[#D93025] text-[12px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorNotice}</span>
                </div>
              )}

              {/* Multi-Email Chips Input */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-[#111111]">
                  Email addresses
                </label>
                <div className="min-h-[72px] p-2 rounded-[8px] border border-[#E9E6DA] bg-white focus-within:border-[#111111] transition-colors flex flex-wrap gap-1.5 items-center">
                  {emailChips.map((email) => {
                    const status = availabilityMap[email];
                    const isMember = status?.isMember;
                    const isPending = status?.isPending;

                    return (
                      <span
                        key={email}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors border",
                          isMember
                            ? "bg-[#FCE8E6] border-[#F5C2C7] text-[#D93025]"
                            : isPending
                            ? "bg-[#FEF6E4] border-[#F8E3B6] text-[#B58500]"
                            : "bg-[#FAF9F5] border-[#E9E6DA] text-[#111111]"
                        )}
                      >
                        <span className="truncate max-w-[200px]">{email}</span>
                        {isMember && (
                          <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-white text-[#D93025]">
                            Already member
                          </span>
                        )}
                        {isPending && !isMember && (
                          <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-white text-[#B58500]">
                            Invite pending, resend?
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeChip(email)}
                          className="hover:opacity-75 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={
                      emailChips.length === 0
                        ? "Paste comma or newline separated emails..."
                        : "Add another email..."
                    }
                    className="flex-1 min-w-[180px] border-none bg-transparent text-[12px] text-[#111111] placeholder:text-[#9A9A9A] focus:outline-none py-1 px-1"
                  />
                </div>
                <p className="text-[11px] text-[#9A9A9A]">
                  Paste multiple emails separated by comma or newlines. Press Enter to add.
                </p>
              </div>

              {/* Role Select with Live Permissions Preview */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold text-[#111111]">
                  Role assignment
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {allowedRoles.map((r) => {
                    const cfg = ROLE_CONFIGS[r];
                    const isSelected = selectedRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={cn(
                          "p-3 rounded-[8px] border text-left transition-all",
                          isSelected
                            ? "bg-[#FAF9F5] border-[#111111] ring-1 ring-[#111111]"
                            : "bg-white border-[#E9E6DA] hover:border-[#CCCCCC]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-semibold text-[#111111]">{cfg.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] line-clamp-2 leading-relaxed">
                          {cfg.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Live Permission Matrix Capabilities Preview */}
                <div className="p-3.5 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wide">
                    <Shield className="w-3 h-3 text-[#111111]" />
                    <span>What {ROLE_CONFIGS[selectedRole].label} can & cannot do</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                    <div>
                      <p className="font-semibold text-[#246244] mb-1">Allowed capabilities:</p>
                      <ul className="space-y-1 text-[#333333]">
                        {ROLE_CONFIGS[selectedRole].canDo.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#246244] font-bold">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#6B6B6B] mb-1">Restrictions:</p>
                      <ul className="space-y-1 text-[#6B6B6B]">
                        {ROLE_CONFIGS[selectedRole].cannotDo.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#9A9A9A]">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Multi-Select & Lead Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[12px] font-semibold text-[#111111]">
                    Departments{" "}
                    {isDepartmentRequired ? (
                      <span className="text-[#D93025] font-normal">*required for {ROLE_CONFIGS[selectedRole].label}</span>
                    ) : (
                      <span className="text-[#9A9A9A] font-normal">(optional)</span>
                    )}
                  </label>
                  {selectedDepartmentIds.length > 0 && (
                    <label className="flex items-center gap-1.5 text-[12px] text-[#111111] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLead}
                        onChange={(e) => setIsLead(e.target.checked)}
                        className="rounded-[4px] border-[#E9E6DA] text-[#111111] focus:ring-0"
                      />
                      <span>Department lead</span>
                    </label>
                  )}
                </div>

                {departments.length === 0 ? (
                  <p className="text-[12px] text-[#9A9A9A] italic">No departments created yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {departments.map((dept) => {
                      const isChecked = selectedDepartmentIds.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => handleDepartmentToggle(dept.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-[6px] text-[12px] font-medium border transition-colors flex items-center gap-1.5",
                            isChecked
                              ? "bg-[#111111] text-white border-[#111111]"
                              : "bg-white text-[#333333] border-[#E9E6DA] hover:bg-[#FAF9F5]"
                          )}
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{dept.name}</span>
                          {isChecked && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Personal Message */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[12px] font-semibold text-[#111111]">
                    Personal message <span className="text-[#9A9A9A] font-normal">(optional)</span>
                  </label>
                  <span className="text-[11px] text-[#9A9A9A] tabular-nums">
                    {message.length} / 300
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Welcome to the team! Looking forward to working together."
                  className="w-full p-2.5 rounded-[8px] border border-[#E9E6DA] bg-white text-[12px] text-[#111111] placeholder:text-[#9A9A9A] focus:border-[#111111] focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E9E6DA]">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="h-9 px-4 rounded-[8px] border border-[#E9E6DA] bg-white text-[12px] font-medium text-[#6B6B6B] hover:text-[#111111] hover:bg-[#FAF9F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="h-9 px-4 rounded-[8px] bg-[#111111] text-white text-[12px] font-semibold hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    "Sending invitations..."
                  ) : (
                    <>
                      <span>Send {emailChips.length > 0 ? `${emailChips.length} ` : ""}invitation{emailChips.length > 1 ? "s" : ""}</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
