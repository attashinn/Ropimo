"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspacePerson } from "@/types/people";
import { Workspace } from "@/types/workspace";
import { Department } from "@/types/department";
import { Task } from "@/types/task";
import { EditPersonModal } from "./edit-person-modal";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmployeeOnboarding } from "@/types/people";
import { AttendanceRecord, MonthlyAttendanceSummary } from "@/types/attendance";
import { LeaveBalance, LeaveRequest } from "@/types/leave";
import { MemberActivitySummary, MemberProjectSummary } from "@/lib/people/queries";
import { WorkspaceInvitation } from "@/types/people";
import {
  inviteEmployeeAction,
  resendEmployeeInvitationAction,
  revokeEmployeeInvitationAction,
} from "@/lib/invitations/actions";
import { AppIcon } from "@/components/ui/app-icon";
import { updateOnboardingChecklistItemAction } from "@/lib/recruitment/actions";

export interface PersonDetailViewProps {
  person: WorkspacePerson;
  workspace: Workspace;
  userRole: string;
  departments: Department[];
  tasks?: Task[];
  activities?: MemberActivitySummary[];
  projects?: MemberProjectSummary[];
  onboarding?: EmployeeOnboarding | null;
  invitation?: WorkspaceInvitation | null;
  recruitmentHistory?: any;
  attendanceHistory?: AttendanceRecord[];
  attendanceMonthlySummary?: MonthlyAttendanceSummary | null;
  leaveBalances?: LeaveBalance[];
  leaveRequests?: LeaveRequest[];
}

type TabKey =
  | "overview"
  | "work_history"
  | "documents"
  | "assets"
  | "tasks"
  | "activity"
  | "recruitment"
  | "onboarding"
  | "attendance"
  | "leave";

