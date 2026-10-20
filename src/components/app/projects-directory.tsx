"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { Task } from "@/types/task";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { SearchIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { ProjectDetailsDrawer } from "@/components/app/project-details-drawer";
import { toast } from "sonner";
import {
  deleteProjectAction,
  duplicateProjectAction,
  archiveProjectAction,
  updateProjectAction,
} from "@/lib/project/actions";
import { AppIcon } from "@/components/ui/app-icon";
import { CustomSelect } from "@/components/ui/custom-select";
import { stripHtml, cn } from "@/lib/utils";
import {
  Plus,
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  MoreHorizontal,
  Upload,
  ChevronRight,
  Check,
  CalendarDays,
} from "lucide-react";
import {
  Kbd,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";

export interface ProjectsDirectoryProps {
  workspaceId: string;
  workspaceName?: string;
  projects: Project[];
  departments?: Department[];
  people?: WorkspacePerson[];
  tasks?: Task[];
  userRole?: string;
}

export function ProjectsDirectory({
  workspaceId,
  workspaceName = "brnnd",
  projects = [],
  departments = [],
  people = [],
  tasks = [],
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

  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [nowTimestamp] = React.useState(() => Date.now());
  const [currentDateInfo] = React.useState(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  // Dynamic projects list
  const [localProjects, setLocalProjects] = React.useState<Project[]>(projects);

  React.useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  React.useEffect(() => {
    function handleClickOutside() {
      setActionMenuProjectId(null);
      setHeaderMenuOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Keyboard shortcut: Press 'N' to open New Project modal (when not inside input)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setCreateModalOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExportCsv = () => {
    setHeaderMenuOpen(false);
    const headers = ["ID", "Name", "Department", "Manager", "Status", "Progress", "Due Date"];
    const rows = filteredProjects.map((p) => [
      p.id,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.department_name || "").replace(/"/g, '""')}"`,
      `"${(p.manager_name || "").replace(/"/g, '""')}"`,
      p.status,
      `${p.progress || 0}%`,
      p.due_date || p.deadline || "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `projects-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      const isProjectOverdue =
        (project.due_date || project.deadline) &&
        new Date(project.due_date || project.deadline!).getTime() < nowTimestamp &&
        status !== "completed";

      const matchesStatus =
        selectedStatus === "all"
          ? true
          : selectedStatus === "overdue"
          ? Boolean(isProjectOverdue)
          : status === selectedStatus || (selectedStatus === "in_progress" && status === "active");

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
  }, [localProjects, searchQuery, selectedDepartment, selectedStatus, sortBy, nowTimestamp]);

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
    return due && new Date(due).getTime() < nowTimestamp && p.status !== "completed";
  }).length;
  const thisMonthStat = localProjects.filter((p) => {
    const created = p.created_at ? new Date(p.created_at) : null;
    return created && created.getMonth() === currentDateInfo.month && created.getFullYear() === currentDateInfo.year;
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

  // Date helpers
  const getTodayIso = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };
  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };
  const getNextWeekIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };
  const getEndOfMonthIso = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const formatRelativeTime = (dateStr?: string | null): string => {
    if (!dateStr) return "Recently";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "Recently";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Inline table updates
  const handleUpdateStatus = async (projectId: string, newStatus: string) => {
    setLocalProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus as ProjectStatus } : p))
    );
    try {
      await updateProjectAction({
        projectId,
        workspaceId,
        status: newStatus,
      });
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleUpdateDepartment = async (projectId: string, deptId: string | null) => {
    const dept = departments.find((d) => d.id === deptId);
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              department_id: deptId,
              department_name: dept?.name || null,
              department_color: dept?.color || null,
            }
          : p
      )
    );
    try {
      await updateProjectAction({
        projectId,
        workspaceId,
        departmentId: deptId,
      });
      toast.success(`Department updated to ${dept?.name || "None"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleUpdateManager = async (projectId: string, managerId: string | null) => {
    const manager = people.find((p) => (p.user_id || p.id) === managerId);
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              lead_id: managerId,
              manager_id: managerId,
              manager_name: manager ? (manager.full_name || manager.email) : null,
            }
          : p
      )
    );
    try {
      await updateProjectAction({
        projectId,
        workspaceId,
        leadId: managerId,
      });
      toast.success(`Manager updated to ${manager ? (manager.full_name || manager.email) : "Unassigned"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update manager");
    }
  };

  const handleUpdateDeadline = async (projectId: string, dueDate: string | null) => {
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              due_date: dueDate,
              deadline: dueDate,
            }
          : p
      )
    );
    try {
      await updateProjectAction({
        projectId,
        workspaceId,
        dueDate,
      });
      toast.success("Deadline updated");
      router.refresh();
    } catch {
      toast.error("Failed to update deadline");
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "in_progress":
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
            <Check className="h-2.5 w-2.5 stroke-[2.5]" />
            Completed
          </span>
        );
      case "on_hold":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            On Hold
          </span>
        );
      case "planning":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/70 bg-purple-50/80 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Planning
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/60 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-hover/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
            In Progress
          </span>
        );
    }
  };

  const getDepartmentDotColor = (deptName?: string | null) => {
    if (!deptName) return "bg-emerald-600";
    const lower = deptName.toLowerCase();
    if (lower.includes("dev")) return "bg-emerald-600";
    if (lower.includes("des")) return "bg-amber-500";
    if (lower.includes("video")) return "bg-orange-500";
    if (lower.includes("op")) return "bg-amber-600";
    if (lower.includes("mark")) return "bg-purple-600";
    if (lower.includes("sales")) return "bg-teal-600";
    return "bg-emerald-600";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 text-ink font-sans">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-ink">
            Projects
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {localProjects.length} projects across {departments.length || "all"} departments
            {overdueStat > 0 && (
              <span className="text-status-overdue font-medium ml-1.5">
                · {overdueStat} overdue
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Project Button */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-hover transition-colors shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 stroke-[1.75] text-ink-2" />
            <span>Import Project</span>
          </button>

          {/* + Create Project Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white shadow-xs hover:bg-ink/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2]" />
            <span>New Project</span>
            <Kbd className="bg-white/20 text-white border-transparent text-[10px] ml-1">N</Kbd>
          </button>

          {/* Header Actions Menu (...) */}
          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((prev) => !prev)}
              aria-label="More project actions"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-2 shadow-xs hover:bg-hover hover:text-ink transition-colors",
                headerMenuOpen && "bg-hover text-ink"
              )}
            >
              <MoreHorizontal className="h-4 w-4 stroke-[1.75]" />
            </button>

            {headerMenuOpen && (
              <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-hairline bg-surface p-1 shadow-card text-[12px] text-left">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-ink hover:bg-hover transition-colors flex items-center justify-between"
                >
                  <span>Export CSV</span>
                  <span className="text-[10px] text-ink-3">.csv</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setSelectedStatus("on_hold");
                  }}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-ink hover:bg-hover transition-colors"
                >
                  View Archived
                </button>
                <div className="my-1 border-t border-hairline" />
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    router.refresh();
                  }}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-ink hover:bg-hover transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. UNDERSTATED STAT METRICS (Linear / Craft style, cohesive warm palette) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Projects */}
        <div
          onClick={() => setSelectedStatus("all")}
          className="rounded-xl border border-hairline bg-surface p-3.5 hover:border-ink/20 hover:shadow-xs transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-ink-2">Total Projects</span>
            <FolderKanban className="h-3.5 w-3.5 text-ink-3" />
          </div>
          <div className="text-[22px] font-semibold text-ink tabular-nums leading-tight mb-1">
            {totalProjectsStat}
          </div>
          <p className="text-[11px] text-ink-3">All company projects</p>
        </div>

        {/* Card 2: In Progress */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "in_progress" ? "all" : "in_progress")}
          className={cn(
            "rounded-xl border bg-surface p-3.5 transition-all cursor-pointer select-none",
            selectedStatus === "in_progress"
              ? "border-blue-400 ring-1 ring-blue-400/20 bg-blue-50/20"
              : "border-hairline hover:border-ink/20 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-ink-2">In Progress</span>
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="text-[22px] font-semibold text-ink tabular-nums leading-tight mb-1">
            {inProgressStat}
          </div>
          <p className="text-[11px] text-ink-3">Active projects</p>
        </div>

        {/* Card 3: Completed */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "completed" ? "all" : "completed")}
          className={cn(
            "rounded-xl border bg-surface p-3.5 transition-all cursor-pointer select-none",
            selectedStatus === "completed"
              ? "border-emerald-400 ring-1 ring-emerald-400/20 bg-emerald-50/20"
              : "border-hairline hover:border-ink/20 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-ink-2">Completed</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-[22px] font-semibold text-ink tabular-nums leading-tight mb-1">
            {completedStat}
          </div>
          <p className="text-[11px] text-ink-3">Finished projects</p>
        </div>

        {/* Card 4: Overdue */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === "overdue" ? "all" : "overdue")}
          className={cn(
            "rounded-xl border bg-surface p-3.5 transition-all cursor-pointer select-none",
            selectedStatus === "overdue"
              ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/20"
              : "border-hairline hover:border-ink/20 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-ink-2">Overdue</span>
            <AlertCircle className={cn("h-3.5 w-3.5", overdueStat > 0 ? "text-status-overdue" : "text-ink-3")} />
          </div>
          <div className="text-[22px] font-semibold text-ink tabular-nums leading-tight mb-1">
            {overdueStat}
          </div>
          <div>
            {overdueStat > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-overdue">
                <span className="h-1.5 w-1.5 rounded-full bg-status-overdue animate-pulse" />
                Past due date
              </span>
            ) : (
              <span className="text-[11px] text-ink-3">All on schedule</span>
            )}
          </div>
        </div>

        {/* Card 5: This Month */}
        <div
          className="rounded-xl border border-hairline bg-surface p-3.5 hover:border-ink/20 hover:shadow-xs transition-all select-none"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-ink-2">This Month</span>
            <Calendar className="h-3.5 w-3.5 text-ink-3" />
          </div>
          <div className="text-[22px] font-semibold text-ink tabular-nums leading-tight mb-1">
            {thisMonthStat}
          </div>
          <p className="text-[11px] text-ink-3">New projects added</p>
        </div>
      </div>

      {/* 3. FULL-WIDTH PROJECT WORKSPACE */}
      <div className="space-y-3.5">
        {/* Controls: Segmented View Tabs & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented View Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-hover/80 rounded-xl border border-hairline overflow-x-auto shrink-0">
            {[
              { key: "all", label: "All Projects", count: totalProjectsStat },
              { key: "in_progress", label: "In Progress", count: inProgressStat },
              { key: "completed", label: "Completed", count: completedStat },
              { key: "planning", label: "Planning", count: localProjects.filter((p) => p.status === "planning").length },
            ].map((tab) => {
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatus(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 select-none whitespace-nowrap",
                    isActive
                      ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/[0.04]"
                      : "text-ink-2 hover:text-ink hover:bg-black/[0.03]"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full tabular-nums",
                        isActive ? "bg-hover text-ink font-semibold" : "bg-black/[0.04] text-ink-3"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Filter Controls & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-40 sm:w-52 rounded-lg border border-hairline bg-surface pl-8 pr-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-3 shadow-xs focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Department Dropdown */}
            <CustomSelect
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={departmentOptions}
              placeholder="All Departments"
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

        {/* Projects Table */}
        <div className="rounded-xl border border-hairline bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-hover/40 text-[11px] font-semibold text-ink-2 select-none">
                  <th className="py-2.5 px-4 min-w-[220px]">Project</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Department</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Manager</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Progress</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Status</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Deadline</th>
                  <th className="py-2.5 px-3 min-w-[90px]">Tasks</th>
                  <th className="py-2.5 px-3 min-w-[90px]">Updated</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[13px] text-ink-2">
                      <p className="font-medium text-ink">No projects found</p>
                      <p className="text-[12px] text-ink-3 mt-1">Try clearing your filters or create a new project.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedDepartment("all");
                          setSelectedStatus("all");
                        }}
                        className="mt-3 text-[12px] font-medium text-ink hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => {
                    const status = (project.status === "active" ? "in_progress" : project.status) as ProjectStatus;
                    const projectTasks = (tasks || []).filter((t) => t.project_id === project.id);
                    const totalTasks = projectTasks.length;
                    const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progress ?? 0);
                    const projectDept = departments.find((d) => d.id === project.department_id);
                    const deptName = project.department_name || projectDept?.name || "General";
                    const managerPerson = people.find((p) => (p.user_id || p.id) === (project.lead_id || project.manager_id));
                    const managerName = managerPerson ? (managerPerson.full_name || managerPerson.email) : (project.manager_name || "Unassigned");
                    const deadlineStr = project.deadline || project.due_date;
                    const formattedDeadline = deadlineStr
                      ? new Date(deadlineStr).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No deadline";

                    const isOverdue =
                      deadlineStr &&
                      new Date(deadlineStr).getTime() < Date.now() &&
                      status !== "completed";

                    const updatedRelative = formatRelativeTime(project.updated_at || project.created_at);

                    return (
                      <tr
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="hover:bg-hover/50 transition-colors duration-120 cursor-pointer group"
                      >
                        {/* Project Name + Icon + Subtitle */}
                        <td className="py-3 px-4 max-w-[280px]">
                          <div className="flex items-center gap-3">
                            <div
                              style={{ backgroundColor: project.color || "#10251F" }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-2xs"
                            >
                              {project.icon || (project.name?.[0] || "P").toUpperCase()}
                            </div>
                            <div className="min-w-0 max-w-[220px]">
                              <span className="font-medium text-ink group-hover:underline truncate block text-[13px]">
                                {project.name}
                              </span>
                              {project.description && (
                                <p className="text-[11px] text-ink-3 truncate">
                                  {stripHtml(project.description)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department (Clickable Inline Dropdown) */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-hover/80 border border-hairline/60 hover:bg-hover hover:border-ink/20 transition-colors cursor-pointer text-left focus:outline-none"
                              >
                                <span
                                  className={cn("h-1.5 w-1.5 rounded-full shrink-0", getDepartmentDotColor(deptName))}
                                  style={{ backgroundColor: projectDept?.color || undefined }}
                                />
                                <span className="text-ink-2 text-[11px] font-medium truncate max-w-[100px]">{deptName}</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuLabel>Change Department</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateDepartment(project.id, null)} className="cursor-pointer">
                                <span className="h-1.5 w-1.5 rounded-full bg-ink-3 mr-2" />
                                <span>No department</span>
                              </DropdownMenuItem>
                              {departments.map((d) => (
                                <DropdownMenuItem
                                  key={d.id}
                                  onClick={() => handleUpdateDepartment(project.id, d.id)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color || "#246244" }} />
                                  <span className="truncate">{d.name}</span>
                                  {project.department_id === d.id && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Manager (Clickable Inline Dropdown) */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-2 p-1 -m-1 rounded-md hover:bg-hover transition-colors cursor-pointer text-left focus:outline-none"
                              >
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-medium text-white shadow-2xs">
                                  {managerName[0]?.toUpperCase() || "U"}
                                </div>
                                <span className="text-ink text-[12px] truncate max-w-[110px]">{managerName}</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                              <DropdownMenuLabel>Assign Manager</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateManager(project.id, null)} className="cursor-pointer">
                                Unassigned
                              </DropdownMenuItem>
                              {people.map((p) => {
                                const personId = p.user_id || p.id;
                                const personName = p.full_name || p.email;
                                const isSelected = project.lead_id === personId || project.manager_id === personId;
                                return (
                                  <DropdownMenuItem
                                    key={personId}
                                    onClick={() => handleUpdateManager(project.id, personId)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">
                                      {personName[0].toUpperCase()}
                                    </div>
                                    <span className="truncate">{personName}</span>
                                    {isSelected && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-ink tabular-nums">{progress}%</span>
                            </div>
                            <div className="h-1.5 w-20 rounded-full bg-hover overflow-hidden">
                              <div
                                style={{ width: `${progress}%` }}
                                className="h-full bg-ink rounded-full transition-all"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status (Clickable Inline Dropdown) */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center p-1 -m-1 rounded hover:bg-hover transition-colors cursor-pointer focus:outline-none"
                              >
                                {getStatusBadge(status)}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              <DropdownMenuLabel>Project Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {[
                                { key: "planning", label: "Planning", dot: "bg-purple-600" },
                                { key: "in_progress", label: "In Progress", dot: "bg-blue-600" },
                                { key: "completed", label: "Completed", dot: "bg-emerald-600" },
                                { key: "on_hold", label: "On Hold", dot: "bg-amber-600" },
                                { key: "cancelled", label: "Cancelled", dot: "bg-rose-600" },
                              ].map((cfg) => (
                                <DropdownMenuItem
                                  key={cfg.key}
                                  onClick={() => handleUpdateStatus(project.id, cfg.key)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                                  <span>{cfg.label}</span>
                                  {status === cfg.key && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Deadline (Clickable Inline Dropdown) */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center gap-1.5 text-[12px] tabular-nums p-1 -m-1 rounded hover:bg-hover transition-colors cursor-pointer focus:outline-none",
                                  isOverdue ? "text-status-overdue font-medium" : "text-ink-2"
                                )}
                              >
                                <CalendarDays className="h-3.5 w-3.5 stroke-[1.5] text-ink-3 shrink-0" />
                                <span>{formattedDeadline}</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                              <DropdownMenuLabel>Set Deadline</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateDeadline(project.id, null)} className="cursor-pointer">
                                No deadline
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDeadline(project.id, getTodayIso())} className="cursor-pointer">
                                Today
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDeadline(project.id, getTomorrowIso())} className="cursor-pointer">
                                Tomorrow
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDeadline(project.id, getNextWeekIso())} className="cursor-pointer">
                                Next week
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDeadline(project.id, getEndOfMonthIso())} className="cursor-pointer">
                                End of month
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        {/* Tasks */}
                        <td className="py-3 px-3 text-ink-2 whitespace-nowrap font-medium text-[12px] tabular-nums">
                          {completedTasks} / {totalTasks}
                        </td>

                        {/* Updated */}
                        <td className="py-3 px-3 text-ink-3 whitespace-nowrap text-[12px]">
                          {updatedRelative}
                        </td>

                        {/* Actions (Three-dot Menu) */}
                        <td className="py-3 px-3 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuProjectId(
                                  actionMenuProjectId === project.id ? null : project.id
                                );
                              }}
                              className="p-1 rounded-lg text-ink-3 hover:bg-hover hover:text-ink transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 stroke-[1.75]" />
                            </button>

                            {actionMenuProjectId === project.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-36 rounded-xl border border-hairline bg-surface p-1 shadow-card text-[12px] text-left"
                              >
                                <Link
                                  href={`/app/projects/${project.id}`}
                                  className="block rounded-lg px-2.5 py-1 text-ink hover:bg-hover transition-colors"
                                >
                                  Open Project
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    handleDuplicate(project.id);
                                  }}
                                  className="w-full text-left rounded-lg px-2.5 py-1 text-ink hover:bg-hover transition-colors"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    handleArchive(project.id);
                                  }}
                                  className="w-full text-left rounded-lg px-2.5 py-1 text-ink hover:bg-hover transition-colors"
                                >
                                  Archive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuProjectId(null);
                                    setDeleteConfirmId(project.id);
                                  }}
                                  className="w-full text-left rounded-lg px-2.5 py-1 text-red-600 hover:bg-red-50 transition-colors"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-hairline text-[12px] text-ink-2 bg-hover/20">
            <span>
              Showing 1 to {paginatedProjects.length} of {totalCount} projects
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-ink hover:bg-hover disabled:opacity-40 transition-colors"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-medium transition-colors",
                    currentPage === i + 1
                      ? "bg-ink text-white shadow-2xs"
                      : "border border-hairline bg-surface text-ink hover:bg-hover"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-ink hover:bg-hover disabled:opacity-40 transition-colors"
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

      {/* ── PROJECT DETAILS DRAWER (Smooth like Framer) ───────────────── */}
      <ProjectDetailsDrawer
        project={selectedProject}
        workspaceId={workspaceId}
        departments={departments}
        people={people}
        tasks={tasks}
        onClose={() => setSelectedProject(null)}
        onProjectUpdated={(updated) => {
          setSelectedProject(updated);
          setLocalProjects((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
        onDeleteProject={(id) => {
          setSelectedProject(null);
          setLocalProjects((prev) => prev.filter((p) => p.id !== id));
        }}
      />
    </div>
  );
}
