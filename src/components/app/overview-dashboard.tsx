"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckSquare,
  FolderKanban,
  Briefcase,
  CalendarDays,
  AlertCircle,
  UserCheck,
  Video,
  Flag,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  X,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Project } from "@/types/project";
import { Task } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { LeaveRequest } from "@/types/leave";
import { CalendarEvent } from "@/types/calendar";
import { JobOpening, Interview, Candidate } from "@/types/recruitment";
import { WorkspaceActivityItem } from "@/lib/task/queries";
import { toggleTaskCompletionAction } from "@/lib/task/actions";
import { reviewLeaveRequestAction } from "@/lib/attendance/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { cn } from "@/lib/utils";

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

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "recently";
  try {
    let normalized = dateStr;
    if (
      typeof dateStr === "string" &&
      !dateStr.endsWith("Z") &&
      !/[+-]\d{2}(:\d{2})?$/.test(dateStr)
    ) {
      normalized = dateStr.replace(" ", "T") + "Z";
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));

    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr?: string | null): { month: string; day: string } {
  if (!dateStr) return { month: "UPC", day: "•" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { month: "UPC", day: "•" };
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = String(d.getDate());
    return { month, day };
  } catch {
    return { month: "UPC", day: "•" };
  }
}

export function OverviewDashboard({
  workspaceId,
  workspaceName,
  userId = "",
  userName = "there",
  projects = [],
  myOpenTasks = [],
  allTasks = [],
  openTasksCount = 0,
  dueTodayCount = 0,
  overdueCount = 0,
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
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [taskModalOpen, setTaskModalOpen] = React.useState(false);
  const [workTab, setWorkTab] = React.useState<"tasks" | "projects" | "approvals">("tasks");
  const [timeFilter, setTimeFilter] = React.useState<"This week" | "Today" | "This month" | "This quarter">("This week");
  const [timeFilterOpen, setTimeFilterOpen] = React.useState(false);

  // Optimistic UI state for task toggle
  const [taskStatusOverrides, setTaskStatusOverrides] = React.useState<Record<string, boolean>>({});
  const [togglingTaskId, setTogglingTaskId] = React.useState<string | null>(null);

  // Optimistic & in-flight state for leave approvals
  const [reviewingLeaveId, setReviewingLeaveId] = React.useState<string | null>(null);
  const [leaveStatusOverrides, setLeaveStatusOverrides] = React.useState<Record<string, "Approved" | "Rejected">>({});

  // Friendly first name
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  // Task toggle completion handler with optimistic feedback
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (togglingTaskId) return;
    const isCurrentlyDone =
      taskStatusOverrides[taskId] !== undefined
        ? taskStatusOverrides[taskId]
        : currentStatus === "completed";
    const nextCompleted = !isCurrentlyDone;

    setTogglingTaskId(taskId);
    setTaskStatusOverrides((prev) => ({ ...prev, [taskId]: nextCompleted }));

    try {
      await toggleTaskCompletionAction(taskId, workspaceId, nextCompleted);
      router.refresh();
    } catch (err) {
      console.error("[Overview] Failed to toggle task:", err);
      // Revert optimistic update
      setTaskStatusOverrides((prev) => ({ ...prev, [taskId]: isCurrentlyDone }));
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Inline Leave Request review handler
  const handleReviewLeave = async (requestId: string, action: "approve" | "reject") => {
    if (reviewingLeaveId) return;
    setReviewingLeaveId(requestId);
    setLeaveStatusOverrides((prev) => ({
      ...prev,
      [requestId]: action === "approve" ? "Approved" : "Rejected",
    }));

    try {
      const res = await reviewLeaveRequestAction({
        workspaceId,
        requestId,
        action,
        rejectionReason: action === "reject" ? "Declined from Overview Command Center" : undefined,
      });

      if (res.success) {
        router.refresh();
      } else {
        // Revert on error
        setLeaveStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
      }
    } catch (err) {
      console.error("[Overview] Failed to review leave request:", err);
      setLeaveStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    } finally {
      setReviewingLeaveId(null);
    }
  };

  // Date range filter utility
  const matchesTimeFilter = React.useCallback(
    (dateStr?: string | null): boolean => {
      if (!dateStr) return false;
      const itemDate = new Date(dateStr);
      if (isNaN(itemDate.getTime())) return false;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (timeFilter === "Today") {
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDay.getTime() === today.getTime();
      }

      if (timeFilter === "This week") {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return itemDate >= today && itemDate <= weekEnd;
      }

      if (timeFilter === "This month") {
        const monthEnd = new Date(today);
        monthEnd.setDate(monthEnd.getDate() + 30);
        return itemDate >= today && itemDate <= monthEnd;
      }

      // "This quarter"
      const quarterEnd = new Date(today);
      quarterEnd.setDate(quarterEnd.getDate() + 90);
      return itemDate >= today && itemDate <= quarterEnd;
    },
    [timeFilter]
  );

  // Dynamic values for metrics (Production real data)
  const activeProjects = React.useMemo(
    () => projects.filter((p) => p.status !== "completed" && p.status !== "cancelled"),
    [projects]
  );

  const displayOpenTasksCount = openTasksCount;
  const displayTeamCount = people.length;
  const displayHiringCount = openJobsCount;

  // Active pending leaves (accounting for optimistic inline decisions)
  const pendingLeavesActive = React.useMemo(
    () =>
      pendingLeaves.filter(
        (l) => leaveStatusOverrides[l.id] !== "Approved" && leaveStatusOverrides[l.id] !== "Rejected"
      ),
    [pendingLeaves, leaveStatusOverrides]
  );
  const displayLeaveCount = pendingLeavesActive.length;

  // Build Needs Attention items strictly from live data
  const needsAttentionList = React.useMemo(() => {
    const list: Array<{
      id: string;
      icon: React.ReactNode;
      iconBg: string;
      title: string;
      subtitle: string;
      badge: string;
      badgeClass: string;
      href: string;
    }> = [];

    // 1. Pending Leave Requests
    if (pendingLeavesActive.length > 0) {
      const first = pendingLeavesActive[0];
      const applicantName = first.person?.full_name || "A team member";
      list.push({
        id: "leave-req",
        icon: <CalendarDays className="h-4 w-4 text-[#246244]" />,
        iconBg: "bg-[#EAF4E2] border-[#D8DDD4]",
        title: "Leave request",
        subtitle: `${applicantName} requested ${first.leave_type || "Annual Leave"} (${first.duration_days}d)`,
        badge: `${pendingLeavesActive.length} awaiting approval`,
        badgeClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
        href: "/app/leave",
      });
    }

    // 2. Overdue Tasks
    if (overdueCount > 0) {
      list.push({
        id: "overdue-tasks",
        icon: <AlertCircle className="h-4 w-4 text-[#D9383A]" />,
        iconBg: "bg-[#FDECE8] border-[#F8CBC2]",
        title: "Overdue tasks",
        subtitle: `${overdueCount} ${overdueCount === 1 ? "task is" : "tasks are"} past their due date`,
        badge: "Action needed",
        badgeClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
        href: "/app/tasks",
      });
    }

    // 3. Candidates Waiting for Review
    if (candidates.length > 0) {
      list.push({
        id: "cand-review",
        icon: <UserCheck className="h-4 w-4 text-[#1E40AF]" />,
        iconBg: "bg-[#EBF3FE] border-[#BFDBFE]",
        title: "Candidate review",
        subtitle: `${candidates.length} ${candidates.length === 1 ? "candidate" : "candidates"} in hiring pipeline`,
        badge: "Review",
        badgeClass: "bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]",
        href: "/app/people/candidates",
      });
    }

    // 4. Interviews Scheduled
    if (interviews.length > 0) {
      list.push({
        id: "interviews-today",
        icon: <Video className="h-4 w-4 text-[#6B21A8]" />,
        iconBg: "bg-[#F3E8FF] border-[#E9D5FF]",
        title: "Interviews scheduled",
        subtitle: `${interviews.length} ${interviews.length === 1 ? "interview" : "interviews"} upcoming`,
        badge: "Scheduled",
        badgeClass: "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]",
        href: "/app/people/interviews",
      });
    }

    // 5. Imminent Project Deadline (due within next 5 days)
    const now = new Date();
    const soonProject = activeProjects.find((p) => {
      const dueStr = p.due_date || p.deadline;
      if (!dueStr) return false;
      const d = new Date(dueStr);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diffDays >= 0 && diffDays <= 5;
    });

    if (soonProject) {
      const dueStr = soonProject.due_date || soonProject.deadline || "";
      const daysLeft = Math.max(0, Math.ceil((new Date(dueStr).getTime() - now.getTime()) / (1000 * 3600 * 24)));
      list.push({
        id: `proj-deadline-${soonProject.id}`,
        icon: <Flag className="h-4 w-4 text-[#B58500]" />,
        iconBg: "bg-[#FEF6E4] border-[#F8E3B6]",
        title: "Project deadline",
        subtitle: `${soonProject.name} due ${daysLeft === 0 ? "today" : `in ${daysLeft} days`}`,
        badge: "Due soon",
        badgeClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
        href: `/app/projects/${soonProject.id}`,
      });
    }

    return list;
  }, [pendingLeavesActive, overdueCount, candidates, interviews, activeProjects]);

  // Real upcoming events filtered by selected timeframe
  const displayUpcomingEvents = React.useMemo(() => {
    const list = upcomingEvents.filter((ev) => matchesTimeFilter(ev.start_date));
    return list.slice(0, 4).map((ev, idx) => {
      const { month, day } = formatShortDate(ev.start_date);
      const timeRange = ev.is_all_day
        ? "All day"
        : ev.start_time
        ? `${ev.start_time}${ev.end_time ? ` – ${ev.end_time}` : ""}`
        : "Scheduled";

      const dotColors = ["bg-[#3B82F6]", "bg-[#D9383A]", "bg-[#246244]", "bg-[#D97706]"];

      return {
        id: ev.id,
        month,
        day,
        title: ev.title,
        time: timeRange,
        dotColor: dotColors[idx % dotColors.length],
      };
    });
  }, [upcomingEvents, matchesTimeFilter]);

  // Real team activity list
  const displayActivities = React.useMemo(() => {
    return recentActivities.slice(0, 5).map((act) => {
      let actionText = "updated an item";
      if (act.type === "project_created") actionText = "created a new project";
      else if (act.type === "task_created") actionText = "created a new task";
      else if (act.type === "task_completed") actionText = "completed";
      else if ((act.type as string) === "leave_requested") actionText = "requested";

      return {
        id: act.id,
        userName: act.actorName || "Team Member",
        userAvatar: undefined as string | undefined,
        action: actionText,
        target: act.targetName || "Workspace Item",
        time: formatRelativeTime(act.createdAt),
      };
    });
  }, [recentActivities]);

  // Real projects overview table
  const displayProjectsOverview = React.useMemo(() => {
    return activeProjects.slice(0, 4).map((p) => {
      const dueDate = p.due_date || p.deadline || p.start_date;
      const { month, day } = formatShortDate(dueDate);
      const dueFormatted = dueDate
        ? `${month.slice(0, 1) + month.slice(1).toLowerCase()} ${day}`
        : "No deadline";
      return {
        id: p.id,
        name: p.name,
        progress: p.progress ?? 0,
        status:
          p.status === "completed"
            ? "Completed"
            : p.status === "planning"
            ? "Planning"
            : "In Progress",
        due: dueFormatted,
      };
    });
  }, [activeProjects]);

  // Tasks in "My work"
  const displayTasks = React.useMemo(() => {
    const list = myOpenTasks.length > 0 ? myOpenTasks : allTasks;
    return list.slice(0, 5);
  }, [myOpenTasks, allTasks]);

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 pb-20">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            Overview
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-[#18221E]">
            Good day, {firstName}.
          </p>
          <p className="text-xs sm:text-sm text-[#65706A]">
            Here&apos;s what&apos;s happening across your workspace.
          </p>
        </div>

        {/* Right side controls: Quick Actions & Time Filter */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:pt-1">
          {/* Quick Action: New Task */}
          <button
            type="button"
            onClick={() => setTaskModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#10251F] text-white px-3.5 text-xs font-semibold hover:bg-[#18362B] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[#C7F34A]" />
            <span>New Task</span>
          </button>

          {/* Quick Action: New Project */}
          <button
            type="button"
            onClick={() => setProjectModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors cursor-pointer"
          >
            <FolderKanban className="h-3.5 w-3.5 text-[#65706A]" />
            <span>New Project</span>
          </button>

          {/* Time Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTimeFilterOpen(!timeFilterOpen)}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors cursor-pointer"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#65706A]" />
              <span>{timeFilter}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-[#65706A] transition-transform",
                  timeFilterOpen && "rotate-180"
                )}
              />
            </button>

            {timeFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[140px] rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-elevated">
                {(["This week", "Today", "This month", "This quarter"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTimeFilter(t);
                      setTimeFilterOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-[6px] px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                      timeFilter === t
                        ? "bg-[#EAF4E2] font-semibold text-[#10251F]"
                        : "text-[#18221E] hover:bg-[#FAF9F5]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP METRIC BAR: ONE clean horizontal container with subtle separators */}
      <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-[#D8DDD4] shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px">
          {/* Metric 1: TEAM */}
          <Link
            href="/app/people"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors bg-white hover:bg-[#FAF9F5] no-underline"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-[#EAF4E2] text-[#246244] shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                TEAM
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {displayTeamCount}
              </p>
              <span className="block text-xs text-[#65706A]">
                {displayTeamCount === 1 ? "Member" : "Members"}
              </span>
            </div>
          </Link>

          {/* Metric 2: OPEN WORK */}
          <Link
            href="/app/tasks"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors bg-white hover:bg-[#FAF9F5] no-underline"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#F8E3B6] bg-[#FEF6E4] text-[#B58500] shadow-2xs group-hover:scale-105 transition-transform">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                OPEN WORK
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {displayOpenTasksCount}
              </p>
              <span className="block text-xs text-[#65706A]">
                {displayOpenTasksCount === 1 ? "Task" : "Tasks"}
              </span>
            </div>
          </Link>

          {/* Metric 3: PROJECTS */}
          <Link
            href="/app/projects"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors bg-white hover:bg-[#FAF9F5] no-underline"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#BFDBFE] bg-[#EBF3FE] text-[#1E40AF] shadow-2xs group-hover:scale-105 transition-transform">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                PROJECTS
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {activeProjects.length}
              </p>
              <span className="block text-xs text-[#65706A]">Active</span>
            </div>
          </Link>

          {/* Metric 4: HIRING */}
          <Link
            href="/app/people/jobs"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors bg-white hover:bg-[#FAF9F5] no-underline"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E9D5FF] bg-[#F3E8FF] text-[#6B21A8] shadow-2xs group-hover:scale-105 transition-transform">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                HIRING
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {displayHiringCount}
              </p>
              <span className="block text-xs text-[#65706A]">
                {displayHiringCount === 1 ? "Open role" : "Open roles"}
              </span>
            </div>
          </Link>

          {/* Metric 5: LEAVE */}
          <Link
            href="/app/leave"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors bg-white hover:bg-[#FAF9F5] no-underline col-span-2 sm:col-span-1"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#F8CBC2] bg-[#FDECE8] text-[#D9383A] shadow-2xs group-hover:scale-105 transition-transform">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                LEAVE
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {displayLeaveCount}
              </p>
              <span className="block text-xs text-[#65706A]">Pending</span>
            </div>
          </Link>
        </div>
      </div>

      {/* MAIN CONTENT GRID (2 COLUMNS: Needs attention vs My work) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COLUMN: Needs attention */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EADF]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#18221E]">Needs attention</h3>
                {needsAttentionList.length > 0 && (
                  <span className="rounded-full bg-[#FDECE8] px-2 py-0.5 text-[10px] font-bold text-[#D9383A]">
                    {needsAttentionList.length}
                  </span>
                )}
              </div>
              <Link
                href="/app/tasks"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View tasks
              </Link>
            </div>

            {/* List or Reassuring Zero State */}
            {needsAttentionList.length > 0 ? (
              <div className="divide-y divide-[#E7EADF]">
                {needsAttentionList.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-center justify-between gap-3 py-3 hover:bg-[#FAF9F5] px-1.5 rounded-[8px] transition-colors no-underline"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border shadow-2xs",
                          item.iconBg
                        )}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#65706A] truncate max-w-[220px] sm:max-w-[280px]">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          item.badgeClass
                        )}
                      >
                        {item.badge}
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#8A958F] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-[#EAF4E2] border border-[#D8DDD4] text-[#246244] flex items-center justify-center mb-2.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-[#18221E]">All caught up!</p>
                <p className="text-[11px] text-[#65706A] mt-0.5 max-w-[280px]">
                  No overdue tasks, pending leave requests, or urgent reviews requiring attention.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: My work */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header with Title & View all link */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-sm font-bold text-[#18221E]">My work</h3>
              <Link
                href="/app/tasks"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View all tasks
              </Link>
            </div>

            {/* Tab selection */}
            <div className="flex items-center gap-5 border-b border-[#E7EADF] pb-2.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setWorkTab("tasks")}
                className={cn(
                  "relative pb-1 transition-colors cursor-pointer",
                  workTab === "tasks"
                    ? "font-bold text-[#18221E]"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <span>Tasks</span>
                {workTab === "tasks" && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#246244]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setWorkTab("projects")}
                className={cn(
                  "relative pb-1 transition-colors cursor-pointer",
                  workTab === "projects"
                    ? "font-bold text-[#18221E]"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <span>Projects</span>
                {workTab === "projects" && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#246244]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setWorkTab("approvals")}
                className={cn(
                  "relative pb-1 transition-colors cursor-pointer",
                  workTab === "approvals"
                    ? "font-bold text-[#18221E]"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <span>Approvals</span>
                {pendingLeavesActive.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-[#FEF6E4] px-1.5 py-0.2 text-[9px] font-bold text-[#B58500]">
                    {pendingLeavesActive.length}
                  </span>
                )}
                {workTab === "approvals" && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#246244]" />
                )}
              </button>
            </div>

            {/* Tab content: Tasks */}
            {workTab === "tasks" && (
              <div className="pt-1">
                {displayTasks.length > 0 ? (
                  <div className="divide-y divide-[#E7EADF]">
                    {displayTasks.map((t) => {
                      const isDone =
                        taskStatusOverrides[t.id] !== undefined
                          ? taskStatusOverrides[t.id]
                          : t.status === "completed";
                      const { month, day } = formatShortDate(t.due_date);
                      const dueFormatted = t.due_date
                        ? `${month.slice(0, 1) + month.slice(1).toLowerCase()} ${day}`
                        : "No due date";
                      const isOverdue =
                        !isDone && t.due_date && new Date(t.due_date) < new Date();

                      return (
                        <div
                          key={t.id}
                          className="group flex items-center justify-between gap-3 py-2.5 px-1.5 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Interactive Optimistic Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleTask(t.id, t.status)}
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
                                isDone
                                  ? "bg-[#10251F] border-[#10251F] text-[#C7F34A]"
                                  : "border-[#B8C0B2] bg-white hover:border-[#10251F]"
                              )}
                              aria-label={isDone ? "Mark incomplete" : "Mark completed"}
                            >
                              {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </button>

                            <span
                              className={cn(
                                "text-xs font-medium text-[#18221E] truncate max-w-[200px] sm:max-w-[280px]",
                                isDone && "line-through text-[#8A958F]"
                              )}
                            >
                              {t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Project dot & name */}
                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#65706A]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                              <span className="truncate max-w-[120px]">
                                {t.project?.name || "General"}
                              </span>
                            </span>

                            {/* Due Date */}
                            <span
                              className={cn(
                                "text-[11px] font-medium min-w-[45px] text-right",
                                isOverdue
                                  ? "text-[#D9383A] font-semibold"
                                  : "text-[#65706A]"
                              )}
                            >
                              {dueFormatted}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <CheckSquare className="h-7 w-7 text-[#8A958F] mb-1.5 opacity-60" />
                    <p className="text-xs font-semibold text-[#18221E]">No tasks to show</p>
                    <p className="text-[11px] text-[#65706A] mt-0.5">
                      You are all caught up on your deliverables.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTaskModalOpen(true)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-[#C7F34A] px-3 py-1.5 text-xs font-semibold hover:bg-[#18362B] transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Task</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab content: Projects */}
            {workTab === "projects" && (
              <div className="pt-1">
                {activeProjects.length > 0 ? (
                  <div className="divide-y divide-[#E7EADF]">
                    {activeProjects.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        href={`/app/projects/${p.id}`}
                        className="flex items-center justify-between py-2.5 px-1.5 hover:bg-[#FAF9F5] rounded-[8px] transition-colors no-underline"
                      >
                        <span className="text-xs font-semibold text-[#18221E] truncate">
                          {p.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#65706A]">
                          {p.progress || 0}% completed
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <FolderKanban className="h-7 w-7 text-[#8A958F] mb-1.5 opacity-60" />
                    <p className="text-xs font-semibold text-[#18221E]">No active projects</p>
                    <p className="text-[11px] text-[#65706A] mt-0.5">
                      Create your first project to organize work with your team.
                    </p>
                    <button
                      type="button"
                      onClick={() => setProjectModalOpen(true)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-[#C7F34A] px-3 py-1.5 text-xs font-semibold hover:bg-[#18362B] transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Project</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab content: Approvals with Inline Decisions */}
            {workTab === "approvals" && (
              <div className="pt-1">
                {pendingLeavesActive.length > 0 ? (
                  <div className="divide-y divide-[#E7EADF]">
                    {pendingLeavesActive.slice(0, 5).map((l) => {
                      const isReviewing = reviewingLeaveId === l.id;
                      const { month, day } = formatShortDate(l.start_date);
                      return (
                        <div
                          key={l.id}
                          className="flex items-center justify-between py-2.5 px-1.5 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-[#18221E] truncate">
                              {l.person?.full_name || "Employee"}
                            </p>
                            <p className="text-[11px] text-[#65706A] truncate">
                              {l.leave_type} · {l.duration_days}{" "}
                              {l.duration_days === 1 ? "day" : "days"} ({month} {day})
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() => handleReviewLeave(l.id, "approve")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#246244] bg-[#EAF4E2] hover:bg-[#D5EAC8] rounded-[6px] border border-[#D8DDD4] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isReviewing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() => handleReviewLeave(l.id, "reject")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#D9383A] bg-[#FDECE8] hover:bg-[#FADCD5] rounded-[6px] border border-[#F8CBC2] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-[#246244] mb-1.5" />
                    <p className="text-xs font-semibold text-[#18221E]">No pending approvals</p>
                    <p className="text-[11px] text-[#65706A] mt-0.5">
                      All team leave requests and reviews have been processed.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: THREE EQUAL COLUMNS (Team activity | Projects overview | Upcoming events) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* COLUMN A: Team activity */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EADF]">
              <h3 className="text-sm font-bold text-[#18221E]">Team activity</h3>
              <Link
                href="/app/tasks"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View all
              </Link>
            </div>

            {displayActivities.length > 0 ? (
              <div className="divide-y divide-[#E7EADF] pt-1">
                {displayActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 py-2.5 px-1 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                  >
                    <div className="relative mt-0.5">
                      <RopimoUserAvatar
                        name={act.userName}
                        imageUrl={act.userAvatar}
                        size="sm"
                      />
                      <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[#246244] ring-1 ring-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#18221E] leading-tight">
                        <span className="font-bold text-[#18221E]">{act.userName}</span>{" "}
                        <span className="text-[#65706A]">{act.action}</span>
                      </p>
                      <p
                        className="mt-0.5 text-[11px] text-[#8A958F] truncate"
                        suppressHydrationWarning
                      >
                        {act.target} · <span suppressHydrationWarning>{act.time}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <Clock className="h-7 w-7 text-[#8A958F] mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-[#18221E]">No recent activity</p>
                <p className="text-[11px] text-[#65706A] mt-0.5">
                  Activity will appear here as your team creates tasks and projects.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN B: Projects overview */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EADF]">
              <h3 className="text-sm font-bold text-[#18221E]">Projects overview</h3>
              <Link
                href="/app/projects"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View all projects
              </Link>
            </div>

            {displayProjectsOverview.length > 0 ? (
              <div className="pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] border-b border-[#E7EADF]">
                      <th className="pb-2 font-bold">Project</th>
                      <th className="pb-2 font-bold">Progress</th>
                      <th className="pb-2 font-bold text-center">Status</th>
                      <th className="pb-2 font-bold text-right">Due date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7EADF]">
                    {displayProjectsOverview.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                        onClick={() => router.push(`/app/projects/${p.id}`)}
                      >
                        <td className="py-2.5 pr-2 font-semibold text-[#18221E] truncate max-w-[110px]">
                          {p.name}
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 sm:w-14 overflow-hidden rounded-full bg-[#E7EADF]">
                              <div
                                className="h-full rounded-full bg-[#246244]"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#65706A] font-medium">
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              p.status === "Completed"
                                ? "bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4]"
                                : p.status === "Planning"
                                ? "bg-[#F4F3EE] text-[#65706A] border border-[#D8DDD4]"
                                : "bg-[#EBF3FE] text-[#1E40AF] border border-[#BFDBFE]"
                            )}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 pl-2 text-right text-[11px] text-[#65706A] font-medium">
                          {p.due}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <FolderKanban className="h-7 w-7 text-[#8A958F] mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-[#18221E]">No active projects</p>
                <p className="text-[11px] text-[#65706A] mt-0.5">
                  Start your first project to organize deliverables and track milestones.
                </p>
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(true)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-[#C7F34A] px-3 py-1.5 text-xs font-semibold hover:bg-[#18362B] transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Project</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN C: Upcoming events */}
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EADF]">
              <h3 className="text-sm font-bold text-[#18221E]">Upcoming events</h3>
              <Link
                href="/app/calendar"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View calendar →
              </Link>
            </div>

            {displayUpcomingEvents.length > 0 ? (
              <div className="divide-y divide-[#E7EADF] pt-1">
                {displayUpcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] w-9 py-0.5 shrink-0 text-center">
                        <span
                          className="text-[9px] font-bold text-[#8A958F] tracking-wider leading-none"
                          suppressHydrationWarning
                        >
                          {ev.month}
                        </span>
                        <span
                          className="text-sm font-bold text-[#18221E] leading-tight"
                          suppressHydrationWarning
                        >
                          {ev.day}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#18221E] truncate max-w-[180px] sm:max-w-[200px]">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-[#65706A] truncate">
                          {ev.time}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        ev.dotColor
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <CalendarDays className="h-7 w-7 text-[#8A958F] mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-[#18221E]">No upcoming events</p>
                <p className="text-[11px] text-[#65706A] mt-0.5">
                  No events scheduled for {timeFilter.toLowerCase()}.
                </p>
                <Link
                  href="/app/calendar"
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#246244] hover:underline"
                >
                  Schedule an event →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        workspaceId={workspaceId}
        people={people}
        departments={departments}
      />

      <CreateTaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        workspaceId={workspaceId}
        projects={projects}
        departments={departments}
        people={people}
      />
    </div>
  );
}
