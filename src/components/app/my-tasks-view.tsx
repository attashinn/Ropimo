"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategorizedTasks, Task, TaskPriority, TaskStatus } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { updateTaskAction, deleteTaskAction } from "@/lib/task/actions";
import { AppIcon } from "@/components/ui/app-icon";

export interface MyTasksViewProps {
  workspaceId: string;
  workspaceName?: string;
  currentUserId: string;
  categorized?: CategorizedTasks;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

interface DisplayTaskItem {
  id: string;
  title: string;
  description?: string;
  project: { name: string; icon: string; color: string };
  departmentName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTimeText: string;
  dueCategory: "today" | "week" | "later";
  assignee: { name: string; initial: string; bg?: string };
  completed: boolean;
  order: number;
}

type GroupByOption = "due_date" | "project" | "priority" | "status" | "assignee";

const INITIAL_DEMO_TASKS: DisplayTaskItem[] = [
  {
    id: "task-1",
    title: "Fix authentication bug",
    description: "Resolve login issue on mobile",
    project: { name: "Ropimo Platform", icon: "R", color: "#10251F" },
    departmentName: "Development",
    priority: "high",
    status: "in_progress",
    dueTimeText: "Today 10:00 AM",
    dueCategory: "today",
    assignee: { name: "Tashin Khan", initial: "T", bg: "bg-[#10251F]" },
    completed: false,
    order: 1,
  },
  {
    id: "task-2",
    title: "Review homepage PR",
    description: "Check and approve the latest changes",
    project: { name: "Muntajar Website", icon: "M", color: "#EA580C" },
    departmentName: "Design",
    priority: "medium",
    status: "in_progress",
    dueTimeText: "Today 11:30 AM",
    dueCategory: "today",
    assignee: { name: "Sarah Ahmed", initial: "S", bg: "bg-[#246244]" },
    completed: false,
    order: 2,
  },
  {
    id: "task-3",
    title: "Implement API pagination",
    description: "Add pagination to improve API performance",
    project: { name: "Client Dashboard", icon: "C", color: "#1E293B" },
    departmentName: "Development",
    priority: "medium",
    status: "todo",
    dueTimeText: "Tomorrow 02:00 PM",
    dueCategory: "week",
    assignee: { name: "Arafath Hossain", initial: "A", bg: "bg-[#1E293B]" },
    completed: false,
    order: 3,
  },
  {
    id: "task-4",
    title: "Deploy new update to staging",
    description: "Push and verify the latest build",
    project: { name: "Ropimo Platform", icon: "R", color: "#10251F" },
    departmentName: "Development",
    priority: "low",
    status: "todo",
    dueTimeText: "Apr 26, 2026 04:30 PM",
    dueCategory: "week",
    assignee: { name: "Fatema Islam", initial: "F", bg: "bg-[#DB2777]" },
    completed: false,
    order: 4,
  },
  {
    id: "task-5",
    title: "Design settings page UI",
    description: "Create responsive settings page",
    project: { name: "Muntajar Website", icon: "M", color: "#EA580C" },
    departmentName: "Design",
    priority: "medium",
    status: "in_progress",
    dueTimeText: "Apr 27, 2026 03:00 PM",
    dueCategory: "week",
    assignee: { name: "Sarah Ahmed", initial: "S", bg: "bg-[#246244]" },
    completed: false,
    order: 5,
  },
  {
    id: "task-6",
    title: "Write API documentation",
    description: "Document all authentication endpoints",
    project: { name: "Client Dashboard", icon: "C", color: "#1E293B" },
    departmentName: "Development",
    priority: "low",
    status: "todo",
    dueTimeText: "Apr 30, 2026 01:00 PM",
    dueCategory: "later",
    assignee: { name: "Rahim Hasan", initial: "R", bg: "bg-[#B58500]" },
    completed: false,
    order: 6,
  },
];

export function MyTasksView({
  workspaceId,
  workspaceName = "brnnd",
  currentUserId,
  categorized,
  people = [],
  projects = [],
  departments = [],
}: MyTasksViewProps) {
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = React.useState<"all" | "my" | "created" | "watching">("all");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [selectedDueDate, setSelectedDueDate] = React.useState<string>("this_week");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [groupBy, setGroupBy] = React.useState<GroupByOption>("due_date");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [organizerModalOpen, setOrganizerModalOpen] = React.useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = React.useState<DisplayTaskItem | null>(null);
  const [taskDetailTab, setTaskDetailTab] = React.useState<"overview" | "subtasks" | "activity" | "attachments" | "notes">("overview");
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);
  const [actionMenuTaskId, setActionMenuTaskId] = React.useState<string | null>(null);