export function PersonDetailView({
  person,
  workspace,
  userRole,
  departments,
  tasks = [],
  activities = [],
  projects = [],
  onboarding,
  invitation,
  recruitmentHistory,
  attendanceHistory = [],
  attendanceMonthlySummary,
  leaveBalances = [],
  leaveRequests = [],
}: PersonDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [taskFilter, setTaskFilter] = React.useState<string>("all");
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = React.useState(false);
  const [assignAssetModalOpen, setAssignAssetModalOpen] = React.useState(false);

  // Dynamic state for documents and assets
  const [documents, setDocuments] = React.useState(person.documents || []);
  const [assets, setAssets] = React.useState(person.assets || []);

  // Invitation State
  const [invitationState, setInvitationState] = React.useState<WorkspaceInvitation | null>(invitation || null);
  const [invitationLoading, setInvitationLoading] = React.useState(false);
  const [invitationMsg, setInvitationMsg] = React.useState<{ text: string; error?: boolean } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const [newDocName, setNewDocName] = React.useState("");
  const [newDocType, setNewDocType] = React.useState("CV/Resume");
  const [newAssetName, setNewAssetName] = React.useState("");
  const [newAssetType, setNewAssetType] = React.useState("Hardware");
  const [newAssetSerial, setNewAssetSerial] = React.useState("");

  const canManage = ["owner", "admin", "manager"].includes(userRole);
  const canEditRole = ["owner", "admin"].includes(userRole);

  const handleSendInvite = async () => {
    setInvitationLoading(true);
    setInvitationMsg(null);
    try {
      const res = await inviteEmployeeAction({
        workspaceId: workspace.id,
        userId: person.user_id,
        employeeId: person.employee_id || undefined,
        email: person.email,
        fullName: person.full_name || undefined,
        role: (person.role as any) || "member",
        jobTitle: person.job_title || undefined,
        departmentId: person.departments[0]?.id || undefined,
        employmentType: person.employment_type as any,
      });

      if (!res.success) {
        setInvitationMsg({ text: res.error || "Failed to send invitation.", error: true });
      } else {
        setInvitationMsg({ text: "Invitation sent successfully! Email dispatched." });
        if (res.data?.token) {
          setInvitationState({
            id: `inv-${Date.now()}`,
            workspace_id: workspace.id,
            email: person.email,
            role: (person.role as any) || "member",
            token: res.data.token,
            status: "Pending",
            expires_at: res.data.expiresAt,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      setInvitationMsg({ text: err?.message || "An error occurred.", error: true });
    } finally {
      setInvitationLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!invitationState) return;
    setInvitationLoading(true);
    setInvitationMsg(null);
    try {
      const res = await resendEmployeeInvitationAction({
        workspaceId: workspace.id,
        invitationId: invitationState.id,
        email: person.email,
      });

      if (!res.success) {
        setInvitationMsg({ text: res.error || "Failed to resend invitation.", error: true });
      } else {
        setInvitationMsg({ text: "Invitation resent with a fresh secure link." });
        if (res.data?.token) {
          setInvitationState((prev) =>
            prev
              ? {
                  ...prev,
                  token: res.data.token,
                  status: "Pending",
                  expires_at: res.data.expiresAt,
                }
              : null
          );
        }
      }
    } catch (err: any) {
      setInvitationMsg({ text: err?.message || "An error occurred.", error: true });
    } finally {
      setInvitationLoading(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!invitationState) return;
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    setInvitationLoading(true);
    setInvitationMsg(null);
    try {
      const res = await revokeEmployeeInvitationAction({
        workspaceId: workspace.id,
        invitationId: invitationState.id,
        email: person.email,
      });

      if (!res.success) {
        setInvitationMsg({ text: res.error || "Failed to revoke invitation.", error: true });
      } else {
        setInvitationMsg({ text: "Invitation revoked." });
        setInvitationState((prev) => (prev ? { ...prev, status: "Revoked" } : null));
      }
    } catch (err: any) {
      setInvitationMsg({ text: err?.message || "An error occurred.", error: true });
    } finally {
      setInvitationLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!invitationState?.token) return;
    const url = `${window.location.origin}/invite/${invitationState.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const displayName = person.full_name || person.email.split("@")[0];
  const primaryDept = person.departments[0]?.name || "Not set";
  const employeeId = person.employee_id || "Not set";
  const hireDateStr = person.hire_date
    ? new Date(person.hire_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

  // Workload calculations
  const openTasksCount = tasks.filter((t) => t.status !== "completed").length;
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const projectsCount = projects.length > 0 ? projects.length : new Set(tasks.map((t) => t.project_id).filter(Boolean)).size;

  const filteredTasks = React.useMemo(() => {
    if (taskFilter === "all") return tasks;
    if (taskFilter === "open") return tasks.filter((t) => t.status !== "completed");
    if (taskFilter === "completed") return tasks.filter((t) => t.status === "completed");
    return tasks;
  }, [tasks, taskFilter]);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    setDocuments((prev) => [
      {
        id: `doc-${Date.now()}`,
        user_id: person.user_id,
        name: newDocName.trim(),
        document_type: newDocType as "CV/Resume" | "Other",
        file_url: "#",
        file_size: 1024 * 1024,
        uploaded_by: displayName,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setNewDocName("");
    setUploadDocModalOpen(false);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    setAssets((prev) => [
      {
        id: `ast-${Date.now()}`,
        user_id: person.user_id,
        asset_name: newAssetName.trim(),
        asset_type: newAssetType as "Hardware" | "Other",
        serial_number: newAssetSerial.trim() || null,
        assigned_date: new Date().toISOString(),
        status: "Assigned",
      },
      ...prev,
    ]);

    setNewAssetName("");
    setNewAssetSerial("");
    setAssignAssetModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 sm:space-y-7 pb-24 text-[#18221E]">
      {/* 1. BREADCRUMB NAVIGATION */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link
          href="/app"
          className="font-medium text-[#65706A] hover:text-[#18221E] transition-colors"
        >
          {workspace.name || "brnnd"}
        </Link>
        <span className="text-[#D8DDD4]">/</span>
        <Link
          href="/app/people"
          className="font-medium text-[#65706A] hover:text-[#18221E] transition-colors"
        >
          People
        </Link>
        <span className="text-[#D8DDD4]">/</span>
        <span className="font-semibold text-[#18221E]">{displayName}</span>
      </div>

      {/* 2. TOP PROFILE HEADER */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            {/* Large Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-2xl font-bold text-white shadow-2xs">
              {displayName[0].toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221E]">
                  {displayName}
                </h1>
                <span className="flex items-center gap-1.5 rounded-full bg-[#EAF4E2] px-3 py-0.5 text-xs font-semibold text-[#246244]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                  <span>{person.employment_status || "Active"}</span>
                </span>
              </div>

              <p className="text-sm font-semibold text-[#65706A]">
                {person.job_title || "Member"} {primaryDept !== "Not set" && `• ${primaryDept} Department`}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {canManage && (
              <PrimaryButton size="sm" onClick={() => setEditModalOpen(true)}>
                ✎ Edit Profile
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 pt-4 border-t border-[#D8DDD4]/80 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Work Email
            </span>
            <p className="font-semibold text-[#18221E] truncate mt-0.5">{person.email}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Phone
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5">{person.phone || "Not set"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Location
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5">{person.location || "Not set"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Employee ID
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5">{employeeId}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Hire Date
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5">{hireDateStr}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Type
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5">{person.employment_type || "Full-time"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Role
            </span>
            <p className="font-semibold text-[#18221E] mt-0.5 capitalize">{person.role || "Member"}</p>
          </div>
        </div>
      </div>

      {/* 3. PROFILE TABS */}
      <div className="flex items-center gap-6 border-b border-[#D8DDD4] text-xs font-medium text-[#65706A] overflow-x-auto">
        {(
          [
            { key: "overview", label: "Overview" },
            { key: "work_history", label: "Work History" },
            { key: "documents", label: `Documents (${documents.length})` },
            { key: "assets", label: `Assets (${assets.length})` },
            { key: "tasks", label: `Tasks (${tasks.length})` },
            { key: "activity", label: "Activity" },
            { key: "recruitment", label: "Recruitment" },
            { key: "onboarding", label: "Onboarding" },
            { key: "attendance", label: "Attendance" },
            { key: "leave", label: "Leave" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-b-2 border-[#10251F] font-semibold text-[#18221E] -mb-px"
                : "hover:text-[#18221E]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDE: PERSONAL & EMPLOYMENT DETAILS */}
          <div className="lg:col-span-7 space-y-6">
            {/* Personal Information Card */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Full Name
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{displayName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Work Email
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{person.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Phone
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{person.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Employee ID
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{employeeId}</p>
                </div>
              </div>
            </div>

            {/* Employment Details Card */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">
                Employment Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Department
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{primaryDept}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Job Title
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{person.job_title || "Not set"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Employment Type
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{person.employment_type || "Full-time"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Status
                  </span>
                  <p className="font-semibold text-[#246244] mt-0.5">{person.employment_status || "Active"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Hire Date
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{hireDateStr}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Workspace Role
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5 capitalize">{person.role || "Member"}</p>
                </div>
              </div>
            </div>

            {/* Bio Card */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#18221E]">About & Skills</h3>
              <p className="text-xs text-[#65706A] leading-relaxed">
                {person.bio || "No biography provided."}
              </p>
              {person.skills && person.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {person.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1 text-[11px] font-medium text-[#18221E]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8C9489]">No skills listed.</p>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: CURRENT WORKLOAD & RECENT ACTIVITY */}
          <div className="lg:col-span-5 space-y-6">
            {/* Workload Stats Card */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">
                Current Workload
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                    Open Tasks
                  </span>
                  <p className="text-2xl font-bold text-[#18221E] mt-1">{openTasksCount}</p>
                </div>
                <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                    Completed
                  </span>
                  <p className="text-2xl font-bold text-[#246244] mt-1">{completedTasksCount}</p>
                </div>
                <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                    Projects
                  </span>
                  <p className="text-2xl font-bold text-[#18221E] mt-1">{projectsCount}</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">
                Recent Activity
              </h3>
              {activities.length > 0 ? (
                <div className="divide-y divide-[#D8DDD4]/60 text-xs">
                  {activities.slice(0, 5).map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between">
                      <p className="font-semibold text-[#18221E]">
                        {act.action} {act.target}
                      </p>
                      <span className="text-[11px] text-[#65706A]">{act.timeAgo}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8C9489] py-4 text-center">
                  No recent activity recorded for this member.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORK HISTORY */}
      {activeTab === "work_history" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#18221E]">
              Internal Work & Role History
            </h3>
            <p className="text-xs text-[#65706A]">
              Chronological record of promotions, role adjustments, and department assignments.
            </p>
          </div>

          {person.work_history && person.work_history.length > 0 ? (
            <div className="space-y-6 pt-2">
              {person.work_history.map((hist, i) => (
                <div
                  key={i}
                  className="relative pl-6 border-l-2 border-[#10251F] pb-6 space-y-1.5 last:pb-0"
                >
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#10251F]" />
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#18221E]">{hist.role_title}</h4>
                    <span className="text-xs font-semibold text-[#65706A]">
                      {new Date(hist.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} — {hist.is_current ? "Present" : hist.end_date ? new Date(hist.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#246244]">{hist.department_name}</p>
                  {hist.notes && <p className="text-xs text-[#65706A]">{hist.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#8C9489]">
              No work history transitions recorded yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#18221E]">
                Employee Documents
              </h3>
              <p className="text-xs text-[#65706A]">
                Official contracts, CV/resumes, identification, and company agreements.
              </p>
            </div>

            {canManage && (
              <PrimaryButton size="sm" onClick={() => setUploadDocModalOpen(true)}>
                + Upload Document
              </PrimaryButton>
            )}
          </div>

          {documents.length > 0 ? (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white divide-y divide-[#D8DDD4]/60 overflow-hidden shadow-2xs">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]">
                      <AppIcon name="document" size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#18221E] truncate">{doc.name}</p>
                      <p className="text-[11px] text-[#65706A]">
                        {doc.document_type} • Uploaded {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#8C9489]">
              No documents uploaded for this member.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ASSETS */}
      {activeTab === "assets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#18221E]">
                Assigned Company Assets
              </h3>
              <p className="text-xs text-[#65706A]">
                Hardware devices, enterprise software licenses, and access equipment.
              </p>
            </div>

            {canManage && (
              <PrimaryButton size="sm" onClick={() => setAssignAssetModalOpen(true)}>
                + Assign Asset
              </PrimaryButton>
            )}
          </div>

          {assets.length > 0 ? (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white divide-y divide-[#D8DDD4]/60 overflow-hidden shadow-2xs">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-4 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#18221E]">
                      {asset.asset_type === "Hardware" ? "💻" : "🔑"}
                    </div>
                    <div>
                      <p className="font-bold text-[#18221E]">{asset.asset_name}</p>
                      <p className="text-[11px] text-[#65706A]">
                        {asset.asset_type} {asset.serial_number && `• Serial: ${asset.serial_number}`}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#8C9489]">
              No company assets currently assigned.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TASKS */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#18221E]">
              Assigned Tasks ({filteredTasks.length})
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              {["all", "open", "completed"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTaskFilter(f)}
                  className={`rounded-[8px] px-3 py-1.5 font-medium capitalize ${
                    taskFilter === f
                      ? "bg-[#10251F] text-white"
                      : "border border-[#D8DDD4] bg-white text-[#65706A]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white divide-y divide-[#D8DDD4]/60 overflow-hidden shadow-2xs">
              {filteredTasks.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#18221E]">{t.title}</p>
                    <p className="text-[11px] text-[#65706A]">
                      {t.project_id ? "Project Task" : "General Task"} {t.due_date && `• Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-bold capitalize">
                      {t.priority}
                    </span>
                    <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[10px] font-semibold text-[#246244] capitalize">
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#8C9489]">
              No tasks match the selected filter.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ACTIVITY */}
      {activeTab === "activity" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs divide-y divide-[#D8DDD4]/60 text-xs">
          {activities.length > 0 ? (
            activities.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between">
                <p className="font-semibold text-[#18221E]">
                  {item.action} {item.target}
                </p>
                <span className="text-[11px] text-[#65706A]">{item.timeAgo}</span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-[#8C9489]">
              No recent activity recorded for this member.
            </div>
          )}
        </div>
      )}

      {/* TAB 7: RECRUITMENT */}
      {activeTab === "recruitment" && (
        <div className="space-y-6">
          {recruitmentHistory ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Candidate Overview & Application */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
                    <h3 className="text-sm font-bold text-[#18221E]">Candidate History</h3>
                    {recruitmentHistory.candidate && (
                      <Link
                        href={`/app/people/candidates/${recruitmentHistory.candidate.id}`}
                        className="text-xs font-bold text-[#246244] hover:underline"
                      >
                        View Candidate Profile ↗
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Original Candidate
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {recruitmentHistory.candidate.full_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Applied Position
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {recruitmentHistory.candidate.latest_job_title || "General Application"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Application Date
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {new Date(recruitmentHistory.candidate.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Hired Date
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {recruitmentHistory.candidate.hired_at
                          ? new Date(recruitmentHistory.candidate.hired_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : hireDateStr}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interviews History */}
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-[#18221E]">Interview History</h3>
                  {recruitmentHistory.interviews && recruitmentHistory.interviews.length > 0 ? (
                    <div className="divide-y divide-[#D8DDD4]/60 text-xs">
                      {recruitmentHistory.interviews.map((iv: any) => (
                        <div key={iv.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-[#18221E]">{iv.title}</p>
                            <p className="text-[11px] text-[#65706A]">
                              {iv.interview_type} • {iv.date} at {iv.time}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[10px] font-semibold text-[#246244]">
                            {iv.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8C9489] py-3">No recorded interview sessions.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Offers & Recruitment Activity */}
              <div className="lg:col-span-5 space-y-6">
                {/* Offer Details */}
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-[#18221E]">Job Offer</h3>
                  {recruitmentHistory.offers && recruitmentHistory.offers.length > 0 ? (
                    recruitmentHistory.offers.map((off: any) => (
                      <div key={off.id} className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#65706A]">Status</span>
                          <span className="rounded-full bg-[#EAF4E2] px-2 py-0.5 text-[10px] font-bold text-[#246244]">
                            {off.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#65706A]">Offered Title</span>
                          <span className="font-semibold text-[#18221E]">{off.job_title}</span>
                        </div>
                        {off.salary && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#65706A]">Compensation</span>
                            <span className="font-semibold text-[#18221E]">{off.salary}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[#65706A]">Start Date</span>
                          <span className="font-semibold text-[#18221E]">{off.start_date}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8C9489] py-2">Direct hiring without written online offer.</p>
                  )}
                </div>

                {/* Recruitment Activity Log */}
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-[#18221E]">Recruitment Trail</h3>
                  {recruitmentHistory.activities && recruitmentHistory.activities.length > 0 ? (
                    <div className="divide-y divide-[#D8DDD4]/60">
                      {recruitmentHistory.activities.slice(0, 5).map((act: any) => (
                        <div key={act.id} className="py-2.5 space-y-0.5">
                          <p className="font-semibold text-[#18221E]">{act.title}</p>
                          <p className="text-[11px] text-[#65706A]">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8C9489] py-2">No historical recruitment activity logged.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-12 text-center text-xs text-[#8C9489]">
              This employee was added directly to the workspace without going through the recruitment pipeline.
            </div>
          )}
        </div>
      )}

      {/* TAB 8: ONBOARDING */}
      {activeTab === "onboarding" && (
        <div className="space-y-6">
          {/* 1. EMPLOYEE & INVITATION SUMMARY */}
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8DDD4]/60 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#18221E]">Employee Invitation & Onboarding</h3>
                <p className="text-xs text-[#65706A] mt-0.5">
                  Manage workspace invitation delivery, account credentials, and required onboarding milestones.
                </p>
              </div>

              <Link
                href={`/app/people/onboarding/${person.user_id}`}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-1.5 text-xs font-bold text-[#18221E] hover:bg-white transition-colors text-center"
              >
                Open Interactive Checklist ↗
              </Link>
            </div>

            {/* Notification Banner */}
            {invitationMsg && (
              <div
                className={`rounded-[10px] p-3 text-xs font-medium border ${
                  invitationMsg.error
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-[#EAF4E2] text-[#246244] border-[#246244]/20"
                }`}
              >
                {invitationMsg.text}
              </div>
            )}

            {/* Status & Invitation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invitation State Card */}
              <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    Workspace Invitation Status
                  </span>
                  {invitationState ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        invitationState.status?.toLowerCase() === "accepted"
                          ? "bg-[#EAF4E2] text-[#246244] border-[#246244]/20"
                          : invitationState.status?.toLowerCase() === "pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : invitationState.status?.toLowerCase() === "revoked"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-stone-100 text-stone-600 border-stone-300"
                      }`}
                    >
                      {invitationState.status?.toLowerCase() === "pending"
                        ? "⏳ Invitation Pending"
                        : invitationState.status?.toLowerCase() === "accepted"
                        ? "✓ Accepted"
                        : invitationState.status?.toLowerCase() === "revoked"
                        ? "✕ Revoked"
                        : "⏱ Expired"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-100 text-stone-600 border border-stone-300 px-2.5 py-0.5 text-[10px] font-bold">
                      No Invitation Sent
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="text-[#65706A]">
                    Target Work Email: <strong className="text-[#18221E]">{person.email}</strong>
                  </p>
                  {invitationState?.expires_at && invitationState.status?.toLowerCase() === "pending" && (
                    <p className="text-[#65706A]">
                      Expires On:{" "}
                      <strong className="text-[#18221E]">
                        {new Date(invitationState.expires_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </p>
                  )}
                  {invitationState?.accepted_at && (
                    <p className="text-[#65706A]">
                      Accepted At:{" "}
                      <strong className="text-[#246244]">
                        {new Date(invitationState.accepted_at).toLocaleString()}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Invitation Action Triggers */}
                {canManage && (
                  <div className="pt-2 border-t border-[#D8DDD4]/60 flex flex-wrap items-center gap-2">
                    {!invitationState || invitationState.status?.toLowerCase() === "expired" || invitationState.status?.toLowerCase() === "revoked" ? (
                      <button
                        type="button"
                        disabled={invitationLoading}
                        onClick={handleSendInvite}
                        className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                      >
                        {invitationLoading ? "Sending..." : "✉ Send Invitation"}
                      </button>
                    ) : invitationState.status?.toLowerCase() === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={invitationLoading}
                          onClick={handleResendInvite}
                          className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                        >
                          {invitationLoading ? "Resending..." : "↻ Resend"}
                        </button>
                        <button
                          type="button"
                          disabled={invitationLoading}
                          onClick={handleRevokeInvite}
                          className="rounded-[8px] border border-red-200 bg-white text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition-colors"
                        >
                          Revoke
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white text-[#18221E] px-3 py-1.5 text-xs font-semibold hover:bg-[#FAF9F5] transition-colors"
                        >
                          <AppIcon name={copiedLink ? "check" : "link"} size={12} />
                          <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#246244]">
                        ✓ Employee identity active
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Onboarding Status & Progress Card */}
              <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    Lifecycle Milestone
                  </span>
                  <span className="rounded-full bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 px-2.5 py-0.5 text-[10px] font-bold">
                    {onboarding?.status || person.onboarding_status || "In Progress"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#18221E]">
                    <span>Checklist Progress</span>
                    <span>{onboarding?.progress_percentage || 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#D8DDD4]/60 overflow-hidden">
                    <div
                      className="h-full bg-[#246244] rounded-full transition-all duration-300"
                      style={{ width: `${onboarding?.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[#65706A] block">Employee ID:</span>
                    <span className="font-mono font-bold text-[#18221E]">{employeeId}</span>
                  </div>
                  <div>
                    <span className="text-[#65706A] block">Department:</span>
                    <span className="font-semibold text-[#18221E]">{primaryDept}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Preview */}
            <div className="space-y-2 pt-2 border-t border-[#D8DDD4]/60">
              <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                Required Onboarding Checklist
              </span>
              <div className="divide-y divide-[#D8DDD4]/60 text-xs rounded-[10px] border border-[#D8DDD4] bg-white overflow-hidden">
                {(onboarding?.checklist || []).map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between hover:bg-[#FAF9F5] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${item.completed ? "text-[#246244]" : "text-[#8C9489]"}`}>
                        {item.completed ? "✓" : "○"}
                      </span>
                      <div>
                        <p className={`font-semibold ${item.completed ? "text-[#65706A] line-through" : "text-[#18221E]"}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-[#65706A] mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#65706A] rounded-[4px] bg-[#FAF9F5] px-2 py-0.5 border border-[#D8DDD4]">
                      {item.section}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: ATTENDANCE */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {attendanceMonthlySummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Working Days</span>
                <p className="text-xl font-bold text-[#18221E] mt-1">{attendanceMonthlySummary.workingDays}</p>
              </div>
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Present</span>
                <p className="text-xl font-bold text-[#246244] mt-1">{attendanceMonthlySummary.present}</p>
              </div>
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Late</span>
                <p className="text-xl font-bold text-amber-700 mt-1">{attendanceMonthlySummary.late}</p>
              </div>
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Leave Days</span>
                <p className="text-xl font-bold text-purple-700 mt-1">{attendanceMonthlySummary.leave}</p>
              </div>
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Absent</span>
                <p className="text-xl font-bold text-rose-700 mt-1">{attendanceMonthlySummary.absent}</p>
              </div>
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Total Hours</span>
                <p className="text-xl font-bold text-[#18221E] mt-1">{attendanceMonthlySummary.totalHours} hrs</p>
              </div>
            </div>
          )}

          <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#D8DDD4] bg-[#FAF9F5]/70 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
                Recorded Attendance History
              </h3>
              <span className="text-[11px] text-[#65706A]">{attendanceHistory.length} entries</span>
            </div>

            {attendanceHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#D8DDD4] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4">Worked Hours</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4]/60">
                    {attendanceHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#18221E]">
                          {new Date(rec.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#18221E]">
                          {rec.check_in_at
                            ? new Date(rec.check_in_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "--:--"}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#18221E]">
                          {rec.check_out_at
                            ? new Date(rec.check_out_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "--:--"}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#65706A]">
                          {(rec.total_minutes / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-0.5 text-[10px] font-bold text-[#18221E]">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8C9489]">
                No attendance records recorded for this member.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 10: LEAVE */}
      {activeTab === "leave" && (
        <div className="space-y-6">
          {/* Leave Balances Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {leaveBalances.map((b) => (
              <div
                key={b.leave_type}
                className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#18221E]">{b.leave_type}</span>
                </div>
                <p className="text-xl font-bold text-[#18221E]">
                  {b.remaining}{" "}
                  <span className="text-xs font-normal text-[#65706A]">/ {b.allocated} remaining</span>
                </p>
                <p className="text-[11px] text-[#65706A]">Used: {b.used} days</p>
              </div>
            ))}
          </div>

          {/* Leave Requests Table */}
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#D8DDD4] bg-[#FAF9F5]/70 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
                Leave & Absence History
              </h3>
              <span className="text-[11px] text-[#65706A]">{leaveRequests.length} total entries</span>
            </div>

            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#D8DDD4] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4]/60">
                    {leaveRequests.map((l) => (
                      <tr key={l.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#18221E]">{l.leave_type}</td>
                        <td className="py-3.5 px-4 font-medium text-[#18221E]">
                          {l.start_date} → {l.end_date}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#18221E]">
                          {l.duration_days} {l.duration_days === 1 ? "day" : "days"}
                        </td>
                        <td className="py-3.5 px-4 text-[#65706A] max-w-xs">{l.reason}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-0.5 text-[10px] font-bold text-[#18221E]">
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8C9489]">
                No leave requests recorded for this member.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {editModalOpen && (
        <EditPersonModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          person={person}
          departments={departments}
          canEditRole={canEditRole}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Upload Document Modal */}
      {uploadDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddDocument}
            className="w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl space-y-4 text-[#18221E]"
          >
            <h3 className="text-base font-bold">Upload Employee Document</h3>
            <div>
              <label className="block text-xs font-semibold text-[#65706A] mb-1">Document Name</label>
              <input
                type="text"
                required
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="e.g. Identity_Passport.pdf"
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#65706A] mb-1">Document Type</label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs"
              >
                <option value="CV/Resume">CV / Resume</option>
                <option value="Offer Letter">Offer Letter</option>
                <option value="Contract">Employment Contract</option>
                <option value="NDA">NDA</option>
                <option value="Identity">Identity Document</option>
                <option value="Certificate">Certificate</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadDocModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#65706A]"
              >
                Cancel
              </button>
              <PrimaryButton size="sm" type="submit">
                Upload
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {/* Assign Asset Modal */}
      {assignAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddAsset}
            className="w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl space-y-4 text-[#18221E]"
          >
            <h3 className="text-base font-bold">Assign Asset</h3>
            <div>
              <label className="block text-xs font-semibold text-[#65706A] mb-1">Asset Name</label>
              <input
                type="text"
                required
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="e.g. MacBook Air M2"
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#65706A] mb-1">Asset Type</label>
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs"
              >
                <option value="Hardware">Hardware</option>
                <option value="Software Account">Software Account</option>
                <option value="Access Card">Access Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#65706A] mb-1">Serial Number / Account</label>
              <input
                type="text"
                value={newAssetSerial}
                onChange={(e) => setNewAssetSerial(e.target.value)}
                placeholder="e.g. C02GX01929"
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignAssetModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#65706A]"
              >
                Cancel
              </button>
              <PrimaryButton size="sm" type="submit">
                Assign Asset
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
