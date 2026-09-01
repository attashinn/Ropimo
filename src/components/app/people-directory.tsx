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
import { WorkspaceInvitation, WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { JobOpening, Candidate, Interview, RecruitmentStats } from "@/types/recruitment";
import { MemberActivitySummary, MemberProjectSummary } from "@/lib/people/queries";
import { toggleMemberStatusAction, assignPersonToDepartmentAction } from "@/lib/people/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { EditPersonModal } from "@/components/app/edit-person-modal";
import { InvitePersonModal } from "@/components/app/invite-person-modal";
import { JobOpeningsView } from "./recruitment/job-openings-view";
import { CandidatesView } from "./recruitment/candidates-view";
import { InterviewsView } from "./recruitment/interviews-view";
import { OnboardingInvitationsView } from "./recruitment/onboarding-invitations-view";
import { cn } from "@/lib/utils";

export interface PeopleDirectoryProps {
  workspaceId: string;
  workspaceName?: string;
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
  const router = useRouter();

  // Top Section Tab
  const [activeSection, setActiveSection] = React.useState<MainSectionTab>("team");

  // Filter & Search State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("recent");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Selected person for the slide-over profile drawer
  const [drawerPerson, setDrawerPerson] = React.useState<WorkspacePerson | null>(null);
  const [activeProfileTab, setActiveProfileTab] = React.useState<"overview" | "projects" | "activity">("overview");

  // Modals & Menu
  const [editingPerson, setEditingPerson] = React.useState<WorkspacePerson | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [rowMenuPersonId, setRowMenuPersonId] = React.useState<string | null>(null);
  const [isStarred, setIsStarred] = React.useState(false);

  const canManage = ["owner", "admin", "manager"].includes(userRole);
  const canEditRole = ["owner", "admin"].includes(userRole);

  const pendingInvsCount = React.useMemo(() => {
    return invitations.filter((i) => (i.status || "Pending").toLowerCase() === "pending").length;
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
    let result = people.filter((person) => {
      const query = searchQuery.toLowerCase().trim();
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
  }, [people, searchQuery, selectedDeptId, selectedRoleFilter, selectedStatusFilter, sortBy]);

  // Pagination
  const pageSize = 12;
  const totalCount = filteredPeople.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedPeople = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPeople.slice(start, start + pageSize);
  }, [filteredPeople, currentPage]);

  const handleToggleStatus = async (person: WorkspacePerson) => {
    const newStatus = person.employment_status === "Inactive" ? "Active" : "Inactive";
    await toggleMemberStatusAction(
      workspaceId,
      person.user_id || person.id,
      newStatus
    );
    router.refresh();
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "Active").toLowerCase();
    if (s === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
          Active
        </span>
      );
    }
    if (s === "pending" || s === "invited") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F8E3B6] bg-[#FEF6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#B58500]">
          <Clock3 className="h-3 w-3" />
          Pending
        </span>
      );
    }
    if (s === "on leave" || s === "on_leave") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F8CBC2] bg-[#FDECE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#D9383A]">
          <Calendar className="h-3 w-3" />
          On leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#F4F3EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#65706A]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8A958F]" />
        Inactive
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Aug 31, 2026";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const drawerPersonActivities = drawerPerson
    ? memberActivitiesMap[drawerPerson.user_id || drawerPerson.id] || []
    : [];
  const drawerPersonProjects = drawerPerson
    ? memberProjectsMap[drawerPerson.user_id || drawerPerson.id] || []
    : [];

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 pb-24 text-[#18221E] select-none">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            People
          </h1>
          <p className="text-xs sm:text-sm text-[#65706A] mt-0.5">
            Manage your team, hiring pipeline, and workforce.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#10251F] px-3.5 text-xs font-semibold text-[#F4F3EE] shadow-xs hover:bg-[#18342C] transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5 text-[#C7F34A]" />
            <span>Invite people</span>
          </button>
        )}
      </div>

      {/* 2. POLISHED TOP SEGMENTED NAVIGATION */}
      <div className="flex items-center gap-1.5 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-2xs overflow-x-auto">
        {[
          { id: "team", label: "Team", count: people.length, icon: Users },
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
              onClick={() => setActiveSection(tab.id as any)}
              className={cn(
                "flex items-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs font-bold"
                  : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#C7F34A]" : "text-[#65706A]")} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
                  isActive
                    ? "bg-white/20 text-[#F4F3EE]"
                    : "bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
              <input
                type="text"
                placeholder="Search people by name, email, or role..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-8 text-xs text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#65706A] hover:text-[#18221E]"
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
                  className="h-9 inline-flex items-center gap-1 rounded-[10px] border border-[#D8DDD4] bg-white px-2.5 text-xs font-medium text-[#65706A] hover:text-[#D9383A] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* REFINED ENTERPRISE EMPLOYEE DIRECTORY TABLE */}
          <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                    <th className="py-3 px-4 font-bold">PERSON</th>
                    <th className="py-3 px-4 font-bold">ROLE</th>
                    <th className="py-3 px-4 font-bold">DEPARTMENT</th>
                    <th className="py-3 px-4 font-bold text-center">STATUS</th>
                    <th className="py-3 px-4 font-bold">JOINED</th>
                    <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7EADF]">
                  {paginatedPeople.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#65706A]">
                        No team members match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPeople.map((person, index) => {
                      const empId = `EMP-${String(index + 1).padStart(3, "0")}`;
                      const primaryDept = person.departments[0];
                      const jobRole = person.job_title || person.role || "Team Member";

                      return (
                        <tr
                          key={person.id}
                          onClick={() => setDrawerPerson(person)}
                          className="group hover:bg-[#FAF9F5] transition-colors cursor-pointer"
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
                                  <p className="font-bold text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                                    {person.full_name || person.email.split("@")[0]}
                                  </p>
                                  <span className="rounded bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.2 text-[9px] font-mono text-[#8A958F]">
                                    {empId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#65706A] truncate">
                                  {person.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#18221E] truncate max-w-[180px]">
                              {jobRole}
                            </p>
                            <span className="text-[10px] text-[#8A958F] capitalize">
                              {person.role || "member"}
                            </span>
                          </td>

                          {/* Department (Clickable link) */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            {primaryDept ? (
                              <Link
                                href={`/app/departments/${primaryDept.id}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#18221E] hover:border-[#10251F] hover:bg-white transition-all no-underline"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                                <span className="truncate max-w-[130px]">{primaryDept.name}</span>
                              </Link>
                            ) : (
                              <span className="text-[#8A958F] italic">Unassigned</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(person.employment_status)}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-[#65706A] font-medium text-[11px] whitespace-nowrap">
                            {formatDate(person.created_at)}
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2" data-row-menu>
                              <Link
                                href={`/app/people/${person.user_id || person.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#246244] hover:underline whitespace-nowrap"
                              >
                                <span>View profile</span>
                                <ChevronRight className="h-3 w-3" />
                              </Link>

                              {canManage && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRowMenuPersonId(
                                        rowMenuPersonId === person.id ? null : person.id
                                      )
                                    }
                                    className="rounded-[6px] p-1 text-[#65706A] hover:bg-white hover:text-[#18221E] transition-colors"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>

                                  {rowMenuPersonId === person.id && (
                                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[175px] rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-elevated text-left">
                                      <Link
                                        href={`/app/people/onboarding/${person.user_id || person.id}`}
                                        className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold text-[#246244] hover:bg-[#EAF4E2] transition-colors no-underline"
                                      >
                                        <Clock className="h-3.5 w-3.5 text-[#246244]" />
                                        <span>Onboarding Checklist</span>
                                      </Link>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRowMenuPersonId(null);
                                          setEditingPerson(person);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                                      >
                                        <Edit className="h-3.5 w-3.5 text-[#65706A]" />
                                        <span>Edit Details</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRowMenuPersonId(null);
                                          handleToggleStatus(person);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                                      >
                                        <UserX className="h-3.5 w-3.5 text-[#65706A]" />
                                        <span>
                                          {person.employment_status === "Inactive"
                                            ? "Activate Member"
                                            : "Deactivate Member"}
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E7EADF] bg-[#FAF9F5] text-xs">
                <span className="text-[#65706A]">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} members
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          teamMembers={people}
        />
      )}

      {/* 7. SLIDE-OVER EMPLOYEE PROFILE DRAWER */}
      {drawerPerson && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerPerson(null)}
          />

          <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[#D8DDD4] bg-white shadow-elevated animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E7EADF] bg-[#FAF9F5]">
              <div className="flex items-center gap-3.5 min-w-0">
                <RopimoUserAvatar
                  name={drawerPerson.full_name || drawerPerson.email}
                  imageUrl={drawerPerson.avatar_url}
                  size="md"
                />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#18221E] truncate">
                    {drawerPerson.full_name || drawerPerson.email.split("@")[0]}
                  </h2>
                  <p className="text-xs text-[#65706A] truncate">
                    {drawerPerson.job_title || "Team Member"} · {drawerPerson.departments[0]?.name || "General"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/app/people/${drawerPerson.user_id || drawerPerson.id}`}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white p-1.5 text-[#65706A] hover:text-[#18221E] hover:border-[#10251F] transition-colors"
                  title="Open Full Profile Page"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerPerson(null)}
                  className="rounded-full p-1.5 text-[#65706A] hover:bg-white hover:text-[#18221E] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Drawer Tab Navigation */}
            <div className="flex items-center gap-4 px-5 border-b border-[#E7EADF] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveProfileTab("overview")}
                className={cn(
                  "py-3 border-b-2 transition-colors cursor-pointer",
                  activeProfileTab === "overview"
                    ? "border-[#246244] text-[#18221E] font-bold"
                    : "border-transparent text-[#65706A] hover:text-[#18221E]"
                )}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileTab("projects")}
                className={cn(
                  "py-3 border-b-2 transition-colors cursor-pointer",
                  activeProfileTab === "projects"
                    ? "border-[#246244] text-[#18221E] font-bold"
                    : "border-transparent text-[#65706A] hover:text-[#18221E]"
                )}
              >
                Projects ({drawerPersonProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileTab("activity")}
                className={cn(
                  "py-3 border-b-2 transition-colors cursor-pointer",
                  activeProfileTab === "activity"
                    ? "border-[#246244] text-[#18221E] font-bold"
                    : "border-transparent text-[#65706A] hover:text-[#18221E]"
                )}
              >
                Activity
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {activeProfileTab === "overview" && (
                <>
                  {/* Contact Info */}
                  <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 space-y-3">
                    <h3 className="font-bold text-[#18221E] uppercase text-[10px] tracking-wider text-[#8A958F]">
                      Employee Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#8A958F] text-[10px] block">Email</span>
                        <a href={`mailto:${drawerPerson.email}`} className="font-bold text-[#18221E] hover:underline truncate block">
                          {drawerPerson.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-[#8A958F] text-[10px] block">Role Permission</span>
                        <span className="font-bold text-[#18221E] capitalize block">
                          {drawerPerson.role || "Member"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8A958F] text-[10px] block">Employment Status</span>
                        <div className="mt-0.5">{getStatusBadge(drawerPerson.employment_status)}</div>
                      </div>
                      <div>
                        <span className="text-[#8A958F] text-[10px] block">Joined Date</span>
                        <span className="font-bold text-[#18221E] block">
                          {formatDate(drawerPerson.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Department Assignment */}
                  <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 space-y-2">
                    <span className="font-bold text-[#18221E] block">Department</span>
                    {canManage ? (
                      <select
                        value={drawerPerson.departments[0]?.id || ""}
                        onChange={async (e) => {
                          const newDeptId = e.target.value;
                          const selectedDept = departments.find((d) => d.id === newDeptId);
                          setDrawerPerson((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  departments: selectedDept
                                    ? [{ id: selectedDept.id, name: selectedDept.name, icon: selectedDept.icon, color: selectedDept.color }]
                                    : [],
                                }
                              : null
                          );
                          await assignPersonToDepartmentAction({
                            workspaceId,
                            userId: drawerPerson.user_id || drawerPerson.id,
                            departmentId: newDeptId,
                          });
                          router.refresh();
                        }}
                        className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#18221E] focus:border-[#10251F] focus:outline-none cursor-pointer"
                      >
                        <option value="">No department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs font-semibold text-[#18221E]">
                        {drawerPerson.departments[0]?.name || "Not assigned"}
                      </p>
                    )}
                  </div>
                </>
              )}

              {activeProfileTab === "projects" && (
                <div className="space-y-3">
                  {drawerPersonProjects.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#65706A]">
                      No active projects assigned to this member.
                    </p>
                  ) : (
                    drawerPersonProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-[10px] border border-[#D8DDD4] bg-white hover:bg-[#FAF9F5] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#18221E]">{p.name}</p>
                          <span className="text-[10px] font-semibold text-[#65706A]">{p.status}</span>
                        </div>
                        <p className="text-[11px] text-[#65706A] mt-1">{p.role || "Contributor"}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeProfileTab === "activity" && (
                <div className="space-y-3">
                  {drawerPersonActivities.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#65706A]">
                      No recorded activity for this member yet.
                    </p>
                  ) : (
                    drawerPersonActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] space-y-1"
                      >
                        <p className="font-semibold text-[#18221E]">{act.action}</p>
                        <p className="text-[11px] text-[#8A958F]">{act.timeAgo || act.createdAt}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E7EADF] bg-[#FAF9F5] flex items-center justify-between">
              <Link
                href={`/app/people/${drawerPerson.user_id || drawerPerson.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#246244] hover:underline"
              >
                <span>View Complete Profile Page</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerPerson(null)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODALS */}
      <InvitePersonModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        workspaceId={workspaceId}
        departments={departments}
        people={people}
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
    </div>
  );
}
