"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  SlidersHorizontal,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Mail,
  MoreHorizontal,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock3,
  Calendar,
  UserCheck,
  ChevronDown,
  X,
  ExternalLink,
  Edit,
  UserX,
  Star,
  FileText,
  FolderKanban,
  Check,
  Phone,
  Shield,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { WorkspaceInvitation, WorkspacePerson, WorkspaceRole } from "@/types/people";
import { Department } from "@/types/department";
import { JobOpening, Candidate, Interview, RecruitmentStats } from "@/types/recruitment";
import { MemberActivitySummary, MemberProjectSummary } from "@/lib/people/queries";
import {
  toggleMemberStatusAction,
  assignPersonToDepartmentAction,
  changeMemberRoleAction,
} from "@/lib/people/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { PersonDetailsDrawer } from "@/components/app/person-details-drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { EditPersonModal } from "@/components/app/edit-person-modal";
import { InvitePersonModal } from "@/components/app/invite-person-modal";
import { JobOpeningsView } from "./recruitment/job-openings-view";
import { CandidatesView } from "./recruitment/candidates-view";
import { InterviewsView } from "./recruitment/interviews-view";
import { OnboardingInvitationsView } from "./recruitment/onboarding-invitations-view";
import {
  ChangeRoleModal,
  ChangeDepartmentsModal,
  SetDepartmentLeadModal,
  DeactivateMemberModal,
  RemoveMemberModal,
} from "./team-action-dialogs";
import { cn } from "@/lib/utils";

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-amber-50 text-amber-700 border-amber-200" },
  admin: { label: "Admin", className: "bg-purple-50 text-purple-700 border-purple-200" },
  manager: { label: "Manager", className: "bg-blue-50 text-blue-700 border-blue-200" },
  hr: { label: "HR", className: "bg-teal-50 text-teal-700 border-teal-200" },
  member: { label: "Member", className: "bg-slate-50 text-slate-700 border-slate-200" },
  guest: { label: "Guest", className: "bg-gray-50 text-gray-600 border-gray-200" },
};

export interface PeopleDirectoryProps {
  workspaceId: string;
  workspaceName?: string;
  workspaceSlug?: string;
  userRole: string;
  people: WorkspacePerson[];
  departments: Department[];
  invitations?: WorkspaceInvitation[];
  memberActivitiesMap?: Record<string, MemberActivitySummary[]>;
  memberProjectsMap?: Record<string, MemberProjectSummary[]>;
  jobOpenings?: JobOpening[];
  candidates?: Candidate[];
  interviews?: Interview[];
  recruitmentStats?: RecruitmentStats;
}

type MainSectionTab = "team" | "onboarding" | "candidates" | "jobs" | "interviews";

