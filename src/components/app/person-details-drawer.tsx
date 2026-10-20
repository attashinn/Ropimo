"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  Building2,
  Shield,
  Mail,
  Calendar,
  ExternalLink,
  X,
  Check,
  Copy,
  Clock,
  Briefcase,
  AlertCircle,
  UserX,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { WorkspacePerson, WorkspaceRole } from "@/types/people";
import { Department } from "@/types/department";
import { MemberActivitySummary, MemberProjectSummary } from "@/lib/people/queries";
import {
  changeMemberRoleAction,
  assignPersonToDepartmentAction,
  toggleMemberStatusAction,
} from "@/lib/people/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import { cn } from "@/lib/utils";

export interface PersonDetailsDrawerProps {
  person: WorkspacePerson | null;
  workspaceId: string;
  departments: Department[];
  projectsMap?: Record<string, MemberProjectSummary[]>;
  activitiesMap?: Record<string, MemberActivitySummary[]>;
  canManage?: boolean;
  onClose: () => void;
  onPersonUpdated?: (updated: WorkspacePerson) => void;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  owner: { label: "Owner", bg: "bg-amber-50", text: "text-amber-700" },
  admin: { label: "Admin", bg: "bg-purple-50", text: "text-purple-700" },
  manager: { label: "Manager", bg: "bg-blue-50", text: "text-blue-700" },
  hr: { label: "HR", bg: "bg-teal-50", text: "text-teal-700" },
  member: { label: "Member", bg: "bg-slate-50", text: "text-slate-700" },
  guest: { label: "Guest", bg: "bg-gray-50", text: "text-gray-600" },
};

