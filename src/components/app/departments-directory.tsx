"use client";

import * as React from "react";
import Link from "next/link";
import { DepartmentWithStats } from "@/types/department";
import { SearchIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { renderDepartmentIcon } from "./department-icons";
import { CreateDepartmentModal } from "@/components/app/create-department-modal";
import { EditDepartmentModal } from "@/components/app/edit-department-modal";
import { DeleteDepartmentDialog } from "@/components/app/delete-department-dialog";
import { AssignDepartmentLeadModal } from "@/components/app/assign-department-lead-modal";

export interface DepartmentsDirectoryProps {
  workspaceId: string;
  departments: DepartmentWithStats[];
  metrics: {
    totalDepartments: number;
    totalTeamMembers: number;
    totalActiveProjects: number;
  };
}

const DEFAULT_COLOR_SCHEMES: Record<string, { bg: string; text: string }> = {
  code: { bg: "bg-[#EAF4E2]", text: "text-[#246244]" },
  design: { bg: "bg-[#EAF4E2]", text: "text-[#246244]" },
  video: { bg: "bg-[#FEF6E4]", text: "text-[#B58500]" },
  marketing: { bg: "bg-[#EEF2FF]", text: "text-[#4F46E5]" },
  hr: { bg: "bg-[#F0F9FF]", text: "text-[#0284C7]" },
  ops: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]" },
  sales: { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  finance: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  building: { bg: "bg-[#FAF9F5]", text: "text-[#18221E]" },
};

export function DepartmentsDirectory({
  workspaceId,
  departments,
  metrics,
}: DepartmentsDirectoryProps) {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editingDepartment, setEditingDepartment] = React.useState<DepartmentWithStats | null>(null);
  const [deletingDepartment, setDeletingDepartment] = React.useState<DepartmentWithStats | null>(null);
  const [assigningLeadDept, setAssigningLeadDept] = React.useState<DepartmentWithStats | null>(null);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "lead" | "no-lead" | "active">("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState(false);

  const filterRef = React.useRef<HTMLDivElement>(null);
  const menuContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredDepartments = departments.filter((d) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      d.name.toLowerCase().includes(query) ||
      (d.description && d.description.toLowerCase().includes(query)) ||
      (d.leadName && d.leadName.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterType === "lead") return Boolean(d.leadName);
    if (filterType === "no-lead") return !d.leadName;
    if (filterType === "active") return d.projectCount > 0 || d.taskCount > 0;

    return true;
  });

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-7 pb-24" ref={menuContainerRef}>
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-3.5">
          {/* Header Icon Box */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF4E2] text-[#246244] shadow-2xs">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
              Departments
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[#65706A]">
              Organize your company into focused teams with clear ownership, people, projects, and responsibilities.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <PrimaryButton size="sm" onClick={() => setCreateModalOpen(true)}>
            + Create Department
          </PrimaryButton>
        </div>
      </div>

      {/* 2. SUMMARY METRICS (3 Cards in One Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: DEPARTMENTS */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A958F]">
              Departments
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAF4E2] text-[#246244]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#18221E]">
            {metrics.totalDepartments}
          </p>
          <p className="mt-1 text-xs text-[#65706A]">Total departments</p>
        </div>

        {/* Card 2: TEAM MEMBERS */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A958F]">
              Team Members
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F0F9FF] text-[#0284C7]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#18221E]">
            {metrics.totalTeamMembers}
          </p>
          <p className="mt-1 text-xs text-[#65706A]">Across all departments</p>
        </div>

        {/* Card 3: ACTIVE PROJECTS */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A958F]">
              Active Projects
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#FEF6E4] text-[#B58500]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#18221E]">
            {metrics.totalActiveProjects}
          </p>
          <p className="mt-1 text-xs text-[#65706A]">In progress projects</p>
        </div>
      </div>

      {/* 3. SECTION CONTROLS & TABLE */}
      <div className="space-y-3.5 pt-1">
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-0.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8A958F]">
            All Departments
          </h2>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#65706A]">
                <SearchIcon size={13} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departments..."
                className="w-48 sm:w-56 rounded-[8px] border border-[#D8DDD4] bg-white pl-8 pr-3 py-1.5 text-xs text-[#18221E] placeholder:text-[#65706A]/70 shadow-2xs focus:border-[#10251F] focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Dropdown Button */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className="flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-medium text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors focus:outline-none"
              >
                <span>
                  {filterType === "all"
                    ? "Filter"
                    : filterType === "lead"
                    ? "With Lead"
                    : filterType === "no-lead"
                    ? "Needs Lead"
                    : "Active Work"}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#65706A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 top-8 z-20 w-36 rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-md text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("all");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-[6px] px-2.5 py-1.5 font-medium ${
                      filterType === "all" ? "bg-[#FAF9F5] font-bold text-[#10251F]" : "text-[#65706A] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("lead");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-[6px] px-2.5 py-1.5 font-medium ${
                      filterType === "lead" ? "bg-[#FAF9F5] font-bold text-[#10251F]" : "text-[#65706A] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    With Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("no-lead");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-[6px] px-2.5 py-1.5 font-medium ${
                      filterType === "no-lead" ? "bg-[#FAF9F5] font-bold text-[#10251F]" : "text-[#65706A] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    Needs Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType("active");
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-[6px] px-2.5 py-1.5 font-medium ${
                      filterType === "active" ? "bg-[#FAF9F5] font-bold text-[#10251F]" : "text-[#65706A] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    Active Work
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. TABLE ROW LIST CONTAINER */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          {/* Table Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#D8DDD4] bg-[#FAFAF8] text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
            <div className="col-span-4 whitespace-nowrap">Department</div>
            <div className="col-span-3 whitespace-nowrap">Lead</div>
            <div className="col-span-2 whitespace-nowrap">Members</div>
            <div className="col-span-2 whitespace-nowrap">Active Work</div>
            <div className="col-span-1 text-right whitespace-nowrap">Actions</div>
          </div>

          {/* Department Rows */}
          {filteredDepartments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-[#18221E]">
                No departments match your filter
              </p>
              <p className="mt-1 text-xs text-[#65706A]">
                Try clearing your search query or reset the filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="mt-3 text-xs font-bold text-[#10251F] hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#D8DDD4]/70">
              {filteredDepartments.map((dept) => {
                const colorScheme =
                  dept.colorScheme ||
                  DEFAULT_COLOR_SCHEMES[dept.icon] ||
                  DEFAULT_COLOR_SCHEMES.building;

                const displayAvatars = (dept.members || []).slice(0, 4);
                const remainingCount = Math.max(0, dept.memberCount - displayAvatars.length);
                const isMenuOpen = activeMenuId === dept.id;

                return (
                  <div
                    key={dept.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-[#F7F8F4] transition-colors duration-100"
                  >
                    {/* 1. DEPARTMENT (col-span-4) */}
                    <div className="col-span-4 flex items-center gap-3.5 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] shadow-2xs ${colorScheme.bg} ${colorScheme.text}`}
                      >
                        {renderDepartmentIcon(dept.icon, 20)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/departments/${dept.id}`}
                            className="text-[14px] font-bold text-[#18221E] hover:text-[#10251F] hover:underline truncate block"
                          >
                            {dept.name}
                          </Link>
                          {dept.isMember ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4E2] px-2 py-0.5 text-[10px] font-semibold text-[#246244] shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                              {dept.userRoleInDept === "lead"
                                ? "Lead"
                                : dept.userRoleInDept === "manager"
                                ? "Manager"
                                : "You are a member"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-medium text-[#65706A] shrink-0">
                              Not a member
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#65706A] truncate mt-0.5">
                          {dept.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    {/* 2. LEAD (col-span-3) */}
                    <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                      {dept.leadName ? (
                        <>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[11px] font-bold text-white shadow-2xs">
                            {(dept.leadName?.[0] || "L").toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#18221E] truncate">
                              {dept.leadName}
                            </p>
                            <p className="text-[11px] text-[#65706A] truncate">
                              {dept.leadRole || "Department Lead"}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A]">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#65706A] truncate">No department lead</p>
                            <button
                              type="button"
                              onClick={() => setAssigningLeadDept(dept)}
                              className="text-[11px] font-semibold text-emerald-700 hover:underline block truncate"
                            >
                              Assign lead →
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 3. MEMBERS (col-span-2) */}
                    <div className="col-span-2 min-w-0">
                      <div className="flex items-center -space-x-1.5">
                        {displayAvatars.map((member, i) => (
                          <div
                            key={member.id || i}
                            title={member.name}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white shadow-2xs ${
                              member.bg || "bg-[#10251F]"
                            }`}
                          >
                            {member.initial}
                          </div>
                        ))}
                        {remainingCount > 0 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E7EADF] text-[9px] font-bold text-[#10251F] ring-2 ring-white shadow-2xs">
                            +{remainingCount}
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#65706A] mt-1">
                        {dept.memberCount} members
                      </p>
                    </div>

                    {/* 4. ACTIVE WORK (col-span-2) */}
                    <div className="col-span-2 min-w-0">
                      <p className="font-semibold text-xs text-[#18221E] truncate">
                        {dept.projectCount} projects · {dept.taskCount} tasks
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        <span className="text-[11px] text-[#65706A]">Active</span>
                      </div>
                    </div>

                    {/* 5. ACTIONS (col-span-1) */}
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      <Link
                        href={`/app/departments/${dept.id}`}
                        className="rounded-[6px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#F4F3EE] hover:border-[#B8C0B2] transition-colors duration-150"
                      >
                        Open
                      </Link>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(isMenuOpen ? null : dept.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors focus:outline-none"
                          aria-label="More actions"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-30 w-44 rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-md text-xs">
                            <Link
                              href={`/app/departments/${dept.id}`}
                              onClick={() => setActiveMenuId(null)}
                              className="block rounded-[6px] px-3 py-2 font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
                            >
                              View Details
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setEditingDepartment(dept);
                              }}
                              className="w-full text-left rounded-[6px] px-3 py-2 font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
                            >
                              Edit Department
                            </button>
                            {!dept.leadName && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setAssigningLeadDept(dept);
                                }}
                                className="w-full text-left rounded-[6px] px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                Assign Lead
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingDepartment(dept);
                              }}
                              className="w-full text-left rounded-[6px] px-3 py-2 font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete Department
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Department Modal */}
      <CreateDepartmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
      />

      {/* Edit Department Modal */}
      {editingDepartment && (
        <EditDepartmentModal
          isOpen={Boolean(editingDepartment)}
          onClose={() => setEditingDepartment(null)}
          department={editingDepartment}
        />
      )}

      {/* Delete Department Dialog */}
      {deletingDepartment && (
        <DeleteDepartmentDialog
          isOpen={Boolean(deletingDepartment)}
          onClose={() => setDeletingDepartment(null)}
          departmentId={deletingDepartment.id}
          departmentName={deletingDepartment.name}
          workspaceId={workspaceId}
        />
      )}

      {/* Assign Lead Modal Dialog */}
      {assigningLeadDept && (
        <AssignDepartmentLeadModal
          isOpen={Boolean(assigningLeadDept)}
          onClose={() => setAssigningLeadDept(null)}
          department={assigningLeadDept}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
