"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { WorkspacePerson, EmployeeOnboarding, OnboardingChecklistItem } from "@/types/people";
import { Workspace } from "@/types/workspace";
import { Department } from "@/types/department";
import {
  updateOnboardingChecklistItemAction,
  completeOnboardingAction,
  uploadEmployeeDocumentAction,
} from "@/lib/recruitment/actions";
import {
  approveEmployeeOnboardingAction,
  rejectEmployeeOnboardingAction,
} from "@/lib/people/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import {
  CheckCircle2,
  FileText,
  UserCheck,
  Building2,
  Shield,
  Briefcase,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";

export interface EmployeeOnboardingViewProps {
  person: WorkspacePerson;
  onboarding: EmployeeOnboarding;
  workspace: Workspace;
  userRole: string;
  departments: Department[];
}

export function EmployeeOnboardingView({
  person,
  onboarding: initialOnboarding,
  workspace,
  userRole,
  departments = [],
}: EmployeeOnboardingViewProps) {
  const router = useRouter();
  const [onboarding, setOnboarding] = React.useState<EmployeeOnboarding>(initialOnboarding);
  const [checklist, setChecklist] = React.useState<OnboardingChecklistItem[]>(
    initialOnboarding.checklist || []
  );
  const [activeSection, setActiveSection] = React.useState<string>("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>(
    person.departments[0]?.id || departments[0]?.id || ""
  );
  const [selectedRole, setSelectedRole] = React.useState<"member" | "manager">("member");
  const [jobTitle, setJobTitle] = React.useState<string>(person.job_title || "Team Member");
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  // Document Upload State
  const [uploadDocModalOpen, setUploadDocModalOpen] = React.useState(false);
  const [docName, setDocName] = React.useState("");
  const [docType, setDocType] = React.useState<"CV/Resume" | "Offer Letter" | "Contract" | "NDA" | "Identity" | "Certificate" | "Other">("Contract");
  const [uploadingDoc, setUploadingDoc] = React.useState(false);

  const requiredItems = checklist.filter((i) => i.required !== false);
  const completedRequiredCount = requiredItems.filter((i) => i.completed).length;
  const totalRequiredCount = requiredItems.length;
  const allRequiredCompleted = totalRequiredCount > 0 && completedRequiredCount === totalRequiredCount;
  const progressPercent = totalRequiredCount > 0 ? Math.round((completedRequiredCount / totalRequiredCount) * 100) : 100;

  const isCompleted = onboarding.status === "Completed" || onboarding.progress_percentage === 100;
  const totalCount = checklist.length;
  const completedCount = checklist.filter((i) => i.completed).length;
  const remainingCount = totalCount - completedCount;

  const displayName = person.full_name || person.email.split("@")[0];
  const primaryDept = person.departments[0]?.name || "General";
  const employeeId = person.employee_id || onboarding.employee_id || "EMP-001";

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setUpdatingId(itemId);
    setErrorBanner(null);

    // Optimistic UI update
    const updatedList = checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !currentStatus,
            completed_at: !currentStatus ? new Date().toISOString() : null,
          }
        : item
    );
    setChecklist(updatedList);

    const updatedRequired = updatedList.filter((i) => i.required !== false);
    const newCompletedRequired = updatedRequired.filter((i) => i.completed).length;
    const newProgress = updatedRequired.length > 0 ? Math.round((newCompletedRequired / updatedRequired.length) * 100) : 100;

    setOnboarding((prev) => ({
      ...prev,
      progress_percentage: newProgress,
      status: newProgress === 100 ? "Ready to Start" : newProgress >= 50 ? "Access Setup" : "In Progress",
    }));

    try {
      const res = await updateOnboardingChecklistItemAction({
        workspaceId: workspace.id,
        userId: person.user_id,
        itemId,
        completed: !currentStatus,
      });

      if (!res.success) {
        // Rollback
        setChecklist(checklist);
        setErrorBanner(res.error || "Failed to update checklist item.");
      }
    } catch {
      setChecklist(checklist);
      setErrorBanner("An error occurred while saving.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!allRequiredCompleted) {
      setErrorBanner(`Please complete all ${totalRequiredCount - completedRequiredCount} remaining required checklist items.`);
      return;
    }

    setCompleting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await completeOnboardingAction({
        workspaceId: workspace.id,
        userId: person.user_id,
      });

      if (!res.success) {
        setErrorBanner(res.error || "Failed to complete onboarding.");
        setCompleting(false);
        return;
      }

      setOnboarding((prev) => ({
        ...prev,
        status: "Completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      }));

      setSuccessBanner(`${displayName} has successfully completed onboarding and is now an Active Employee!`);
      setCompleting(false);
      router.refresh();
    } catch {
      setErrorBanner("An unexpected error occurred.");
      setCompleting(false);
    }
  };

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  const handleApproveOnboarding = async () => {
    setApproving(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await approveEmployeeOnboardingAction({
        workspaceId: workspace.id,
        userId: person.user_id,
        departmentId: selectedDeptId || undefined,
        role: selectedRole,
        jobTitle: jobTitle.trim() || undefined,
      });

      if (!res.success) {
        setErrorBanner(res.error || "Failed to approve onboarding.");
        setApproving(false);
        return;
      }

      setOnboarding((prev) => ({
        ...prev,
        status: "Completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      }));

      setSuccessBanner(`🎉 ${displayName} has been approved and activated with ${selectedRole.toUpperCase()} role in ${departments.find((d) => d.id === selectedDeptId)?.name || "Assigned Department"}!`);
      router.refresh();
    } catch {
      setErrorBanner("An unexpected error occurred during approval.");
    } finally {
      setApproving(false);
    }
  };

  const handleRejectOnboarding = async () => {
    if (!confirm(`Are you sure you want to reject ${displayName}'s onboarding application?`)) return;
    setRejecting(true);
    setErrorBanner(null);

    try {
      const res = await rejectEmployeeOnboardingAction({
        workspaceId: workspace.id,
        userId: person.user_id,
      });

      if (res.success) {
        setErrorBanner(`Application for ${displayName} was rejected.`);
        router.refresh();
      }
    } catch {
      setErrorBanner("Failed to reject application.");
    } finally {
      setRejecting(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setUploadingDoc(true);

    try {
      const res = await uploadEmployeeDocumentAction({
        workspaceId: workspace.id,
        userId: person.user_id,
        name: docName.trim(),
        documentType: docType,
        fileUrl: `/api/storage/employees/${person.user_id}/${encodeURIComponent(docName.trim())}`,
        fileSize: 1024 * 1024,
      });

      if (res.success) {
        setUploadDocModalOpen(false);
        setDocName("");
        router.refresh();
      }
    } catch {
      // Ignored
    } finally {
      setUploadingDoc(false);
    }
  };

  const sections = [
    { key: "all", label: "All Items", count: totalCount },
    { key: "profile", label: "Profile Verification", count: checklist.filter((i) => i.section === "profile").length },
    { key: "employment", label: "Employment & Role", count: checklist.filter((i) => i.section === "employment").length },
    { key: "documents", label: "Documents", count: checklist.filter((i) => i.section === "documents").length },
    { key: "access", label: "Workspace & Access", count: checklist.filter((i) => i.section === "access").length },
  ];

  const filteredItems =
    activeSection === "all"
      ? checklist
      : checklist.filter((i) => i.section === activeSection);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-24 text-[#18221E]">
      {/* 1. BREADCRUMBS */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link href="/app" className="hover:text-[#18221E]">
          {workspace.name}
        </Link>
        <span>/</span>
        <Link href="/app/people" className="hover:text-[#18221E]">
          People
        </Link>
        <span>/</span>
        <Link href={`/app/people/${person.user_id}`} className="hover:text-[#18221E]">
          {displayName}
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#18221E]">Onboarding</span>
      </div>

      {/* 2. SUCCESS / ERROR BANNERS */}
      {successBanner && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#246244]/20 bg-[#EAF4E2] p-4 text-xs font-semibold text-[#246244]">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successBanner}</span>
          </div>
          <Link
            href={`/app/people/${person.user_id}`}
            className="underline font-bold hover:text-[#18342C]"
          >
            View Employee Profile →
          </Link>
        </div>
      )}

      {errorBanner && (
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {errorBanner}
        </div>
      )}

      {/* 3. EMPLOYEE HEADER CARD */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-[#10251F] text-xl font-bold text-white shadow-2xs">
            {displayName[0]?.toUpperCase()}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18221E]">
                {displayName}
              </h1>
              <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-xs font-bold text-[#18221E]">
                {employeeId}
              </span>
            </div>

            <p className="text-xs text-[#65706A]">
              {person.job_title || "Team Member"} • {primaryDept} • {person.employment_type || "Full-time"}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isCompleted
                    ? "bg-[#EAF4E2] text-[#246244] border border-[#246244]/20"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCompleted ? "bg-[#246244]" : "bg-amber-600"
                  }`}
                />
                <span>{isCompleted ? "Active Employee" : "Pending Onboarding"}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#18221E]">
                <span>Status:</span>
                <span className="text-[#246244]">{onboarding.status}</span>
              </span>

              {person.candidate_id && (
                <Link
                  href={`/app/people/candidates/${person.candidate_id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-medium text-[#65706A] hover:text-[#18221E]"
                >
                  <span>Candidate Profile ↗</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/app/people/${person.user_id}`}
            className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors"
          >
            View Employee Profile
          </Link>

          {isCompleted ? (
            <span className="rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 px-3.5 py-2 text-xs font-bold shadow-2xs">
              ✓ Active Employee
            </span>
          ) : (
            <button
              type="button"
              onClick={handleApproveOnboarding}
              disabled={approving}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <UserCheck size={14} className="text-[#C7F34A]" />
              <span>{approving ? "Approving..." : "Approve & Activate Teammate"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. ADMIN REVIEW & APPROVAL SECTION */}
      {canManage && !isCompleted && (
        <div className="rounded-[16px] border-2 border-[#246244]/30 bg-[#FAF9F5] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7EADF] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] text-xs font-bold">
                ★
              </span>
              <h2 className="text-sm font-bold text-[#18221E]">
                Admin Review & Department Assignment
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-[#B58500] bg-[#FEF6E4] border border-[#F8E3B6] px-2.5 py-0.5 rounded-full">
              Awaiting Administrator Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Dept Select */}
            <div className="space-y-1">
              <label className="block font-bold text-[#18221E] text-[11px]">
                Assign Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] focus:border-[#10251F] focus:outline-none shadow-2xs"
              >
                <option value="">Select a department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Select */}
            <div className="space-y-1">
              <label className="block font-bold text-[#18221E] text-[11px]">
                Workspace Access Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] focus:border-[#10251F] focus:outline-none shadow-2xs"
              >
                <option value="member">Member (Standard Employee)</option>
                <option value="manager">Manager (Team Lead)</option>
              </select>
            </div>

            {/* Job Title */}
            <div className="space-y-1">
              <label className="block font-bold text-[#18221E] text-[11px]">
                Confirmed Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] focus:border-[#10251F] focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E7EADF]">
            <p className="text-[11px] text-[#65706A]">
              Approving will activate this employee&apos;s workspace account and grant access to their employee dashboard.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRejectOnboarding}
                disabled={rejecting}
                className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {rejecting ? "Rejecting..." : "Reject Application"}
              </button>

              <button
                type="button"
                onClick={handleApproveOnboarding}
                disabled={approving}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <UserCheck size={13} className="text-[#C7F34A]" />
                <span>{approving ? "Activating..." : "Approve & Activate Teammate →"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ONBOARDING PROGRESS BAR & WORKFLOW STAGES */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#18221E]">Onboarding Progress</h2>
            <p className="text-xs text-[#65706A] mt-0.5">
              {completedCount} of {totalCount} requirements completed ({progressPercent}%)
            </p>
          </div>

          <span className="text-xl font-bold text-[#18221E]">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-[#E7EADF] overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-[#246244] rounded-full transition-all duration-300"
          />
        </div>

        {/* 5 Milestone Step Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-[11px]">
          {[
            { num: "1", title: "Profile Info", done: completedCount >= 2 },
            { num: "2", title: "Employment", done: completedCount >= 5 },
            { num: "3", title: "Documents", done: completedCount >= 8 },
            { num: "4", title: "Access Setup", done: completedCount >= 11 },
            { num: "5", title: "Active Start", done: isCompleted },
          ].map((st) => (
            <div
              key={st.num}
              className={`rounded-[8px] border p-2.5 flex items-center gap-2 ${
                st.done
                  ? "border-[#246244]/30 bg-[#EAF4E2]/40 text-[#246244]"
                  : "border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  st.done ? "bg-[#246244] text-white" : "bg-[#D8DDD4] text-[#18221E]"
                }`}
              >
                {st.done ? "✓" : st.num}
              </span>
              <span className="font-semibold truncate">{st.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. ONBOARDING CHECKLIST WORKSPACE */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-6">
        {/* Section Filter Pills */}
        <div className="flex items-center justify-between border-b border-[#D8DDD4]/80 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {sections.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                className={`rounded-[8px] px-3 py-1.5 font-semibold transition-colors whitespace-nowrap ${
                  activeSection === sec.key
                    ? "bg-[#10251F] text-white shadow-2xs"
                    : "border border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                {sec.label} ({sec.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setUploadDocModalOpen(true)}
            className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs font-bold text-[#18221E] hover:bg-white transition-colors"
          >
            + Upload Document
          </button>
        </div>

        {/* Checklist Items List */}
        <div className="divide-y divide-[#D8DDD4]/60">
          {filteredItems.map((item) => {
            const isItemUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                className="py-3.5 flex items-start justify-between gap-4 group hover:bg-[#FAF9F5]/40 rounded-[8px] px-2 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={isItemUpdating}
                    onChange={() => handleToggleChecklist(item.id, item.completed)}
                    className="mt-0.5 h-4 w-4 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer shrink-0"
                  />

                  <div className="min-w-0 space-y-0.5">
                    <p
                      className={`text-xs font-bold ${
                        item.completed ? "line-through text-[#65706A]" : "text-[#18221E]"
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-[#65706A]">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      item.required !== false
                        ? "bg-[#10251F] text-white"
                        : "bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]"
                    }`}
                  >
                    {item.required !== false ? "Required" : "Optional"}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]">
                    {item.section}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      item.completed
                        ? "bg-[#EAF4E2] text-[#246244]"
                        : "bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]"
                    }`}
                  >
                    {item.completed ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. UPLOAD DOCUMENT MODAL */}
      <AnimatePresence>
        {uploadDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUploadDocModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
                <h3 className="text-base font-bold text-[#18221E]">Upload Employee Document</h3>
                <button
                  type="button"
                  onClick={() => setUploadDocModalOpen(false)}
                  className="text-xs text-[#65706A] hover:text-[#18221E]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-[#18221E]">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Signed Employment Agreement.pdf"
                    className="w-full rounded-[8px] border border-[#D8DDD4] px-3 py-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#18221E]">Document Category *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="Contract">Employment Contract</option>
                    <option value="Offer Letter">Signed Offer Letter</option>
                    <option value="Identity">Government Identity (NID/Passport)</option>
                    <option value="Certificate">Certificate / Degree</option>
                    <option value="NDA">NDA / Compliance</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>

                <div className="rounded-[10px] border border-dashed border-[#D8DDD4] p-4 text-center text-[#65706A]">
                  <p className="font-medium text-[#18221E]">Private Cloudflare R2 Storage</p>
                  <p className="text-[11px] mt-0.5">Documents are encrypted and workspace-isolated.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadDocModalOpen(false)}
                    className="rounded-[8px] border border-[#D8DDD4] px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                  >
                    Cancel
                  </button>
                  <PrimaryButton size="sm" type="submit" disabled={uploadingDoc}>
                    {uploadingDoc ? "Uploading..." : "Save & Verify Document"}
                  </PrimaryButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