function formatDateDeterministic(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PersonDetailsDrawer({
  person,
  workspaceId,
  departments = [],
  projectsMap = {},
  activitiesMap = {},
  canManage = true,
  onClose,
  onPersonUpdated,
}: PersonDetailsDrawerProps) {
  const router = useRouter();
  const [currentPerson, setCurrentPerson] = React.useState<WorkspacePerson | null>(person);
  const [activeTab, setActiveTab] = React.useState<"overview" | "projects" | "activity">("overview");

  // Sync state
  React.useEffect(() => {
    setCurrentPerson(person);
  }, [person]);

  // Global Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && person) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [person, onClose]);

  if (!person || !currentPerson) return null;

  const personId = currentPerson.user_id || currentPerson.id;
  const personRole = (currentPerson.role || "member").toLowerCase();
  const roleConfig = ROLE_CONFIG[personRole] || ROLE_CONFIG.member;
  const isOwner = personRole === "owner";

  const personProjects = projectsMap[personId] || [];
  const personActivities = activitiesMap[personId] || [];
  const primaryDept = currentPerson.departments?.[0] || null;

  const isInactive =
    (currentPerson.employment_status || "").toLowerCase() === "inactive" ||
    (currentPerson.employment_status || "").toLowerCase() === "suspended";

  // Handlers
  const handleRoleChange = async (newRole: WorkspaceRole) => {
    if (isOwner) {
      toast.error("Owner role cannot be modified");
      return;
    }
    const updated = { ...currentPerson, role: newRole };
    setCurrentPerson(updated);
    onPersonUpdated?.(updated);

    try {
      const res = await changeMemberRoleAction({
        workspaceId,
        targetUserId: personId,
        newRole,
      });
      if (res.success) {
        toast.success(`Role changed to ${newRole}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDepartmentChange = async (deptId: string | null) => {
    const selectedDept = departments.find((d) => d.id === deptId);
    const updated: WorkspacePerson = {
      ...currentPerson,
      departments: selectedDept
        ? [{ id: selectedDept.id, name: selectedDept.name, icon: selectedDept.icon, color: selectedDept.color }]
        : [],
    };
    setCurrentPerson(updated);
    onPersonUpdated?.(updated);

    try {
      await assignPersonToDepartmentAction({
        workspaceId,
        userId: personId,
        departmentId: deptId,
      });
      toast.success(`Department updated to ${selectedDept?.name || "None"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleToggleStatus = async () => {
    if (isOwner) {
      toast.error("Cannot deactivate workspace owner");
      return;
    }
    const nextStatus: "Active" | "Inactive" = isInactive ? "Active" : "Inactive";
    const updated: WorkspacePerson = { ...currentPerson, employment_status: nextStatus };
    setCurrentPerson(updated);
    onPersonUpdated?.(updated);

    try {
      await toggleMemberStatusAction(workspaceId, personId, nextStatus);
      toast.success(`Member status set to ${nextStatus}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop (Framer Motion fade) */}
        <motion.div
          key="person-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/25 backdrop-blur-xs cursor-pointer"
        />

        {/* Slide-over Drawer Panel (Spring physics like Framer) */}
        <motion.aside
          key="person-panel"
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
          className="relative z-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-[780px] h-full bg-surface border-l border-hairline shadow-2xl flex flex-col text-ink font-sans overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-3.5 min-w-0">
              <RopimoUserAvatar
                name={currentPerson.full_name || currentPerson.email}
                imageUrl={currentPerson.avatar_url}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-ink truncate">
                    {currentPerson.full_name || currentPerson.email.split("@")[0]}
                  </h1>
                  <span className="rounded bg-subtle border border-hairline px-1.5 py-0.2 text-[9px] font-mono text-ink-3">
                    {currentPerson.employee_id || "EMP"}
                  </span>
                </div>
                <p className="text-xs text-ink-3 truncate">
                  {currentPerson.job_title || "Team Member"} · {primaryDept?.name || "General"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/app/people/${personId}`}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors"
                title="Open full profile page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentPerson.email);
                  toast.success("Email copied to clipboard");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Copy email"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 items-center gap-1 px-2.5 rounded-md text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
                <span className="text-[10px] text-ink-3 font-mono hidden sm:inline">ESC</span>
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-hairline">
            {/* Quick Properties Strip */}
            <div className="px-6 py-4 bg-surface">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Role (Clickable inline dropdown) */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Shield className="h-3 w-3" />
                    <span>Role</span>
                  </div>
                  {canManage && !isOwner ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs font-semibold text-ink hover:text-ink/80 transition-colors w-full text-left truncate cursor-pointer focus:outline-none capitalize"
                        >
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-medium",
                              roleConfig.bg,
                              roleConfig.text
                            )}
                          >
                            {roleConfig.label}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuLabel>Change Workspace Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(["admin", "manager", "hr", "member", "guest"] as WorkspaceRole[]).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => handleRoleChange(r)}
                            className="flex items-center justify-between capitalize cursor-pointer"
                          >
                            <span>{r}</span>
                            {personRole === r && <Check className="h-3 w-3 text-ink" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize",
                        roleConfig.bg,
                        roleConfig.text
                      )}
                    >
                      {roleConfig.label}
                    </span>
                  )}
                </div>

                {/* Department (Clickable inline dropdown) */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Building2 className="h-3 w-3" />
                    <span>Department</span>
                  </div>
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-ink/80 transition-colors w-full text-left truncate cursor-pointer focus:outline-none"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: primaryDept?.color || "#246244" }}
                          />
                          <span className="truncate">{primaryDept?.name || "General"}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel>Assign Department</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDepartmentChange(null)} className="cursor-pointer">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-3 mr-2" />
                          <span>No department</span>
                        </DropdownMenuItem>
                        {departments.map((d) => (
                          <DropdownMenuItem
                            key={d.id}
                            onClick={() => handleDepartmentChange(d.id)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: d.color || "#246244" }}
                            />
                            <span className="truncate">{d.name}</span>
                            {primaryDept?.id === d.id && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-xs font-semibold text-ink truncate block">
                      {primaryDept?.name || "General"}
                    </span>
                  )}
                </div>

                {/* Status (Clickable inline toggle) */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <AlertCircle className="h-3 w-3" />
                    <span>Status</span>
                  </div>
                  {canManage && !isOwner ? (
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isInactive ? "bg-rose-500" : "bg-emerald-600"
                        )}
                      />
                      <span>{isInactive ? "Inactive" : "Active"}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {/* Employment Type */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Briefcase className="h-3 w-3" />
                    <span>Type</span>
                  </div>
                  <span className="text-xs font-semibold text-ink capitalize block truncate">
                    {currentPerson.employment_type || "Full-time"}
                  </span>
                </div>
              </div>
            </div>

            {/* Framer-style Tab Bar */}
            <div className="px-6 border-b border-hairline flex items-center gap-6 text-xs font-medium h-11 shrink-0 bg-surface">
              {[
                { key: "overview", label: "Overview" },
                { key: "projects", label: "Projects", count: personProjects.length },
                { key: "activity", label: "Activity", count: personActivities.length },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as "overview" | "projects" | "activity")}
                    className={cn(
                      "h-full relative flex items-center gap-1.5 transition-colors cursor-pointer",
                      isActive ? "text-ink font-semibold" : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[10px] font-medium",
                          isActive ? "bg-ink text-white" : "bg-subtle text-ink-2"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="active-person-tab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="px-6 py-5 bg-surface min-h-[300px]">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Contact Info Card */}
                  <div className="rounded-lg border border-hairline bg-subtle/30 p-4 space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Contact & Employment
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-ink-3 block">Email</span>
                        <a
                          href={`mailto:${currentPerson.email}`}
                          className="font-medium text-ink hover:underline truncate block"
                        >
                          {currentPerson.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">Joined Date</span>
                        <span className="font-medium text-ink block">
                          {formatDateDeterministic(currentPerson.created_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">Job Title</span>
                        <span className="font-medium text-ink block">
                          {currentPerson.job_title || "Principal Fullstack Engineer"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">Primary Department</span>
                        <span className="font-medium text-ink block">
                          {primaryDept?.name || "General"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio / Description */}
                  {currentPerson.bio && (
                    <div className="space-y-1.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        About
                      </h3>
                      <p className="text-xs text-ink leading-relaxed rounded-lg border border-hairline bg-subtle/30 p-3">
                        {currentPerson.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROJECTS */}
              {activeTab === "projects" && (
                <div className="space-y-2.5">
                  {personProjects.length === 0 ? (
                    <div className="p-6 rounded-lg border border-dashed border-hairline text-center text-xs text-ink-3 bg-subtle/20">
                      No active projects assigned to this member.
                    </div>
                  ) : (
                    personProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-lg border border-hairline bg-surface hover:bg-hover/60 transition-colors flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-ink truncate">{p.name}</p>
                          <p className="text-[11px] text-ink-3 mt-0.5">{p.role || "Contributor"}</p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-subtle text-ink-2 border border-hairline capitalize shrink-0">
                          {p.status || "Active"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVITY */}
              {activeTab === "activity" && (
                <div className="space-y-2">
                  {personActivities.length === 0 ? (
                    <div className="p-6 rounded-lg border border-dashed border-hairline text-center text-xs text-ink-3 bg-subtle/20">
                      No recorded activity for this member yet.
                    </div>
                  ) : (
                    personActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-lg border border-hairline bg-subtle/30 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{act.action}</p>
                        </div>
                        <span className="text-[10px] text-ink-3 shrink-0" suppressHydrationWarning>
                          {act.timeAgo || act.createdAt}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-hairline bg-surface flex items-center justify-between shrink-0">
            {canManage && !isOwner ? (
              <button
                type="button"
                onClick={handleToggleStatus}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5",
                  isInactive
                    ? "border-emerald-200 bg-surface text-emerald-700 hover:bg-emerald-50"
                    : "border-rose-200 bg-surface text-rose-600 hover:bg-rose-50"
                )}
              >
                {isInactive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                <span>{isInactive ? "Activate Member" : "Deactivate Member"}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-hairline bg-surface px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-hover shadow-2xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
