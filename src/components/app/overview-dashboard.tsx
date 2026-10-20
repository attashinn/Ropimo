"use client";

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Check,
  Calendar,
  User,
  MoreHorizontal,
  ChevronRight,
  Clock,
  Video,
  FolderKanban,
  CheckSquare,
  Briefcase,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { Task } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { LeaveRequest } from "@/types/leave";
import { CalendarEvent } from "@/types/calendar";
import { JobOpening, Interview, Candidate } from "@/types/recruitment";
import { WorkspaceActivityItem } from "@/lib/task/queries";
import { toggleTaskCompletionAction } from "@/lib/task/actions";
import { toast } from "sonner";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { TaskPeekPanel } from "@/components/app/task-peek-panel";
import {
  Button,
  IconButton,
  Avatar,
  Kbd,
  Tooltip,
  EmptyLine,
} from "@/components/app/ui";

export interface OverviewDashboardProps {
  workspaceId: string;
  workspaceName: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  projects: Project[];
  myOpenTasks: Task[];
  allTasks?: Task[];
  openTasksCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedCount: number;
  people: WorkspacePerson[];
  departments: Department[];
  recentActivities?: WorkspaceActivityItem[];
  upcomingDeadlines?: Task[];
  jobOpenings?: JobOpening[];
  openJobsCount?: number;
  pendingLeaves?: LeaveRequest[];
  pendingLeavesCount?: number;
  candidates?: Candidate[];
  interviews?: Interview[];
  upcomingEvents?: CalendarEvent[];
}