export function PeopleDirectory({
  workspaceId,
  workspaceName = "brnnd",
  workspaceSlug,
  userRole,
  people = [],
  departments = [],
  invitations = [],
  memberActivitiesMap = {},
  memberProjectsMap = {},
  jobOpenings = [],
  candidates = [],
  interviews = [],
  recruitmentStats,
}: PeopleDirectoryProps) {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialTab = (searchParams?.get("tab") as MainSectionTab) || "team";

  // Top Section Tab
  const [activeSection, setActiveSection] = React.useState<MainSectionTab>(
    ["team", "onboarding", "candidates", "jobs", "interviews"].includes(initialTab)
      ? initialTab
      : "team"
  );

  const router = useRouter();

  const handleTabSwitch = (tabId: MainSectionTab) => {
    setActiveSection(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  };

  // Filter & Search State
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("recent");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [localPeople, setLocalPeople] = React.useState<WorkspacePerson[]>(people);

  React.useEffect(() => {
    setLocalPeople(people);
  }, [people]);

  // Selected person for the slide-over profile drawer
  const [drawerPerson, setDrawerPerson] = React.useState<WorkspacePerson | null>(null);

  // Inline update handlers
  const handleInlineRoleChange = async (targetUserId: string, newRole: WorkspaceRole) => {
    const targetPerson = localPeople.find((p) => (p.user_id || p.id) === targetUserId);
    if (targetPerson?.role?.toLowerCase() === "owner") {
      toast.error("Owner role cannot be modified");
      return;
    }
    setLocalPeople((prev) =>
      prev.map((p) => ((p.user_id || p.id) === targetUserId ? { ...p, role: newRole } : p))
    );
    try {
      const res = await changeMemberRoleAction({
        workspaceId,
        targetUserId,
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

  const handleInlineDeptChange = async (userId: string, departmentId: string | null) => {
    const selectedDept = departments.find((d) => d.id === departmentId);
    setLocalPeople((prev) =>
      prev.map((p) =>
        (p.user_id || p.id) === userId
          ? {
              ...p,
              departments: selectedDept
                ? [{ id: selectedDept.id, name: selectedDept.name, icon: selectedDept.icon, color: selectedDept.color }]
                : [],
            }
          : p
      )
    );
    try {
      await assignPersonToDepartmentAction({
        workspaceId,
        userId,
        departmentId,
      });
      toast.success(`Department updated to ${selectedDept?.name || "None"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleInlineStatusToggle = async (person: WorkspacePerson) => {
    if (person.role?.toLowerCase() === "owner") {
      toast.error("Cannot modify owner status");
      return;
    }
    const currentStatus = (person.employment_status || "Active").toLowerCase();
    const nextStatus: "Active" | "Inactive" =
      currentStatus === "inactive" || currentStatus === "suspended" ? "Active" : "Inactive";
    const personId = person.user_id || person.id;

    setLocalPeople((prev) =>
      prev.map((p) =>
        (p.user_id || p.id) === personId ? { ...p, employment_status: nextStatus } : p
      )
    );
    try {
      await toggleMemberStatusAction(workspaceId, personId, nextStatus);
      toast.success(`Status set to ${nextStatus}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleInlineStatusChange = async (
    person: WorkspacePerson,
    nextStatus: "Active" | "Inactive" | "On Leave"
  ) => {
    if (person.role?.toLowerCase() === "owner") {
      toast.error("Cannot modify owner status");
      return;
    }
    const personId = person.user_id || person.id;
    setLocalPeople((prev) =>
      prev.map((p) =>
        (p.user_id || p.id) === personId ? { ...p, employment_status: nextStatus } : p
      )
    );
    try {
      await toggleMemberStatusAction(workspaceId, personId, nextStatus);
      toast.success(`Status set to ${nextStatus}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Modals & Menu
  const [editingPerson, setEditingPerson] = React.useState<WorkspacePerson | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [rowMenuPersonId, setRowMenuPersonId] = React.useState<string | null>(null);
  const [isStarred, setIsStarred] = React.useState(false);

  // Team tab row menu dialogs
  const [changeRolePerson, setChangeRolePerson] = React.useState<WorkspacePerson | null>(null);
  const [changeDeptsPerson, setChangeDeptsPerson] = React.useState<WorkspacePerson | null>(null);
  const [setLeadPerson, setSetLeadPerson] = React.useState<WorkspacePerson | null>(null);
  const [deactivatePerson, setDeactivatePerson] = React.useState<WorkspacePerson | null>(null);
  const [removePerson, setRemovePerson] = React.useState<WorkspacePerson | null>(null);

  const canManage = ["owner", "admin", "manager"].includes(userRole);
  const canEditRole = ["owner", "admin"].includes(userRole);

  const pendingInvsCount = React.useMemo(() => {
    return invitations.filter((i) => {
      const s = (i.status || "Pending").toLowerCase();
      const isExpired = i.expires_at && new Date() > new Date(i.expires_at);
      return s === "pending" && !isExpired;
    }).length;
  }, [invitations]);

  // Close drawer on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerPerson) {
        setDrawerPerson(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerPerson]);

  // Close row menus on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-row-menu]")) {
        setRowMenuPersonId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filtering & Sorting
  const filteredPeople = React.useMemo(() => {
    let result = localPeople.filter((person) => {
      const query = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (person.full_name && person.full_name.toLowerCase().includes(query)) ||
        person.email.toLowerCase().includes(query) ||
        (person.job_title && person.job_title.toLowerCase().includes(query)) ||
        person.departments.some((d) => d.name.toLowerCase().includes(query));

      const matchesDept =
        selectedDeptId === "all" ||
        person.departments.some((d) => d.id === selectedDeptId || d.name === selectedDeptId);

      const matchesRole =
        selectedRoleFilter === "all" ||
        person.role?.toLowerCase() === selectedRoleFilter.toLowerCase();

      const matchesStatus =
        selectedStatusFilter === "all" ||
        (person.employment_status || "Active").toLowerCase() === selectedStatusFilter.toLowerCase() ||
        (person.employment_type || "Full-time").toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });

    if (sortBy === "name-asc") {
      result = [...result].sort((a, b) =>
        (a.full_name || a.email).localeCompare(b.full_name || b.email)
      );
    } else if (sortBy === "name-desc") {
      result = [...result].sort((a, b) =>
        (b.full_name || b.email).localeCompare(a.full_name || a.email)
      );
    } else if (sortBy === "role") {
      result = [...result].sort((a, b) => (a.role || "").localeCompare(b.role || ""));
    }

    return result;
  }, [localPeople, debouncedSearch, selectedDeptId, selectedRoleFilter, selectedStatusFilter, sortBy]);

  // Pagination
  const pageSize = 12;
  const totalCount = filteredPeople.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedPeople = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPeople.slice(start, start + pageSize);
  }, [filteredPeople, currentPage]);

  const handleToggleStatus = async (person: WorkspacePerson) => {
    const prevStatus = person.employment_status || "Active";
    const newStatus = prevStatus === "Inactive" ? "Active" : "Inactive";
    try {
      await toggleMemberStatusAction(
        workspaceId,
        person.user_id || person.id,
        newStatus
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update member status");
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "Active").toLowerCase();
    if (s === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Active
        </span>
      );
    }
    if (s === "pending" || s === "invited") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
          <Clock3 className="h-3 w-3" />
          Pending
        </span>
      );
    }
    if (s === "on leave" || s === "on_leave") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
          <Calendar className="h-3 w-3" />
          On leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-ink-3">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
        Inactive
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recently";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };
  return (
    <div className="mx-auto max-w-[1380px] space-y-6 pb-24 text-ink select-none font-sans">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink font-sans">
            People
          </h1>
          <p className="text-xs sm:text-sm text-ink-3 mt-0.5">
            Manage your team, hiring pipeline, and workforce.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink px-3.5 text-xs font-medium text-white shadow-xs hover:bg-ink/90 transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Invite people</span>
          </button>
        )}
      </div>

      {/* 2. POLISHED TOP SEGMENTED NAVIGATION */}
      <div className="flex items-center gap-1 rounded-xl border border-hairline bg-surface p-1 shadow-2xs overflow-x-auto">
        {[
          { id: "team", label: "Team", count: localPeople.length, icon: Users },
          { id: "onboarding", label: "Invites & Onboarding", count: pendingInvsCount, icon: Clock },
          { id: "candidates", label: "Candidates", count: candidates.length, icon: UserCheck },
          { id: "jobs", label: "Job openings", count: jobOpenings.length, icon: Briefcase },
          { id: "interviews", label: "Interviews", count: interviews.length, icon: CalendarDays },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSwitch(tab.id as MainSectionTab)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-ink text-white shadow-2xs font-semibold"
                  : "text-ink-3 hover:bg-hover hover:text-ink"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-emerald-400" : "text-ink-3")} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-subtle border border-hairline text-ink-3"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. SECTION CONTENT */}
      {activeSection === "team" && (
        <div className="space-y-4">
          {/* COMPACT TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <input
                type="text"
                placeholder="Search people by name, email, or role..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-lg border border-hairline bg-surface pl-9 pr-8 text-xs text-ink shadow-2xs placeholder:text-ink-3 focus:border-ink focus:outline-none transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Custom Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter */}
              <RopimoSelect
                value={selectedDeptId}
                onChange={(val) => {
                  setSelectedDeptId(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Departments" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />

              {/* Status Filter */}
              <RopimoSelect
                value={selectedStatusFilter}
                onChange={(val) => {
                  setSelectedStatusFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "Active", label: "Active" },
                  { value: "Pending", label: "Pending" },
                  { value: "On leave", label: "On leave" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />

              {/* Sort By */}
              <RopimoSelect
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                prefix="Sort"
                options={[
                  { value: "recent", label: "Recently Added" },
                  { value: "name-asc", label: "Name (A-Z)" },
                  { value: "name-desc", label: "Name (Z-A)" },
                  { value: "role", label: "Role / Title" },
                ]}
              />

              {/* Clear filters button */}
              {(selectedDeptId !== "all" || selectedStatusFilter !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeptId("all");
                    setSelectedStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="h-9 inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-ink-3 hover:text-rose-600 hover:bg-hover transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* REFINED ENTERPRISE EMPLOYEE DIRECTORY TABLE */}
          <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-hairline bg-subtle/50 text-[10px] font-semibold uppercase tracking-wider text-ink-3 select-none">
                    <th className="py-3 px-4 font-semibold">PERSON</th>
                    <th className="py-3 px-4 font-semibold">ROLE</th>
                    <th className="py-3 px-4 font-semibold">DEPARTMENT</th>
                    <th className="py-3 px-4 font-semibold text-center">STATUS</th>
                    <th className="py-3 px-4 font-semibold">JOINED</th>
                    <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {paginatedPeople.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-ink-3">
                        No team members match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPeople.map((person, index) => {
                      const empId = `EMP-${String(index + 1).padStart(3, "0")}`;
                      const primaryDept = person.departments[0];
                      const jobRole = person.job_title || person.role || "Team Member";
                      const pRole = (person.role || "member").toLowerCase();
                      const roleConfig = ROLE_BADGES[pRole] || ROLE_BADGES.member;
                      const isOwner = pRole === "owner";

                      return (
                        <tr
                          key={person.id}
                          onClick={() => setDrawerPerson(person)}
                          className="group hover:bg-hover/50 transition-colors cursor-pointer select-none"
                        >
                          {/* Person: Avatar + Name + Email + EMP ID */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <RopimoUserAvatar
                                name={person.full_name || person.email}
                                imageUrl={person.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-ink group-hover:text-ink transition-colors truncate">
                                    {person.full_name || person.email.split("@")[0]}
                                  </p>
                                  <span className="rounded bg-subtle border border-hairline px-1.5 py-0.2 text-[9px] font-mono text-ink-3">
                                    {empId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-ink-3 truncate">
                                  {person.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role (Workable Dropdown) */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <p className="font-medium text-ink truncate max-w-[190px]">
                                {jobRole}
                              </p>
                              <div>
                                {canEditRole && !isOwner ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer hover:opacity-80 focus:outline-none",
                                          roleConfig.className
                                        )}
                                      >
                                        <span>{roleConfig.label}</span>
                                        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-36">
                                      <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {(["admin", "manager", "hr", "member", "guest"] as WorkspaceRole[]).map((r) => (
                                        <DropdownMenuItem
                                          key={r}
                                          onClick={() => handleInlineRoleChange(person.user_id || person.id, r)}
                                          className="flex items-center justify-between capitalize text-xs cursor-pointer"
                                        >
                                          <span>{r}</span>
                                          {pRole === r && <Check className="h-3 w-3 text-ink" />}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border",
                                      roleConfig.className
                                    )}
                                  >
                                    {roleConfig.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Department (Workable Dropdown) */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            {canManage ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface hover:bg-hover px-2.5 py-0.5 text-[11px] font-medium text-ink transition-colors cursor-pointer focus:outline-none"
                                  >
                                    {primaryDept ? (
                                      <>
                                        <span
                                          className="h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{ backgroundColor: primaryDept.color || "#246244" }}
                                        />
                                        <span className="truncate max-w-[130px]">{primaryDept.name}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="h-1.5 w-1.5 rounded-full bg-ink-3 shrink-0" />
                                        <span className="text-ink-3 italic">Unassigned</span>
                                      </>
                                    )}
                                    <ChevronDown className="h-2.5 w-2.5 text-ink-3 shrink-0" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                  <DropdownMenuLabel>Department</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleInlineDeptChange(person.user_id || person.id, null)}
                                    className="text-xs cursor-pointer"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-ink-3 mr-2 shrink-0" />
                                    <span>No department</span>
                                    {!primaryDept && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                                  </DropdownMenuItem>
                                  {departments.map((d) => (
                                    <DropdownMenuItem
                                      key={d.id}
                                      onClick={() => handleInlineDeptChange(person.user_id || person.id, d.id)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
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
                            ) : primaryDept ? (
                              <Link
                                href={`/app/departments/${primaryDept.id}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface hover:bg-hover px-2.5 py-0.5 text-[11px] font-medium text-ink transition-colors no-underline"
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: primaryDept.color || "#246244" }}
                                />
                                <span className="truncate max-w-[130px]">{primaryDept.name}</span>
                              </Link>
                            ) : (
                              <span className="text-ink-3 italic text-[11px]">Unassigned</span>
                            )}
                          </td>

                          {/* Status (Workable Toggle/Dropdown) */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {canManage && !isOwner ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-full border transition-colors cursor-pointer focus:outline-none hover:opacity-80"
                                  >
                                    {getStatusBadge(person.employment_status)}
                                    <ChevronDown className="h-2.5 w-2.5 opacity-60 mr-1" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-36">
                                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {(["Active", "Inactive", "On Leave"] as const).map((statusOption) => (
                                    <DropdownMenuItem
                                      key={statusOption}
                                      onClick={() => handleInlineStatusChange(person, statusOption)}
                                      className="flex items-center justify-between text-xs cursor-pointer"
                                    >
                                      <span>{statusOption}</span>
                                      {(person.employment_status || "Active").toLowerCase() === statusOption.toLowerCase() && (
                                        <Check className="h-3 w-3 text-ink" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              getStatusBadge(person.employment_status)
                            )}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-ink-3 font-medium text-[11px] whitespace-nowrap">
                            {formatDate(person.created_at)}
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/app/people/${person.user_id || person.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-2 hover:text-ink hover:underline whitespace-nowrap"
                              >
                                <span>View profile</span>
                                <ChevronRight className="h-3 w-3" />
                              </Link>

                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer focus:outline-none"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => setChangeRolePerson(person)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
                                    >
                                      <Shield className="h-3.5 w-3.5 text-ink-3" />
                                      <span>Change role</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => setChangeDeptsPerson(person)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
                                    >
                                      <Building2 className="h-3.5 w-3.5 text-ink-3" />
                                      <span>Change departments</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => setSetLeadPerson(person)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
                                    >
                                      <Star className="h-3.5 w-3.5 text-ink-3" />
                                      <span>Set as department lead</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => setEditingPerson(person)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
                                    >
                                      <Edit className="h-3.5 w-3.5 text-ink-3" />
                                      <span>Edit details</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() => setDeactivatePerson(person)}
                                      className="flex items-center gap-2 text-xs cursor-pointer"
                                    >
                                      <UserX className="h-3.5 w-3.5 text-ink-3" />
                                      <span>Deactivate</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => setRemovePerson(person)}
                                      className="flex items-center gap-2 text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Remove</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-subtle/40 text-xs">
                <span className="text-ink-3">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} members
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-2xs hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-2xs hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ONBOARDING & PENDING INVITATIONS TAB */}
      {activeSection === "onboarding" && (
        <OnboardingInvitationsView
          workspaceId={workspaceId}
          userRole={userRole}
          invitations={invitations}
          people={people}
          departments={departments}
          onOpenInviteModal={() => setInviteModalOpen(true)}
        />
      )}

      {/* 5. CANDIDATES & RECRUITMENT ATS TAB */}
      {activeSection === "candidates" && (
        <CandidatesView
          workspaceId={workspaceId}
          userRole={userRole}
          candidates={candidates}
          jobOpenings={jobOpenings}
          departments={departments}
          teamMembers={people}
          onNavigateToJobs={() => setActiveSection("jobs")}
        />
      )}

      {/* 5. JOB OPENINGS TAB */}
      {activeSection === "jobs" && (
        <JobOpeningsView
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug || workspaceId}
          userRole={userRole}
          jobOpenings={jobOpenings}
          departments={departments}
        />
      )}

      {/* 6. INTERVIEWS TAB */}
      {activeSection === "interviews" && (
        <InterviewsView
          workspaceId={workspaceId}
          userRole={userRole}
          interviews={interviews}
          candidates={candidates}
          teamMembers={people}
        />
      )}

      {/* 7. SLIDE-OVER EMPLOYEE PROFILE DRAWER (Framer Motion Spring Physics) */}
      <PersonDetailsDrawer
        person={drawerPerson}
        workspaceId={workspaceId}
        departments={departments}
        projectsMap={memberProjectsMap}
        activitiesMap={memberActivitiesMap}
        canManage={canManage}
        onClose={() => setDrawerPerson(null)}
        onPersonUpdated={(updated) => {
          setDrawerPerson(updated);
          setLocalPeople((prev) =>
            prev.map((p) => ((p.user_id || p.id) === (updated.user_id || updated.id) ? updated : p))
          );
        }}
      />

      {/* 8. MODALS */}
      <InvitePersonModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        workspaceId={workspaceId}
        userRole={userRole}
        departments={departments}
      />

      {editingPerson && (
        <EditPersonModal
          isOpen={true}
          onClose={() => setEditingPerson(null)}
          person={editingPerson}
          departments={departments}
          canEditRole={canEditRole}
        />
      )}

      {/* Row Menu Action Modals */}
      {changeRolePerson && (
        <ChangeRoleModal
          isOpen={true}
          onClose={() => setChangeRolePerson(null)}
          person={changeRolePerson}
          workspaceId={workspaceId}
          onSuccess={() => router.refresh()}
        />
      )}

      {changeDeptsPerson && (
        <ChangeDepartmentsModal
          isOpen={true}
          onClose={() => setChangeDeptsPerson(null)}
          person={changeDeptsPerson}
          workspaceId={workspaceId}
          departments={departments}
          onSuccess={() => router.refresh()}
        />
      )}

      {setLeadPerson && (
        <SetDepartmentLeadModal
          isOpen={true}
          onClose={() => setSetLeadPerson(null)}
          person={setLeadPerson}
          workspaceId={workspaceId}
          departments={departments}
          onSuccess={() => router.refresh()}
        />
      )}

      {deactivatePerson && (
        <DeactivateMemberModal
          isOpen={true}
          onClose={() => setDeactivatePerson(null)}
          person={deactivatePerson}
          workspaceId={workspaceId}
          allMembers={people}
          onSuccess={() => router.refresh()}
        />
      )}

      {removePerson && (
        <RemoveMemberModal
          isOpen={true}
          onClose={() => setRemovePerson(null)}
          person={removePerson}
          workspaceId={workspaceId}
          allMembers={people}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
