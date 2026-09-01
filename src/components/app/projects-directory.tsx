"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { SearchIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { ProjectDetailModal } from "@/components/app/project-detail-modal";
import {
  deleteProjectAction,
  duplicateProjectAction,
  archiveProjectAction,
} from "@/lib/project/actions";
import { AppIcon } from "@/components/ui/app-icon";
import { CustomSelect } from "@/components/ui/custom-select";

export interface ProjectsDirectoryProps {
  workspaceId: string;
  workspaceName?: string;
  projects: Project[];
  departments?: Department[];
  people?: WorkspacePerson[];
  userRole?: string;
}

export function ProjectsDirectory({
  workspaceId,
  workspaceName = "brnnd",
  projects = [],
  departments = [],
  people = [],
  userRole = "owner",
}: ProjectsDirectoryProps) {
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("recent");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [actionMenuProjectId, setActionMenuProjectId] = React.useState<string | null>(null);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  // Dynamic projects list
  const [localProjects, setLocalProjects] = React.useState<Project[]>(projects);

  React.useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  React.useEffect(() => {
    function handleClickOutside() {
      setActionMenuProjectId(null);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Dropdown options
  const departmentOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Departments" },
      ...(departments || []).map((d) => ({
        value: d.id,
        label: d.name,
        dotColor: d.color,
      })),
    ];
  }, [departments]);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "in_progress", label: "In Progress", dotColor: "#246244" },
    { value: "completed", label: "Completed", dotColor: "#10251F" },
    { value: "on_hold", label: "On Hold", dotColor: "#D97706" },
    { value: "planning", label: "Planning", dotColor: "#2563EB" },
    { value: "cancelled", label: "Cancelled", dotColor: "#E11D48" },
  ];

  const sortOptions = [
    { value: "recent", label: "Recently Updated" },
    { value: "name", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    { value: "progress", label: "Progress" },
    { value: "deadline", label: "Deadline" },
  ];

  // Filter & Sort Logic
  const filteredProjects = React.useMemo(() => {
    let result = localProjects.filter((project) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        project.name.toLowerCase().includes(q) ||
        (project.description && project.description.toLowerCase().includes(q)) ||
        (project.client_name && project.client_name.toLowerCase().includes(q)) ||
        (project.manager_name && project.manager_name.toLowerCase().includes(q));

      const matchesDept =
        selectedDepartment === "all" ||
        project.department_id === selectedDepartment ||
        (project.department_name && project.department_name.toLowerCase() === selectedDepartment.toLowerCase());

      const status = project.status;
      const matchesStatus =
        selectedStatus === "all" ||
        status === selectedStatus ||
        (selectedStatus === "in_progress" && status === "active");

      return matchesSearch && matchesDept && matchesStatus;
    });

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "progress") {
      result = [...result].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else if (sortBy === "deadline") {
      result = [...result].sort(
        (a, b) =>
          new Date(a.due_date || a.deadline || 0).getTime() -
          new Date(b.due_date || b.deadline || 0).getTime()
      );
    } else {
      result = [...result].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
    }

    return result;
  }, [localProjects, searchQuery, selectedDepartment, selectedStatus, sortBy]);

  // Pagination (8 items per page)
  const pageSize = 8;
  const totalCount = filteredProjects.length;
  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Statistics calculation (100% Real Database Data)
  const totalProjectsStat = localProjects.length;
  const inProgressStat = localProjects.filter(
    (p) => p.status === "in_progress" || p.status === "active"
  ).length;
  const completedStat = localProjects.filter((p) => p.status === "completed").length;
  const overdueStat = localProjects.filter((p) => {
    const due = p.due_date || p.deadline;
    return due && new Date(due).getTime() < Date.now() && p.status !== "completed";
  }).length;
  const thisMonthStat = localProjects.filter((p) => {
    const created = p.created_at ? new Date(p.created_at) : null;
    const now = new Date();
    return created && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Actions
  const handleDuplicate = async (projectId: string) => {
    try {
      const res = await duplicateProjectAction(projectId, workspaceId);
      if (res.success && res.project) {
        setLocalProjects((prev) => [res.project!, ...prev]);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (projectId: string) => {
    try {
      await archiveProjectAction(projectId, workspaceId);
      setLocalProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: "on_hold" } : p))
      );
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProjectAction(projectId, workspaceId);
      setLocalProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteConfirmId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "in_progress":
      case "active":
        return (
          <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
            Completed
          </span>
        );
      case "on_hold":
        return (
          <span className="rounded-full bg-[#FEF6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#B58500]">
            On Hold
          </span>
        );
      case "planning":
        return (
          <span className="rounded-full bg-[#F0F9FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0284C7]">
            Planning
          </span>
        );
      case "cancelled":
        return (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#65706A]">
            In Progress
          </span>
        );
    }
  };

  const getDepartmentDotColor = (deptName?: string | null) => {
    if (!deptName) return "bg-[#246244]";
    const lower = deptName.toLowerCase();
    if (lower.includes("dev")) return "bg-[#246244]";
    if (lower.includes("des")) return "bg-[#B58500]";
    if (lower.includes("video")) return "bg-[#C2410C]";
    if (lower.includes("op")) return "bg-[#D97706]";
    if (lower.includes("mark")) return "bg-[#7E22CE]";
    if (lower.includes("sales")) return "bg-[#059669]";
    return "bg-[#246244]";
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-7 pb-24 text-[#18221E]">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            Projects
          </h1>
          <p className="mt-1 text-xs text-[#65706A]">
            Track and manage all company projects in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Secondary Button: Import Project */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors"
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Import Project</span>
          </button>

          {/* Primary Button: + Create Project */}
          <PrimaryButton size="sm" onClick={() => setCreateModalOpen(true)}>
            + Create Project
          </PrimaryButton>

          {/* Three-dot overflow button */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#65706A] shadow-2xs hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
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
        </div>
      </div>

      {/* 3. PROJECT STATISTICS (5 Equal Summary Cards in One Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: TOTAL PROJECTS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF4E2] text-[#246244]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Total Projects
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {totalProjectsStat}
            </p>
            <p className="text-[11px] text-[#65706A]">All projects</p>
          </div>
        </div>

        {/* Card 2: IN PROGRESS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF6E4] text-[#B58500]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              In Progress
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {inProgressStat}
            </p>
            <p className="text-[11px] text-[#65706A]">Active projects</p>
          </div>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F0F9FF] text-[#0284C7]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Completed
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {completedStat}
            </p>
            <p className="text-[11px] text-[#65706A]">Finished projects</p>
          </div>
        </div>

        {/* Card 4: OVERDUE */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F3E8FF] text-[#7E22CE]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Overdue
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {overdueStat}
            </p>
            <p className="text-[11px] text-[#65706A]">Past due date</p>
          </div>
        </div>

        {/* Card 5: THIS MONTH */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEE2E2] text-[#DC2626]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              This Month
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {thisMonthStat}
            </p>
            <p className="text-[11px] text-[#65706A]">New projects</p>
          </div>
        </div>
      </div>

      {/* 4. PROJECT FILTER AREA & TABLE CONTAINER */}
      <div className="space-y-4">
        {/* Toolbar: Search on Left, Filters on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Search & Filter Popover */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#65706A]">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name, client, or manager..."
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-3.5 py-1.5 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5]"
            >
              <span>Filter</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>

          {/* Right: Department, Status, Sort Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Department Dropdown */}
            <CustomSelect
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={departmentOptions}
              placeholder="All Departments"
            />

            {/* Status Dropdown */}
            <CustomSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              placeholder="All Statuses"
            />

            {/* Sort Dropdown */}
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              prefix="Sort"
            />
          </div>
        </div>

        {/* 5. PROJECTS TABLE */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5]/70 text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  <th className="py-3.5 px-4 min-w-[220px]">Project</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Department</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Manager</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Progress</th>
                  <th className="py-3.5 px-3 min-w-[110px]">Status</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Deadline</th>
                  <th className="py-3.5 px-3 min-w-[90px]">Tasks</th>
                  <th className="py-3.5 px-3 min-w-[90px]">Updated</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DDD4]/60">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-[#65706A]">
                      <p className="font-semibold text-[#18221E]">No projects found</p>
                      <p className="mt-1">Try clearing your filters or create a new project.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedDepartment("all");
                          setSelectedStatus("all");
                        }}
                        className="mt-3 text-xs font-bold text-[#10251F] hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => {
                    const status = (project.status === "active" ? "in_progress" : project.status) as ProjectStatus;
                    const progress = project.progress ?? 50;
                    const completedTasks = project.completed_tasks ?? 10;
                    const totalTasks = project.total_tasks ?? 16;
                    const deptName = project.department_name || "Development";
                    const managerName = project.manager_name || "Tashin Khan";
                    const deadlineStr = project.deadline || project.due_date;
                    const formattedDeadline = deadlineStr
                      ? new Date(deadlineStr).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Aug 30, 2026";

                    const isOverdue =
                      deadlineStr &&
                      new Date(deadlineStr) < new Date() &&
                      status !== "completed";

                    return (
                      <tr
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="hover:bg-[#FAF9F5]/70 transition-colors cursor-pointer group"
                      >
                        {/* Project Name + Icon + Subtitle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              style={{ backgroundColor: project.color || "#10251F" }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-xs font-bold text-white shadow-2xs"
                            >
                              {project.icon || (project.name?.[0] || "P").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[#18221E] group-hover:text-[#10251F] group-hover:underline truncate block text-xs">
                                {project.name}
                              </span>
                              <p className="text-[11px] text-[#65706A] truncate">
                                {project.description || "Internal company operating system"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${getDepartmentDotColor(
                                deptName
                              )}`}
                            />
                            <span className="text-[#18221E] truncate">{deptName}</span>
                          </div>
                        </td>

                        {/* Manager */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-white shadow-2xs">
                              {managerName[0]}
                            </div>
                            <span className="text-[#18221E] truncate">{managerName}</span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#18221E]">{progress}%</span>
                            </div>
                            <div className="h-1.5 w-20 rounded-full bg-[#E7EADF] overflow-hidden">
                              <div
                                style={{ width: `${progress}%` }}
                                className="h-full bg-[#246244] rounded-full"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {getStatusBadge(status)}
                        </td>

                        {/* Deadline */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div
                            className={`flex items-center gap-1.5 ${
                              isOverdue ? "text-red-700 font-bold" : "text-[#18221E]"
                            }`}
                          >
                            <AppIcon name="calendar" size={12} className="text-[#65706A]" />
                            <span>{formattedDeadline}</span>
                          </div>
                        </td>

                        {/* Tasks */}
                        <td className="py-3.5 px-3 text-[#18221E] whitespace-nowrap font-medium">
                          {completedTasks} / {totalTasks}
                        </td>

                        {/* Updated */}
                        <td className="py-3.5 px-3 text-[#65706A] whitespace-nowrap">
                          2h ago
                        </td>

                        {/* Actions (Three-dot Menu) */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuProjectId(
                                  actionMenuProjectId === project.id ? null : project.id
                                );
                              }}
                              className="p-1 rounded text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>

                            {actionMenuProjectId === project.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-36 rounded-[8px] border border-[#D8DDD4] bg-white p-1 shadow-md text-xs text-left"
                              >
                                <Link
                                  href={`/app/projects/${project.id}`}
                                  className="block rounded px-2.5 py-1 text-[#18221E] hover:bg-[#FAF9F5]"
                                >
                                  Open Project
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    handleDuplicate(project.id);
                                  }}
                                  className="w-full text-left rounded px-2.5 py-1 text-[#18221E] hover:bg-[#FAF9F5]"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    handleArchive(project.id);
                                  }}
                                  className="w-full text-left rounded px-2.5 py-1 text-[#18221E] hover:bg-[#FAF9F5]"
                                >
                                  Archive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    setDeleteConfirmId(project.id);
                                  }}
                                  className="w-full text-left rounded px-2.5 py-1 text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
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
          <div className="flex items-center justify-between p-3.5 border-t border-[#D8DDD4] text-xs text-[#65706A] bg-[#FAF9F5]/40">
            <span>
              Showing 1 to {paginatedProjects.length} of {totalCount} projects
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-xs font-semibold ${
                    currentPage === i + 1
                      ? "bg-[#10251F] text-white shadow-2xs"
                      : "border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        departments={departments}
        people={people}
        onProjectCreated={(newProj) => {
          setLocalProjects((prev) => [newProj, ...prev]);
        }}
        onSuccess={() => router.refresh()}
      />

      {/* Import Project Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <h3 className="text-base font-bold text-[#18221E]">Import Projects</h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#65706A]">
              Upload a CSV, Jira export, Linear backup, or JSON file to import your existing projects and task roadmaps.
            </p>

            <div className="border-2 border-dashed border-[#D8DDD4] rounded-[10px] p-6 text-center space-y-2 bg-[#FAF9F5]">
              <div className="flex justify-center text-[#65706A]">
                <AppIcon name="upload" size={24} />
              </div>
              <p className="text-xs font-semibold text-[#18221E]">
                Drop project files here or browse
              </p>
              <p className="text-[10px] text-[#65706A]">
                Supports .csv, .json, .xlsx up to 25MB
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#65706A] font-semibold"
              >
                Cancel
              </button>
              <PrimaryButton
                size="sm"
                onClick={() => {
                  setImportModalOpen(false);
                }}
              >
                Upload & Import
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-[#18221E]">Delete Project?</h3>
            <p className="text-xs text-[#65706A] leading-relaxed">
              Are you sure you want to delete this project? This action cannot be undone and will remove all associated boards and deliverables.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#65706A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-[8px] bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECT DETAIL MODAL POPUP (CLICKUP EXPERIENCE) ───────────────── */}
      <ProjectDetailModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        workspace={{ id: workspaceId, name: workspaceName, slug: workspaceName } as any}
        people={people}
        departments={departments}
      />
    </div>
  );
}