export function OverviewDashboard({
  workspaceId,
  workspaceName,
  userId,
  userName = "there",
  userEmail,
  projects = [],
  myOpenTasks = [],
  allTasks = [],
  openTasksCount = 0,
  dueTodayCount = 0,
  overdueCount = 0,
  completedCount = 0,
  people = [],
  departments = [],
  recentActivities = [],
  upcomingDeadlines = [],
  jobOpenings = [],
  openJobsCount = 0,
  pendingLeaves = [],
  pendingLeavesCount = 0,
  candidates = [],
  interviews = [],
  upcomingEvents = [],
}: OverviewDashboardProps) {
  const router = useRouter();

  // Modals and Peek state
  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  // Active Tab in left column: Tasks / Projects / Approvals
  const [activeTab, setActiveTab] = React.useState<string>("tasks");

  // Local task list for instant optimistic completion updates
  const currentInitialTasks = myOpenTasks.length > 0 ? myOpenTasks : allTasks;
  const [prevInitialTasks, setPrevInitialTasks] = React.useState(currentInitialTasks);
  const [tasks, setTasks] = React.useState<Task[]>(currentInitialTasks);
  if (currentInitialTasks !== prevInitialTasks) {
    setPrevInitialTasks(currentInitialTasks);
    setTasks(currentInitialTasks);
  }

  // Global 'C' shortcut to create task
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCreateTaskModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Format first name
  const firstName = userName.trim().split(" ")[0] || "there";

  // Today's formatted date string e.g. "Tuesday, Oct 20"
  const formattedTodayDate = React.useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Toggle completion optimistically
  const handleToggleTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCompleted = task.status === "completed";
    const nextStatus = isCompleted ? "todo" : "completed";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await toggleTaskCompletionAction(task.id, workspaceId, !isCompleted);
    } catch {
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      toast.error("Failed to update task. Please try again.");
    }
  };

  // Group tasks into Overdue, Today, Upcoming
  const { overdueTasks, todayTasks, upcomingTasks } = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000;

    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    const activeList = tasks.filter((t) => t.status !== "completed");

    for (const task of activeList) {
      if (!task.due_date) {
        upcoming.push(task);
        continue;
      }
      const due = new Date(task.due_date).getTime();
      if (due < startOfToday) {
        overdue.push(task);
      } else if (due >= startOfToday && due < endOfToday) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return {
      overdueTasks: overdue,
      todayTasks: today,
      upcomingTasks: upcoming,
    };
  }, [tasks]);

  // Tasks requiring approvals
  const approvalTasks = React.useMemo(() => {
    return tasks.filter((t) => t.requires_approval || t.status === "in_review");
  }, [tasks]);

  // Needs attention items: ONLY rendered if items exist!
  const attentionItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      label: string;
      href: string;
    }> = [];

    if (overdueTasks.length > 0) {
      items.push({
        id: "overdue",
        title: `${overdueTasks.length} ${overdueTasks.length === 1 ? "task is" : "tasks are"} past due`,
        label: "Overdue",
        href: "/app/my-tasks",
      });
    }

    if (pendingLeavesCount > 0 || pendingLeaves.length > 0) {
      const count = pendingLeavesCount || pendingLeaves.length;
      items.push({
        id: "leaves",
        title: `${count} leave ${count === 1 ? "request" : "requests"} pending approval`,
        label: "Approval needed",
        href: "/app/leave",
      });
    }

    if (approvalTasks.length > 0) {
      items.push({
        id: "approvals",
        title: `${approvalTasks.length} ${approvalTasks.length === 1 ? "task waiting" : "tasks waiting"} for review`,
        label: "Deliverables",
        href: "/app/my-tasks",
      });
    }

    return items;
  }, [overdueTasks, pendingLeavesCount, pendingLeaves, approvalTasks]);

  // Today's meetings / events for "Up next"
  const todayEvents = React.useMemo(() => {
    if (!upcomingEvents || upcomingEvents.length === 0) return [];
    return upcomingEvents.slice(0, 4);
  }, [upcomingEvents]);

  // Format activity feed item text
  const formatActivityText = (act: WorkspaceActivityItem) => {
    const actor = act.actorName || "Team member";
    const target = act.targetName || "item";
    if (act.type === "task_completed") {
      return `${actor} completed ${target}`;
    }
    return `${actor} created ${target}`;
  };

  const tabsConfig = [
    { id: "tasks", label: "Tasks", count: tasks.filter((t) => t.status !== "completed").length },
    { id: "projects", label: "Projects", count: projects.length },
    { id: "approvals", label: "Approvals", count: approvalTasks.length },
  ];

  // Helper to format event time
  const formatEventTime = (startTime?: string | null) => {
    if (!startTime) return "Today";
    if (startTime.includes("T") || startTime.includes("-")) {
      const d = new Date(startTime);
      return isNaN(d.getTime())
        ? startTime
        : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return startTime;
  };

  const renderTaskRow = (task: Task, isOverdue: boolean = false) => {
    const isCompleted = task.status === "completed";
    const projectColor = task.project?.color || "#7ED08A";
    const projectName = task.project?.name || "General";

    const formattedDue = task.due_date
      ? new Date(task.due_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;

    return (
      <motion.div
        key={task.id}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.995 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        onClick={() => setSelectedTask(task)}
        className="group relative flex h-11 items-center justify-between px-3 text-[13px] hover:bg-hover/60 transition-colors duration-120 cursor-pointer select-none"
      >
        {/* Left: Circle Checkbox + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          <button
            type="button"
            onClick={(e) => handleToggleTask(task, e)}
            className={`h-4 w-4 rounded-full border transition-all duration-120 flex items-center justify-center shrink-0 cursor-pointer ${
              isCompleted
                ? "bg-ink border-ink text-white"
                : "border-hairline hover:border-ink bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            }`}
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {isCompleted && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
          </button>

          <span
            className={`truncate font-normal transition-colors ${
              isCompleted ? "text-ink-3 line-through" : "text-ink font-medium"
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Middle/Right: Project tag + Due date badge + Hover actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Project Tag */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-hover/80 border border-hairline/60 max-w-[130px] truncate">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-ink-2 truncate">{projectName}</span>
          </div>

          {/* Due date badge */}
          {formattedDue && (
            <span
              className={cn(
                "text-[11px] tabular-nums font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                isOverdue
                  ? "bg-red-50 text-status-overdue border border-red-200/60"
                  : "bg-hover/60 text-ink-3 border border-hairline/40"
              )}
            >
              {isOverdue && <Clock className="h-3 w-3 stroke-[2] text-status-overdue" />}
              {formattedDue}
            </span>
          )}

          {/* Hover actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-120 flex items-center gap-0.5">
            <Tooltip content="Assignee">
              <IconButton
                aria-label="Assignee"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                }}
              >
                <User className="h-3.5 w-3.5 stroke-[1.5]" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Due date">
              <IconButton
                aria-label="Due date"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                }}
              >
                <Calendar className="h-3.5 w-3.5 stroke-[1.5]" />
              </IconButton>
            </Tooltip>
            <Tooltip content="More">
              <IconButton
                aria-label="More"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                }}
              >
                <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.5]" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 font-sans text-ink">
      {/* 1. Header: Greeting & Quick Actions */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] font-medium bg-hover text-ink-2 border border-hairline select-none">
              <Calendar className="h-3 w-3 stroke-[1.75]" />
              {formattedTodayDate}
            </span>
          </div>
          <h1 className="text-xl sm:text-[24px] font-semibold text-ink tracking-tight">
            Good morning, {firstName}
          </h1>
          <p className="text-xs sm:text-[13px] text-ink-2 mt-0.5">
            {overdueTasks.length > 0 ? (
              <>
                You have <span className="text-status-overdue font-medium">{overdueTasks.length} overdue {overdueTasks.length === 1 ? "task" : "tasks"}</span> requiring your attention today.
              </>
            ) : tasks.filter((t) => t.status !== "completed").length > 0 ? (
              <>
                You have {tasks.filter((t) => t.status !== "completed").length} active tasks and {todayEvents.length} {todayEvents.length === 1 ? "meeting" : "meetings"} scheduled today.
              </>
            ) : (
              <>You&apos;re all caught up on tasks for today.</>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5 shrink-0 pt-1 sm:pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreateProjectModalOpen(true)}
            className="w-full sm:w-auto justify-center gap-2 border border-hairline bg-surface hover:bg-hover text-ink text-xs h-9 sm:h-8"
          >
            <FolderKanban className="h-3.5 w-3.5 stroke-[1.75] text-ink-2" />
            <span>New project</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="w-full sm:w-auto justify-center gap-2 bg-ink text-white hover:bg-ink/90 shadow-sm text-xs h-9 sm:h-8"
          >
            <Plus className="h-3.5 w-3.5 stroke-[1.75]" />
            <span>New task</span>
            <Kbd className="hidden sm:inline-flex bg-white/20 text-white border-transparent text-[10px] px-1 py-0.2">C</Kbd>
          </Button>
        </div>
      </header>

      {/* 2. Executive Metric Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: Open tasks */}
        <Link
          href="/app/my-tasks"
          className="group block p-3.5 sm:p-4 rounded-xl border border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-ink-2">Open tasks</span>
            <div className="h-7 w-7 rounded-lg bg-hover/80 flex items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
              <CheckSquare className="h-3.5 w-3.5 stroke-[1.75]" />
            </div>
          </div>
          <div className="text-[26px] font-semibold text-ink tabular-nums leading-tight mb-2">
            {openTasksCount || tasks.filter((t) => t.status !== "completed").length}
          </div>
          <div className="flex items-center">
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-overdue bg-red-50 px-2 py-0.5 rounded-full border border-red-200/50">
                <span className="h-1.5 w-1.5 rounded-full bg-status-overdue animate-pulse" />
                {overdueCount} overdue
              </span>
            ) : (
              <span className="text-[11px] text-ink-3">All on schedule</span>
            )}
          </div>
        </Link>

        {/* Card 2: Due this week */}
        <Link
          href="/app/my-tasks"
          className="group block p-3.5 sm:p-4 rounded-xl border border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-ink-2">Due this week</span>
            <div className="h-7 w-7 rounded-lg bg-hover/80 flex items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
              <Clock className="h-3.5 w-3.5 stroke-[1.75]" />
            </div>
          </div>
          <div className="text-[22px] sm:text-[26px] font-semibold text-ink tabular-nums leading-tight mb-2">
            {dueTodayCount || todayTasks.length}
          </div>
          <div className="flex items-center">
            {todayTasks.length > 0 ? (
              <span className="text-[11px] font-medium text-ink-2 bg-hover px-2 py-0.5 rounded-full border border-hairline/60">
                {todayTasks.length} due today
              </span>
            ) : (
              <span className="text-[11px] text-ink-3">Clear for today</span>
            )}
          </div>
        </Link>

        {/* Card 3: Active projects */}
        <Link
          href="/app/projects"
          className="group block p-3.5 sm:p-4 rounded-xl border border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-ink-2">Active projects</span>
            <div className="h-7 w-7 rounded-lg bg-hover/80 flex items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
              <FolderKanban className="h-3.5 w-3.5 stroke-[1.75]" />
            </div>
          </div>
          <div className="text-[22px] sm:text-[26px] font-semibold text-ink tabular-nums leading-tight mb-2">
            {projects.length}
          </div>
          <div className="flex items-center">
            <span className="text-[11px] text-ink-3">Across company</span>
          </div>
        </Link>

        {/* Card 4: Meetings today */}
        <Link
          href="/app/calendar"
          className="group block p-3.5 sm:p-4 rounded-xl border border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-ink-2">Meetings today</span>
            <div className="h-7 w-7 rounded-lg bg-hover/80 flex items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
              <Video className="h-3.5 w-3.5 stroke-[1.75]" />
            </div>
          </div>
          <div className="text-[22px] sm:text-[26px] font-semibold text-ink tabular-nums leading-tight mb-2">
            {todayEvents.length}
          </div>
          <div className="flex items-center">
            {todayEvents.length > 0 ? (
              <span className="text-[11px] font-medium text-ink-2 bg-hover px-2 py-0.5 rounded-full border border-hairline/60">
                Next: {formatEventTime(todayEvents[0]?.start_time)}
              </span>
            ) : (
              <span className="text-[11px] text-ink-3">No meetings scheduled</span>
            )}
          </div>
        </Link>

        {/* Card 5: Open roles & people (Span 2 cols on mobile, 1 col on desktop) */}
        <Link
          href="/app/people"
          className="col-span-2 sm:col-span-1 group block p-3.5 sm:p-4 rounded-xl border border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-150"
        >
          <div className="flex sm:block items-center justify-between">
            <div>
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[12px] font-medium text-ink-2">Open roles</span>
                <div className="hidden sm:flex h-7 w-7 rounded-lg bg-hover/80 items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
                  <Briefcase className="h-3.5 w-3.5 stroke-[1.75]" />
                </div>
              </div>
              <div className="text-[22px] sm:text-[26px] font-semibold text-ink tabular-nums leading-tight mb-0 sm:mb-2">
                {openJobsCount || jobOpenings.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="sm:hidden h-7 w-7 rounded-lg bg-hover/80 flex items-center justify-center text-ink-2 group-hover:text-ink transition-colors">
                <Briefcase className="h-3.5 w-3.5 stroke-[1.75]" />
              </div>
              {candidates.length > 0 ? (
                <span className="text-[11px] text-ink-2 bg-hover px-2 py-0.5 rounded-full border border-hairline/60">
                  +{candidates.length} candidates
                </span>
              ) : (
                <span className="text-[11px] text-ink-3">Hiring overview</span>
              )}
            </div>
          </div>
        </Link>
      </section>

      {/* 3. Main Workspace Grid: Two Columns (65% / 35%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pt-1">
        {/* Left Column (65%): Focus Area with Segmented Tabs */}
        <div className="lg:col-span-8 space-y-4">
          {/* Segmented Pill Tabs Header */}
          <div className="flex items-center justify-between gap-2 pb-1 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1 p-1 bg-hover/80 rounded-xl border border-hairline shrink-0">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 select-none",
                      isActive
                        ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/[0.04]"
                        : "text-ink-2 hover:text-ink hover:bg-black/[0.03]"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "text-[11px] px-1.5 py-0.2 rounded-full tabular-nums",
                        isActive
                          ? "bg-hover text-ink font-semibold"
                          : "bg-black/[0.04] text-ink-3"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 hover:text-ink hover:bg-hover px-2.5 py-1.5 rounded-lg transition-colors border border-hairline bg-surface shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.75]" />
              <span>Add task</span>
            </button>
          </div>

          {/* Tab 1: Tasks list grouped by Overdue, Today, Upcoming */}
          {activeTab === "tasks" && (
            <div className="space-y-4 pt-1">
              {/* Group 1: Overdue */}
              {overdueTasks.length > 0 && (
                <div className="rounded-xl border border-red-200/80 bg-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-red-50/50 border-b border-red-100">
                    <span className="text-[12px] font-medium text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 stroke-[2] text-red-600" />
                      Overdue ({overdueTasks.length})
                    </span>
                    <span className="text-[11px] text-red-600/80">Requires immediate attention</span>
                  </div>
                  <div className="divide-y divide-hairline">
                    {overdueTasks.map((task) => renderTaskRow(task, true))}
                  </div>
                </div>
              )}

              {/* Group 2: Today */}
              {todayTasks.length > 0 && (
                <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-hover/40 border-b border-hairline">
                    <span className="text-[12px] font-medium text-ink flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 stroke-[1.75] text-ink-2" />
                      Due Today ({todayTasks.length})
                    </span>
                  </div>
                  <div className="divide-y divide-hairline">
                    {todayTasks.map((task) => renderTaskRow(task, false))}
                  </div>
                </div>
              )}

              {/* Group 3: Upcoming */}
              {upcomingTasks.length > 0 && (
                <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-hover/40 border-b border-hairline">
                    <span className="text-[12px] font-medium text-ink flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 stroke-[1.75] text-ink-2" />
                      Upcoming ({upcomingTasks.length})
                    </span>
                  </div>
                  <div className="divide-y divide-hairline">
                    {upcomingTasks.map((task) => renderTaskRow(task, false))}
                  </div>
                </div>
              )}

              {/* Quick Add Row Button */}
              <button
                type="button"
                onClick={() => setCreateTaskModalOpen(true)}
                className="w-full h-10 flex items-center justify-center gap-2 border border-dashed border-hairline hover:border-ink/30 rounded-xl text-[13px] text-ink-2 hover:text-ink hover:bg-hover/40 transition-colors"
              >
                <Plus className="h-4 w-4 stroke-[1.75]" />
                <span>Add a task to your list...</span>
              </button>

              {/* If no tasks in any group */}
              {overdueTasks.length === 0 &&
                todayTasks.length === 0 &&
                upcomingTasks.length === 0 && (
                  <div className="rounded-xl border border-hairline bg-surface p-8 text-center space-y-3">
                    <div className="h-10 w-10 rounded-full bg-hover flex items-center justify-center mx-auto text-ink-2">
                      <Check className="h-5 w-5 stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-ink">No open tasks right now</p>
                      <p className="text-[12px] text-ink-3 mt-0.5">You&apos;re completely clear. Create a new task to get started.</p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCreateTaskModalOpen(true)}
                      className="mx-auto"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[1.75] mr-1.5" />
                      Create task
                    </Button>
                  </div>
                )}
            </div>
          )}

          {/* Tab 2: Projects Directory */}
          {activeTab === "projects" && (
            <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] divide-y divide-hairline">
              {projects.length > 0 ? (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onMouseEnter={() => router.prefetch(`/app/projects/${proj.id}`)}
                    onClick={() => router.push(`/app/projects/${proj.id}`)}
                    className="flex h-12 items-center justify-between px-3.5 text-[13px] hover:bg-hover/60 transition-colors duration-120 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: proj.color || "#3B63F0" }}
                      />
                      <span className="text-ink font-medium truncate">
                        {proj.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-medium text-ink-2 px-2 py-0.5 rounded-full bg-hover border border-hairline/60">
                        {proj.status || "Active"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 stroke-[1.5] text-ink-3" />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyLine
                  message="No active projects."
                  actionText="New project"
                  onAction={() => setCreateProjectModalOpen(true)}
                />
              )}
            </div>
          )}

          {/* Tab 3: Approvals */}
          {activeTab === "approvals" && (
            <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] divide-y divide-hairline">
              {approvalTasks.length > 0 ? (
                approvalTasks.map((task) => renderTaskRow(task, false))
              ) : (
                <EmptyLine
                  message="No items awaiting approval right now."
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column (35%): Today's Schedule & Focus */}
        <div className="lg:col-span-4 space-y-4">
          {/* Up next: Today's Schedule */}
          <div className="rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 stroke-[1.75] text-ink-2" />
                Up next
              </h2>
              <Link
                href="/app/calendar"
                className="text-[11px] font-medium text-ink-2 hover:text-ink transition-colors inline-flex items-center gap-0.5"
              >
                <span>Calendar</span>
                <ChevronRight className="h-3 w-3 stroke-[1.5]" />
              </Link>
            </div>

            {todayEvents.length > 0 ? (
              <div className="space-y-2 pt-1">
                {todayEvents.map((evt, idx) => {
                  const time = formatEventTime(evt.start_time);
                  const isFirst = idx === 0;

                  return (
                    <div
                      key={evt.id}
                      onMouseEnter={() => router.prefetch("/app/calendar")}
                      onClick={() => router.push("/app/calendar")}
                      className={cn(
                        "p-2.5 rounded-lg transition-all duration-120 cursor-pointer",
                        isFirst
                          ? "bg-hover/80 border border-hairline shadow-xs"
                          : "hover:bg-hover/60 border border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold tabular-nums text-ink-2">
                          {time}
                        </span>
                        {isFirst && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Next up
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-ink truncate">
                          {evt.title}
                        </p>
                        <Video className="h-3.5 w-3.5 stroke-[1.5] text-ink-3 shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[12px] text-ink-3">No upcoming events scheduled today</p>
                <Link
                  href="/app/calendar"
                  className="text-[11px] font-medium text-ink hover:underline inline-block mt-1"
                >
                  Schedule meeting →
                </Link>
              </div>
            )}
          </div>

          {/* Needs attention: rendered ONLY if there are attention items */}
          {attentionItems.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
              <h2 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 stroke-[2] text-amber-600" />
                Needs attention
              </h2>

              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-hairline bg-hover/40 hover:bg-hover transition-colors duration-120 text-[13px]"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-medium text-ink truncate text-[12px]">{item.title}</p>
                      <span className="text-[11px] text-status-overdue font-normal">{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 stroke-[1.5] text-ink-3 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Workspace Quick Links */}
          <div className="rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Quick shortcuts</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/app/my-tasks"
                className="flex items-center gap-2 p-2 rounded-lg bg-hover/50 hover:bg-hover transition-colors text-[12px] font-medium text-ink-2 hover:text-ink border border-hairline/60"
              >
                <CheckSquare className="h-3.5 w-3.5 stroke-[1.75]" />
                <span className="truncate">My tasks</span>
              </Link>
              <Link
                href="/app/projects"
                className="flex items-center gap-2 p-2 rounded-lg bg-hover/50 hover:bg-hover transition-colors text-[12px] font-medium text-ink-2 hover:text-ink border border-hairline/60"
              >
                <FolderKanban className="h-3.5 w-3.5 stroke-[1.75]" />
                <span className="truncate">Projects</span>
              </Link>
              <Link
                href="/app/calendar"
                className="flex items-center gap-2 p-2 rounded-lg bg-hover/50 hover:bg-hover transition-colors text-[12px] font-medium text-ink-2 hover:text-ink border border-hairline/60"
              >
                <Calendar className="h-3.5 w-3.5 stroke-[1.75]" />
                <span className="truncate">Calendar</span>
              </Link>
              <Link
                href="/app/people"
                className="flex items-center gap-2 p-2 rounded-lg bg-hover/50 hover:bg-hover transition-colors text-[12px] font-medium text-ink-2 hover:text-ink border border-hairline/60"
              >
                <Briefcase className="h-3.5 w-3.5 stroke-[1.75]" />
                <span className="truncate">Directory</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom: Activity Feed */}
      <section className="rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[13px] font-semibold text-ink">Recent team activity</h2>
          <Link
            href="/app/my-tasks"
            className="text-[11px] font-medium text-ink-2 hover:text-ink transition-colors inline-flex items-center gap-0.5"
          >
            <span>View all</span>
            <ChevronRight className="h-3 w-3 stroke-[1.5]" />
          </Link>
        </div>

        {recentActivities && recentActivities.length > 0 ? (
          <div className="divide-y divide-hairline">
            {recentActivities.slice(0, 5).map((act) => {
              const actorName = act.actorName || "Team member";
              const timeAgo = act.createdAt
                ? new Date(act.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "recently";

              return (
                <div
                  key={act.id}
                  className="flex items-center gap-3 py-2.5 text-[13px]"
                >
                  <Avatar name={actorName} size={24} accent="blue" />
                  <span className="text-ink truncate font-normal text-[13px]">
                    {formatActivityText(act)}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-3 shrink-0 ml-auto pl-3">
                    {timeAgo}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyLine message="No recent team activity." />
        )}
      </section>

      {/* Side Peek Panel for task detail */}
      <TaskPeekPanel
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        workspaceId={workspaceId}
        onTaskUpdated={(updated) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        }}
        onTaskDeleted={(taskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        }}
      />

      {/* Modals */}
      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        workspaceId={workspaceId}
        people={people}
        projects={projects}
        departments={departments}
        onSuccess={() => {
          setCreateTaskModalOpen(false);
          router.refresh();
        }}
      />

      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        workspaceId={workspaceId}
        departments={departments}
        people={people}
        onSuccess={() => {
          setCreateProjectModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