  // Group collapsing
  const [collapsedGroups, setCollapsedGroups] = React.useState<{ [key: string]: boolean }>({});

  // Tasks list
  const [localTasks, setLocalTasks] = React.useState<DisplayTaskItem[]>(INITIAL_DEMO_TASKS);

  React.useEffect(() => {
    function handleClickOutside() {
      setActionMenuTaskId(null);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Toggle single task completion
  const handleToggleTask = async (task: DisplayTaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextCompleted = !task.completed;
    const nextStatus: TaskStatus = nextCompleted ? "completed" : "in_progress";

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted, status: nextStatus } : t))
    );

    try {
      await updateTaskAction({
        taskId: task.id,
        workspaceId,
        status: nextStatus,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleToggleSelect = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkComplete = () => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        selectedTaskIds.includes(t.id) ? { ...t, completed: true, status: "completed" } : t
      )
    );
    setSelectedTaskIds([]);
  };

  const handleBulkDelete = () => {
    setLocalTasks((prev) => prev.filter((t) => !selectedTaskIds.includes(t.id)));
    setSelectedTaskIds([]);
  };

  // Filtering
  const filteredTasks = React.useMemo(() => {
    return localTasks.filter((task) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        task.project.name.toLowerCase().includes(q) ||
        task.assignee.name.toLowerCase().includes(q);

      const matchesProject =
        selectedProject === "all" ||
        task.project.name.toLowerCase() === selectedProject.toLowerCase();

      const matchesStatus =
        selectedStatus === "all" ||
        task.status === selectedStatus ||
        (selectedStatus === "completed" && task.completed);

      const matchesPriority =
        selectedPriority === "all" || task.priority === selectedPriority;

      return matchesSearch && matchesProject && matchesStatus && matchesPriority;
    });
  }, [localTasks, searchQuery, selectedProject, selectedStatus, selectedPriority]);

  // Grouped task computation
  const taskGroups = React.useMemo(() => {
    if (groupBy === "due_date") {
      return [
        {
          key: "today",
          label: "Due Today",
          count: filteredTasks.filter((t) => t.dueCategory === "today").length,
          color: "bg-red-600",
          tasks: filteredTasks.filter((t) => t.dueCategory === "today"),
        },
        {
          key: "week",
          label: "Due This Week",
          count: filteredTasks.filter((t) => t.dueCategory === "week").length,
          color: "bg-amber-500",
          tasks: filteredTasks.filter((t) => t.dueCategory === "week"),
        },
        {
          key: "later",
          label: "Later",
          count: 19,
          color: "bg-[#65706A]",
          tasks: filteredTasks.filter((t) => t.dueCategory === "later"),
        },
      ];
    }

    if (groupBy === "project") {
      const projectNames = Array.from(new Set(filteredTasks.map((t) => t.project.name)));
      return projectNames.map((pName) => ({
        key: pName,
        label: pName,
        count: filteredTasks.filter((t) => t.project.name === pName).length,
        color: "bg-[#246244]",
        tasks: filteredTasks.filter((t) => t.project.name === pName),
      }));
    }

    if (groupBy === "priority") {
      return [
        {
          key: "high",
          label: "High Priority",
          count: filteredTasks.filter((t) => t.priority === "high" || t.priority === "urgent").length,
          color: "bg-red-600",
          tasks: filteredTasks.filter((t) => t.priority === "high" || t.priority === "urgent"),
        },
        {
          key: "medium",
          label: "Medium Priority",
          count: filteredTasks.filter((t) => t.priority === "medium").length,
          color: "bg-amber-500",
          tasks: filteredTasks.filter((t) => t.priority === "medium"),
        },
        {
          key: "low",
          label: "Low Priority",
          count: filteredTasks.filter((t) => t.priority === "low").length,
          color: "bg-emerald-600",
          tasks: filteredTasks.filter((t) => t.priority === "low"),
        },
      ];
    }

    // Default by status
    return [
      {
        key: "in_progress",
        label: "In Progress",
        count: filteredTasks.filter((t) => t.status === "in_progress" && !t.completed).length,
        color: "bg-blue-600",
        tasks: filteredTasks.filter((t) => t.status === "in_progress" && !t.completed),
      },
      {
        key: "todo",
        label: "To Do",
        count: filteredTasks.filter((t) => t.status === "todo" && !t.completed).length,
        color: "bg-[#65706A]",
        tasks: filteredTasks.filter((t) => t.status === "todo" && !t.completed),
      },
      {
        key: "completed",
        label: "Completed",
        count: filteredTasks.filter((t) => t.completed || t.status === "completed").length,
        color: "bg-[#246244]",
        tasks: filteredTasks.filter((t) => t.completed || t.status === "completed"),
      },
    ];
  }, [filteredTasks, groupBy]);

  // Summary counts
  const totalTasksCount = 24;
  const inProgressCount = 8;
  const completedCount = 12;
  const overdueCount = 3;
  const todayCount = 5;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
      case "high":
        return (
          <span className="inline-flex rounded-[6px] border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex rounded-[6px] border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="inline-flex rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A]">
            No Priority
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus, completed?: boolean) => {
    if (completed || status === "completed") {
      return (
        <span className="inline-flex rounded-[6px] bg-[#EAF4E2] px-2 py-0.5 text-[10px] font-semibold text-[#246244]">
          Completed
        </span>
      );
    }
    if (status === "in_progress") {
      return (
        <span className="inline-flex rounded-[6px] bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A]">
        To Do
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-7 pb-24 text-[#18221E]">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            My Tasks
          </h1>
          <p className="mt-1 text-xs text-[#65706A]">
            View and manage all your tasks across projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* + Add Task Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors"
          >
            <span>+</span>
            <span>Add Task</span>
          </button>

          {/* Organizer / Filters Button */}
          <button
            type="button"
            onClick={() => setOrganizerModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters & Organizer</span>
          </button>

          {/* Three-dot overflow button */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#65706A] shadow-2xs hover:bg-[#FAF9F5] hover:text-[#18221E]"
          >
            •••
          </button>
        </div>
      </div>

      {/* 3. TASK SUMMARY CARDS (5 Horizontal Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: TOTAL TASKS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF4E2] text-[#246244]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Total Tasks
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {totalTasksCount}
            </p>
            <p className="text-[11px] text-[#65706A]">All assigned tasks</p>
          </div>
        </div>

        {/* Card 2: IN PROGRESS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF6E4] text-[#B58500]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              In Progress
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {inProgressCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks in progress</p>
          </div>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F3E8FF] text-[#7E22CE]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <polyline points="9 11 12 14 20 6" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Completed
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {completedCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks completed</p>
          </div>
        </div>

        {/* Card 4: OVERDUE */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEE2E2] text-[#DC2626]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Overdue
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {overdueCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks past due</p>
          </div>
        </div>

        {/* Card 5: TODAY */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F0F9FF] text-[#0284C7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Today
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {todayCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks due today</p>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE AREA (Split Layout: Left Table ~70% + Right Sidebar ~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MAIN TASK TABLE (~70% = 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Filter / Tab Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 shrink-0">
              {[
                { key: "all", label: "All Tasks" },
                { key: "my", label: "My Tasks" },
                { key: "created", label: "Created by Me" },
                { key: "watching", label: "Watching" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#10251F] text-white shadow-2xs"
                      : "bg-white border border-[#D8DDD4] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Projects</option>
                <option value="Ropimo Platform">Ropimo Platform</option>
                <option value="Muntajar Website">Muntajar Website</option>
                <option value="Client Dashboard">Client Dashboard</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="todo">To Do</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedDueDate}
                onChange={(e) => setSelectedDueDate(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="this_week">Due Date: This Week</option>
                <option value="today">Due Today</option>
                <option value="all">All Due Dates</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-32 sm:w-36 rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-[11px] text-[#18221E] placeholder:text-[#65706A]/60 shadow-2xs focus:border-[#10251F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedTaskIds.length > 0 && (
            <div className="flex items-center justify-between rounded-[10px] bg-[#10251F] px-4 py-2 text-xs text-white shadow-md animate-in fade-in">
              <span className="font-semibold">
                {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkComplete}
                  className="rounded bg-white/10 px-2.5 py-1 hover:bg-white/20 font-semibold"
                >
                  Mark Complete
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="rounded bg-red-500/80 px-2.5 py-1 hover:bg-red-500 font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-white/70 hover:text-white ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Main Tasks Table with Perfect Proportions */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed text-xs">
              <thead>
                <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5]/70 text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  <th className="py-3 px-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2 w-[34%]">Task</th>
                  <th className="py-3 px-2 w-[18%]">Project ▾</th>
                  <th className="py-3 px-2 w-[11%]">Priority</th>
                  <th className="py-3 px-2 w-[13%]">Status</th>
                  <th className="py-3 px-2 w-[16%]">Due Date</th>
                  <th className="py-3 px-1 w-[8%] text-center">Assignee</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#D8DDD4]/60">
                {taskGroups.map((group) => {
                  if (group.tasks.length === 0 && group.count === 0) return null;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Header */}
                      <tr
                        onClick={() => toggleGroup(group.key)}
                        className="bg-[#FAF9F5]/50 hover:bg-[#FAF9F5] cursor-pointer"
                      >
                        <td colSpan={7} className="py-2.5 px-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#18221E]">
                            <span className="text-[10px] text-[#65706A]">
                              {collapsedGroups[group.key] ? "▶" : "▼"}
                            </span>
                            <span className={`h-2 w-2 rounded-full ${group.color}`} />
                            <span>
                              {group.label} ({group.count || group.tasks.length})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Group Task Rows */}
                      {!collapsedGroups[group.key] &&
                        group.tasks.map((task) => (
                          <tr
                            key={task.id}
                            onClick={() => setSelectedTaskDetails(task)}
                            className={`hover:bg-[#FAF9F5]/70 transition-colors cursor-pointer ${
                              selectedTaskIds.includes(task.id) ? "bg-[#F4F7EF]" : ""
                            }`}
                          >
                            <td className="py-3 px-2.5" onClick={(e) => handleToggleSelect(task.id, e)}>
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={(e) => handleToggleTask(task, e as any)}
                                className="h-4 w-4 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-2 min-w-0">
                              <p
                                className={`font-semibold text-xs text-[#18221E] truncate ${
                                  task.completed ? "line-through text-[#65706A]" : ""
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-[11px] text-[#65706A] mt-0.5 truncate">
                                  {task.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-2 min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <div
                                  style={{ backgroundColor: task.project.color }}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold text-white shadow-2xs"
                                >
                                  {task.project.icon}
                                </div>
                                <span className="font-medium text-[#18221E] text-xs truncate">
                                  {task.project.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2">{getPriorityBadge(task.priority)}</td>
                            <td className="py-3 px-2">{getStatusBadge(task.status, task.completed)}</td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <div
                                className={`flex items-center gap-1.5 text-xs ${
                                  task.dueCategory === "today"
                                    ? "font-semibold text-red-600"
                                    : "text-[#18221E]"
                                }`}
                              >
                                <AppIcon name="calendar" size={12} className="text-[#65706A]" />
                                <span className="truncate">{task.dueTimeText}</span>
                              </div>
                            </td>
                            <td className="py-3 px-1 text-center">
                              <div
                                title={task.assignee.name}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${task.assignee.bg}`}
                              >
                                {task.assignee.initial}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-3.5 border-t border-[#D8DDD4] text-xs text-[#65706A] bg-[#FAF9F5]/40">
              <span>Showing 1 to 5 of 24 tasks</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-40"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#10251F] text-xs font-semibold text-white shadow-2xs"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(3)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  3
                </button>
                <span className="px-1 text-[#65706A]">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(5)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(5, currentPage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 STACKED PANELS (~30% = 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* PANEL 1: TODAY'S SCHEDULE */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]/80">
              <h3 className="text-sm font-bold text-[#18221E]">Today's Schedule</h3>
              <Link href="/app/calendar" className="text-xs font-semibold text-[#18221E] hover:underline">
                View Calendar →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { time: "10:00 AM", color: "bg-red-500", title: "Fix authentication bug", project: "Ropimo Platform" },
                { time: "11:30 AM", color: "bg-red-500", title: "Review homepage PR", project: "Muntajar Website" },
                { time: "02:00 PM", color: "bg-blue-500", title: "Implement API pagination", project: "Client Dashboard" },
                { time: "04:30 PM", color: "bg-blue-500", title: "Deploy new update", project: "Ropimo Platform" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-1.5 rounded-[6px] hover:bg-[#FAF9F5] transition-colors">
                  <span className="font-semibold text-[#65706A] w-16 shrink-0">{item.time}</span>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#18221E] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#65706A] truncate">{item.project}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL 2: TASKS BY PRIORITY (Donut Chart) */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#18221E]">Tasks by Priority</h3>

            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Donut Chart SVG */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  {/* High (21% - red) */}
                  <path
                    className="text-red-500"
                    strokeDasharray="21, 100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Medium (42% - amber) */}
                  <path
                    className="text-amber-500"
                    strokeDasharray="42, 100"
                    strokeDashoffset="-21"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Low (25% - green) */}
                  <path
                    className="text-emerald-500"
                    strokeDasharray="25, 100"
                    strokeDashoffset="-63"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* No Priority (12% - gray) */}
                  <path
                    className="text-[#B8C0B2]"
                    strokeDasharray="12, 100"
                    strokeDashoffset="-88"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-bold text-[#18221E] block leading-none">
                    24
                  </span>
                  <span className="text-[9px] font-bold text-[#65706A] uppercase tracking-wider block mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    High
                  </span>
                  <span className="font-semibold text-[#18221E]">5 (21%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Medium
                  </span>
                  <span className="font-semibold text-[#18221E]">10 (42%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Low
                  </span>
                  <span className="font-semibold text-[#18221E]">6 (25%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-[#B8C0B2]" />
                    No Priority
                  </span>
                  <span className="font-semibold text-[#18221E]">3 (12%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL 3: UPCOMING DEADLINES */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]/80">
              <h3 className="text-sm font-bold text-[#18221E]">Upcoming Deadlines</h3>
              <button type="button" className="text-xs font-semibold text-[#18221E] hover:underline">
                View All →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { title: "Finish API Integration", project: "Ropimo Platform", date: "Aug 25, 2026", priority: "High" },
                { title: "Mobile Responsive Fixes", project: "Muntajar Website", date: "Aug 27, 2026", priority: "Medium" },
                { title: "Client Portal Release", project: "Client Dashboard", date: "Aug 30, 2026", priority: "High" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] transition-colors">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AppIcon name="calendar" size={13} className="text-[#65706A] mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#18221E] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#65706A] truncate">{item.project}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-[#65706A]">{item.date}</p>
                    <span
                      className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                        item.priority === "High"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TASK ORGANIZER MODAL */}
      {organizerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <h3 className="text-base font-bold text-[#18221E]">Task Organizer & Grouping</h3>
              <button
                type="button"
                onClick={() => setOrganizerModalOpen(false)}
                className="text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#65706A] mb-1.5">
                  Group Tasks By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "due_date", label: "Due Date" },
                    { key: "project", label: "Project" },
                    { key: "priority", label: "Priority" },
                    { key: "status", label: "Status" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setGroupBy(opt.key as GroupByOption)}
                      className={`rounded-[8px] border p-2.5 text-xs font-semibold text-left transition-all ${
                        groupBy === opt.key
                          ? "border-[#10251F] bg-[#10251F] text-white shadow-2xs"
                          : "border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#D8DDD4]/80">
                <label className="block text-xs font-semibold text-[#65706A] mb-1.5">
                  Quick Actions
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTasks((prev) =>
                        [...prev].sort((a, b) => (b.priority === "high" ? 1 : -1))
                      );
                      setOrganizerModalOpen(false);
                    }}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-left hover:bg-white text-xs font-semibold text-[#18221E]"
                  >
                    ⚡ Sort by Highest Priority First
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTasks((prev) =>
                        [...prev].sort((a, b) => (a.completed ? 1 : -1))
                      );
                      setOrganizerModalOpen(false);
                    }}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-left hover:bg-white text-xs font-semibold text-[#18221E]"
                  >
                    📌 Move Incomplete Tasks to Top
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#D8DDD4]">
              <button
                type="button"
                onClick={() => setOrganizerModalOpen(false)}
                className="rounded-[8px] bg-[#10251F] text-white px-4 py-2 font-semibold text-xs"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#10251F]/40 backdrop-blur-xs">
          <div className="w-full max-w-[1180px] max-h-[calc(100vh-64px)] h-auto rounded-[20px] border border-[#D8DDD4] bg-white shadow-2xl overflow-hidden flex flex-col text-[#18221E] my-auto">
            {/* 1. TOP HEADER (Sticky / Fixed) */}
            <div className="px-6 sm:px-8 py-4 border-b border-[#D8DDD4]/80 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <span
                  style={{ backgroundColor: selectedTaskDetails.project.color }}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-bold text-white shadow-2xs"
                >
                  {selectedTaskDetails.project.icon}
                </span>
                <span className="font-bold text-sm text-[#18221E]">
                  {selectedTaskDetails.project.name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAEFE6] px-2.5 py-0.5 text-xs font-semibold text-[#246244]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                  Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                  title="Share / Copy link"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                  title="More actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="19" cy="12" r="1.75" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTaskDetails(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                  title="Close modal"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#D8DDD4]/80">
              {/* Top Section: Title, Description & Compact Metadata Grid */}
              <div className="px-6 sm:px-8 pt-6 pb-6 space-y-5 bg-white">
                {/* Title + Priority Row */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl sm:text-[28px] font-bold text-[#18221E] tracking-tight leading-snug">
                      {selectedTaskDetails.title}
                    </h1>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                        selectedTaskDetails.priority === "urgent" || selectedTaskDetails.priority === "high"
                          ? "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]"
                          : selectedTaskDetails.priority === "medium"
                          ? "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]"
                          : "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          selectedTaskDetails.priority === "urgent" || selectedTaskDetails.priority === "high"
                            ? "bg-[#D9383A]"
                            : selectedTaskDetails.priority === "medium"
                            ? "bg-[#B58500]"
                            : "bg-[#246244]"
                        }`}
                      />
                      <span className="capitalize">{selectedTaskDetails.priority}</span>
                    </span>
                  </div>

                  <p className="text-sm text-[#65706A] leading-relaxed max-w-3xl">
                    {selectedTaskDetails.description ||
                      "Resolve login issue on mobile after 5–10 minutes of inactivity even when “Remember me” is enabled."}
                  </p>
                </div>

                {/* Compact Information Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Card 1: Due Date */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Due Date</span>
                    </div>
                    <p className="text-sm font-bold text-[#18221E]">
                      {selectedTaskDetails.dueTimeText || "Today, 10:00 AM"}
                    </p>
                  </div>

                  {/* Card 2: Assignee */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span>Assignee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-white shadow-2xs">
                        {selectedTaskDetails.assignee.name[0]}
                      </div>
                      <span className="text-sm font-bold text-[#18221E] truncate">
                        {selectedTaskDetails.assignee.name}
                      </span>
                      <span className="text-xs text-[#65706A] hidden md:inline truncate">
                        • Head of Development
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Status */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Status</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#B58500]" />
                        <span className="text-sm font-bold text-[#18221E] capitalize">
                          {selectedTaskDetails.status.replace("_", " ")}
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#65706A]">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Card 4: Project */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Project</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: selectedTaskDetails.project.color }}
                        className="flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-bold text-white shadow-2xs shrink-0"
                      >
                        {selectedTaskDetails.project.icon}
                      </span>
                      <span className="text-sm font-bold text-[#18221E] truncate">
                        {selectedTaskDetails.project.name}
                      </span>
                    </div>
                  </div>

                  {/* Card 5: Task ID */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      Task ID
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#18221E] font-mono">
                        RP-TASK-0234
                      </span>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] transition-colors"
                        title="Copy Task ID"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Card 6: Created */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      Created
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#18221E]">
                        Aug 20, 2026
                      </span>
                      <span className="text-xs text-[#65706A]">by Tashin Khan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation Bar (52px Height) */}
              <div className="px-6 sm:px-8 border-b border-[#D8DDD4]/80 flex items-center gap-8 text-sm font-semibold h-[52px] shrink-0 bg-white overflow-x-auto whitespace-nowrap">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "subtasks", label: "Subtasks", count: 3 },
                  { key: "activity", label: "Activity" },
                  { key: "attachments", label: "Files", count: 2 },
                  { key: "notes", label: "Notes", count: 1 },
                ].map((tab) => {
                  const isActive = taskDetailTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTaskDetailTab(tab.key as any)}
                      className={`h-full relative flex items-center gap-2 transition-colors ${
                        isActive ? "text-[#18221E]" : "text-[#65706A] hover:text-[#18221E]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            isActive ? "bg-[#10251F] text-white" : "bg-[#EAEFE6] text-[#18221E]"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#10251F] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main Content Layout: Two Columns (65% / 35%) */}
              <div className="px-6 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 bg-white">
                {/* Left Column: Details, Description, Screenshots (~65%) */}
                <div className="space-y-8 min-w-0">
                  {/* 1. DETAILS DEFINITION LIST */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                      Details
                    </h2>
                    <dl className="space-y-3.5 text-sm">
                      <div className="grid grid-cols-[120px_1fr] items-center">
                        <dt className="text-xs text-[#65706A]">Type</dt>
                        <dd className="font-semibold text-[#18221E] flex items-center gap-1.5">
                          <span>🐛</span>
                          <span>Bug Fix</span>
                        </dd>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center">
                        <dt className="text-xs text-[#65706A]">Category</dt>
                        <dd className="font-semibold text-[#18221E]">Authentication</dd>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center">
                        <dt className="text-xs text-[#65706A]">Environment</dt>
                        <dd className="font-semibold text-[#18221E]">Production</dd>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center">
                        <dt className="text-xs text-[#65706A]">Platform</dt>
                        <dd className="font-semibold text-[#18221E]">Mobile — iOS, Android</dd>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center">
                        <dt className="text-xs text-[#65706A]">Labels</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-3 py-1 text-xs font-medium text-[#18221E]">
                            auth
                          </span>
                          <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-3 py-1 text-xs font-medium text-[#18221E]">
                            mobile
                          </span>
                          <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-3 py-1 text-xs font-medium text-[#18221E]">
                            urgent
                          </span>
                          <button
                            type="button"
                            className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] h-6 w-6 flex items-center justify-center text-xs text-[#65706A] hover:text-[#18221E] transition-colors"
                          >
                            +
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* 2. DESCRIPTION */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                      Description
                    </h2>
                    <div className="text-sm text-[#18221E] leading-relaxed max-w-2xl space-y-3">
                      <p>
                        Users are being logged out unexpectedly on mobile devices after 5–10 minutes of
                        inactivity, even when “Remember me” is enabled.
                      </p>
                      <p>
                        This affects both Android and iOS applications. Investigate the authentication
                        token/session lifecycle and implement a permanent fix.
                      </p>
                    </div>
                  </div>

                  {/* 3. SCREENSHOTS */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                      Screenshots
                    </h2>
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Screenshot Card 1 */}
                      <div className="w-[200px] h-[150px] rounded-xl border border-[#D8DDD4] bg-[#F4F3EE] p-3 flex flex-col justify-between shadow-2xs group relative overflow-hidden">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-[#18221E]">Sign In Screen</div>
                          <div className="h-2 rounded bg-[#D8DDD4] w-full" />
                          <div className="h-2 rounded bg-[#D8DDD4] w-3/4" />
                        </div>
                        <div className="h-5 rounded bg-[#10251F] text-white flex items-center justify-center font-bold text-[9px]">
                          Sign In
                        </div>
                      </div>

                      {/* Screenshot Card 2 */}
                      <div className="w-[200px] h-[150px] rounded-xl border border-[#10251F] bg-[#18221E] text-white p-3 flex flex-col justify-between shadow-2xs group relative overflow-hidden">
                        <div className="flex justify-center pt-2">
                          <span className="text-lg">🔒</span>
                        </div>
                        <div className="text-center space-y-0.5">
                          <div className="font-bold text-xs">Logged out</div>
                          <div className="text-[10px] text-white/60">Session timed out</div>
                        </div>
                        <div className="h-4 rounded bg-white/20 w-full" />
                      </div>

                      {/* Add Attachment Card */}
                      <div className="w-[200px] h-[150px] rounded-xl border-2 border-dashed border-[#D8DDD4] bg-[#FAF9F5] flex flex-col items-center justify-center gap-1.5 text-[#65706A] hover:border-[#10251F] hover:bg-white transition-colors cursor-pointer">
                        <span className="text-xl font-bold">+</span>
                        <span className="text-xs font-semibold">Add attachment</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Task Sidebar Panel (~35% / 360px) */}
                <div className="space-y-8">
                  {/* SUBTASKS (ClickUp/Linear style) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]/80">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                        Subtasks (3)
                      </h3>
                      <button type="button" className="text-xs font-semibold text-[#18221E] hover:underline">
                        View all →
                      </button>
                    </div>

                    <div className="divide-y divide-[#D8DDD4]/60 text-xs">
                      {/* Subtask 1 */}
                      <div className="min-h-[48px] py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="h-4 w-4 rounded-full border border-[#D8DDD4] shrink-0" />
                          <span className="text-[#18221E] font-medium truncate">
                            Reproduce issue on Android
                          </span>
                        </div>
                        <span className="rounded-full bg-[#FEF6E4] border border-[#F8E3B6] px-2.5 py-0.5 text-[10px] font-semibold text-[#B58500] shrink-0">
                          Medium
                        </span>
                      </div>

                      {/* Subtask 2 */}
                      <div className="min-h-[48px] py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#246244] text-[9px] text-white shrink-0">
                            ✓
                          </span>
                          <span className="text-[#65706A] line-through truncate">
                            Reproduce issue on iOS
                          </span>
                        </div>
                        <span className="rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-[10px] font-semibold text-[#246244] shrink-0">
                          Done
                        </span>
                      </div>

                      {/* Subtask 3 */}
                      <div className="min-h-[48px] py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="h-4 w-4 rounded-full border border-[#D8DDD4] shrink-0" />
                          <span className="text-[#18221E] font-medium truncate">
                            Implement fix for session timeout
                          </span>
                        </div>
                        <span className="rounded-full bg-[#FDECE8] border border-[#F8CBC2] px-2.5 py-0.5 text-[10px] font-semibold text-[#D9383A] shrink-0">
                          High
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-semibold text-[#246244] hover:underline flex items-center gap-1.5 pt-1"
                    >
                      <span className="text-sm font-bold">+</span>
                      <span>Add subtask</span>
                    </button>
                  </div>

                  {/* ACTIVITY TIMELINE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]/80">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                        Activity
                      </h3>
                      <button type="button" className="text-xs font-semibold text-[#18221E] hover:underline">
                        View all →
                      </button>
                    </div>

                    <div className="space-y-4 pt-1 text-xs">
                      {/* Activity 1 */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-white shadow-2xs mt-0.5">
                          T
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[#18221E] font-semibold">Tashin Khan</p>
                            <span className="text-[11px] text-[#8A958F] shrink-0">2h ago</span>
                          </div>
                          <p className="text-[#65706A] text-[11px] mt-0.5">updated the status to In Progress</p>
                        </div>
                      </div>

                      {/* Activity 2 */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7E22CE] text-[10px] font-bold text-white shadow-2xs mt-0.5">
                          S
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[#18221E] font-semibold">Sarah Ahmed</p>
                            <span className="text-[11px] text-[#8A958F] shrink-0">5h ago</span>
                          </div>
                          <p className="text-[#65706A] text-[11px] mt-0.5">added a comment: “Please check the session logs.”</p>
                        </div>
                      </div>

                      {/* Activity 3 */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B58500] text-[10px] font-bold text-white shadow-2xs mt-0.5">
                          R
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[#18221E] font-semibold">Rahim Hasan</p>
                            <span className="text-[11px] text-[#8A958F] shrink-0">Yesterday</span>
                          </div>
                          <p className="text-[#65706A] text-[11px] mt-0.5">attached file: session-timeout-log.txt</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-semibold text-[#246244] hover:underline flex items-center gap-1.5 pt-1"
                    >
                      <span className="text-sm font-bold">+</span>
                      <span>Add comment</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. STICKY FOOTER (Fixed at Bottom of Modal) */}
            <div className="px-6 sm:px-8 py-4 border-t border-[#D8DDD4] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTask(selectedTaskDetails)}
                  className="rounded-[10px] bg-[#10251F] text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-2 hover:bg-[#18221E] shadow-2xs transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{selectedTaskDetails.completed ? "Mark Incomplete" : "Mark Complete"}</span>
                </button>

                <button
                  type="button"
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                >
                  Edit Task
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTaskDetails(null)}
                className="rounded-[10px] border border-[#D8DDD4] bg-white px-5 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        people={people}
        projects={projects}
        departments={departments}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
