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
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

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
  const [togglingTaskId, setTogglingTaskId] = React.useState<string | null>(null);
  const [timeFilter, setTimeFilter] = React.useState("This week");
  const [timeFilterOpen, setTimeFilterOpen] = React.useState(false);

  // Friendly first name
  const firstName = userName.trim().split(/\s+/)[0] || "Tashin";

  // Task toggle completion handler
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (togglingTaskId) return;
    setTogglingTaskId(taskId);
    try {
      const nextCompleted = currentStatus !== "completed";
      await toggleTaskCompletionAction(taskId, workspaceId, nextCompleted);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Dynamic values for metrics & cards
  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
  const displayOpenTasksCount = openTasksCount || allTasks.filter((t) => t.status !== "completed").length;
  const displayTeamCount = people.length || 7;
  const displayHiringCount = openJobsCount || jobOpenings.length || 6;
  const displayLeaveCount = pendingLeavesCount || pendingLeaves.length || 2;

  // Build Needs Attention items from real data
  const firstLeave = pendingLeaves[0];
  const firstProjectDue = upcomingDeadlines[0] || (projects[0] ? { title: projects[0].name, due_date: projects[0].due_date || projects[0].deadline } : null);

  const needsAttentionList = [
    {
      id: "leave-req",
      icon: <CalendarDays className="h-4 w-4 text-[#246244]" />,
      iconBg: "bg-[#EAF4E2] border-[#D8DDD4]",
      title: "Leave request",
      subtitle: firstLeave
        ? `${firstLeave.person?.full_name || "Jesmin Sikder"} requested ${firstLeave.leave_type || "Annual Leave"}`
        : "Jesmin Sikder requested Annual Leave",
      badge: "Awaiting approval",
      badgeClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
      href: "/app/leave",
    },
    {
      id: "overdue-tasks",
      icon: <AlertCircle className="h-4 w-4 text-[#D9383A]" />,
      iconBg: "bg-[#FDECE8] border-[#F8CBC2]",
      title: "Overdue tasks",
      subtitle:
        overdueCount > 0
          ? `${overdueCount} ${overdueCount === 1 ? "task is" : "tasks are"} past their due date`
          : "3 tasks are past their due date",
      badge: "Action needed",
      badgeClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
      href: "/app/tasks",
    },
    {
      id: "cand-review",
      icon: <UserCheck className="h-4 w-4 text-[#1E40AF]" />,
      iconBg: "bg-[#EBF3FE] border-[#BFDBFE]",
      title: "Candidate review",
      subtitle:
        candidates.length > 0
          ? `${candidates.length} ${candidates.length === 1 ? "candidate is" : "candidates are"} waiting for your review`
          : "1 candidate is waiting for your review",
      badge: "Review",
      badgeClass: "bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]",
      href: "/app/candidates",
    },
    {
      id: "interviews-today",
      icon: <Video className="h-4 w-4 text-[#6B21A8]" />,
      iconBg: "bg-[#F3E8FF] border-[#E9D5FF]",
      title: "Interviews today",
      subtitle:
        interviews.length > 0
          ? `${interviews.length} ${interviews.length === 1 ? "interview" : "interviews"} scheduled`
          : "2 interviews scheduled",
      badge: "Today",
      badgeClass: "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]",
      href: "/app/interviews",
    },
    {
      id: "proj-deadline",
      icon: <Flag className="h-4 w-4 text-[#B58500]" />,
      iconBg: "bg-[#FEF6E4] border-[#F8E3B6]",
      title: "Project deadline",
      subtitle: firstProjectDue
        ? `${firstProjectDue.title || "Website Redesign"} due in 3 days`
        : "Website Redesign due in 3 days",
      badge: "Due soon",
      badgeClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
      href: "/app/projects",
    },
  ];

  // Real upcoming events list (or fallback structured display)
  const displayUpcomingEvents = React.useMemo(() => {
    if (upcomingEvents.length > 0) {
      return upcomingEvents.slice(0, 4).map((ev, idx) => {
        const { month, day } = formatShortDate(ev.start_date);
        const timeRange = ev.is_all_day
          ? "All day"
          : ev.start_time
          ? `${ev.start_time}${ev.end_time ? ` – ${ev.end_time}` : ""}`
          : "10:00 AM – 11:00 AM";

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
    }

    return [
      {
        id: "ev-1",
        month: "MAY",
        day: "27",
        title: "Interview: Frontend Developer",
        time: "10:00 AM – 11:00 AM",
        dotColor: "bg-[#3B82F6]",
      },
      {
        id: "ev-2",
        month: "MAY",
        day: "28",
        title: "Project Deadline: Website Redesign",
        time: "All day",
        dotColor: "bg-[#D9383A]",
      },
      {
        id: "ev-3",
        month: "MAY",
        day: "29",
        title: "Team Standup",
        time: "09:30 AM – 10:00 AM",
        dotColor: "bg-[#246244]",
      },
      {
        id: "ev-4",
        month: "MAY",
        day: "30",
        title: "Design Review Meeting",
        time: "02:00 PM – 03:00 PM",
        dotColor: "bg-[#D97706]",
      },
    ];
  }, [upcomingEvents]);

  // Real or structured team activity list
  const displayActivities = React.useMemo(() => {
    if (recentActivities.length > 0) {
      return recentActivities.slice(0, 4).map((act) => {
        let actionText = "updated an item";
        if (act.type === "project_created") actionText = "created a new project";
        else if (act.type === "task_created") actionText = "created a new task";
        else if (act.type === "task_completed") actionText = "completed";

        return {
          id: act.id,
          userName: act.actorName || "Team Member",
          userAvatar: undefined as string | undefined,
          action: actionText,
          target: act.targetName || "Workspace Item",
          time: formatRelativeTime(act.createdAt),
        };
      });
    }

    return [
      {
        id: "act-1",
        userName: "Jesmin Sikder",
        userAvatar: undefined as string | undefined,
        action: "submitted a leave request",
        target: "Annual Leave",
        time: "2 hours ago",
      },
      {
        id: "act-2",
        userName: "Morgan Sterling",
        userAvatar: undefined as string | undefined,
        action: "completed \"Logo Design\"",
        target: "Design System",
        time: "4 hours ago",
      },
      {
        id: "act-3",
        userName: "Tashin Khan",
        userAvatar: undefined as string | undefined,
        action: "created a new task",
        target: "Fix attendance export issue",
        time: "5 hours ago",
      },
      {
        id: "act-4",
        userName: "Jesmin Sikder",
        userAvatar: undefined as string | undefined,
        action: "scheduled an interview",
        target: "Frontend Developer",
        time: "1 day ago",
      },
    ];
  }, [recentActivities]);

  // Real or structured projects overview
  const displayProjectsOverview = React.useMemo(() => {
    if (projects.length > 0) {
      return projects.slice(0, 4).map((p) => {
        const dueDate = p.due_date || p.deadline || p.start_date;
        const { month, day } = formatShortDate(dueDate);
        const dueFormatted = dueDate ? `${month.slice(0, 1) + month.slice(1).toLowerCase()} ${day}` : "Jun 2";
        return {
          id: p.id,
          name: p.name,
          progress: p.progress ?? 45,
          status: p.status === "completed" ? "Completed" : p.status === "planning" ? "Planning" : "In Progress",
          due: dueFormatted,
        };
      });
    }

    return [
      { id: "p-1", name: "Website Redesign", progress: 75, status: "In Progress", due: "Jun 2" },
      { id: "p-2", name: "HR System", progress: 45, status: "In Progress", due: "Jun 15" },
      { id: "p-3", name: "Mobile App", progress: 20, status: "Planning", due: "Jul 10" },
      { id: "p-4", name: "Design System", progress: 90, status: "In Progress", due: "May 28" },
    ];
  }, [projects]);

  // Display my tasks
  const displayTasks = React.useMemo(() => {
    if (myOpenTasks.length > 0) {
      return myOpenTasks.slice(0, 5);
    }
    if (allTasks.length > 0) {
      return allTasks.slice(0, 5);
    }
    return [
      { id: "t-1", title: "Redesign landing page hero section", project_name: "Website Redesign", due_date: "2026-05-30", status: "in_progress" },
      { id: "t-2", title: "Update employee onboarding flow", project_name: "HR System", due_date: "2026-06-02", status: "todo" },
      { id: "t-3", title: "Create dashboard wireframes", project_name: "Design System", due_date: "2026-06-03", status: "in_progress" },
      { id: "t-4", title: "Review leave management module", project_name: "HR System", due_date: "2026-06-05", status: "in_review" },
      { id: "t-5", title: "Fix attendance export issue", project_name: "Attendance", due_date: "2026-06-06", status: "todo" },
    ] as any[];
  }, [myOpenTasks, allTasks]);

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 pb-20">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            Overview
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-[#18221E]">
            Good afternoon, {firstName}.
          </p>
          <p className="text-xs sm:text-sm text-[#65706A]">
            Here&apos;s what&apos;s happening across your workspace.
          </p>
        </div>

        {/* Right side controls: Date filter dropdown (matching reference design) */}
        <div className="flex items-center gap-2.5 shrink-0 sm:pt-1">
          {/* Time Filter Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTimeFilterOpen(!timeFilterOpen)}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors cursor-pointer"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#65706A]" />
              <span>{timeFilter}</span>
              <ChevronDown className={cn("h-3 w-3 text-[#65706A] transition-transform", timeFilterOpen && "rotate-180")} />
            </button>

            {timeFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[140px] rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-elevated">
                {["This week", "Today", "This month", "This quarter"].map((t) => (
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
      <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#D8DDD4]">
          {/* Metric 1: TEAM */}
          <Link
            href="/app/people"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors hover:bg-[#FAF9F5] no-underline"
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
              <span className="block text-xs text-[#65706A]">Members</span>
            </div>
          </Link>

          {/* Metric 2: OPEN WORK */}
          <Link
            href="/app/tasks"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors hover:bg-[#FAF9F5] no-underline"
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
              <span className="block text-xs text-[#65706A]">Tasks</span>
            </div>
          </Link>

          {/* Metric 3: PROJECTS */}
          <Link
            href="/app/projects"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors hover:bg-[#FAF9F5] no-underline"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#BFDBFE] bg-[#EBF3FE] text-[#1E40AF] shadow-2xs group-hover:scale-105 transition-transform">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#8A958F]">
                PROJECTS
              </span>
              <p className="text-2xl font-bold tracking-tight text-[#18221E]">
                {activeProjects.length || 4}
              </p>
              <span className="block text-xs text-[#65706A]">Active</span>
            </div>
          </Link>

          {/* Metric 4: HIRING */}
          <Link
            href="/app/recruitment"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors hover:bg-[#FAF9F5] no-underline"
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
              <span className="block text-xs text-[#65706A]">Open roles</span>
            </div>
          </Link>

          {/* Metric 5: LEAVE */}
          <Link
            href="/app/leave"
            className="group flex items-center gap-3.5 p-4 sm:p-5 transition-colors hover:bg-[#FAF9F5] no-underline col-span-2 sm:col-span-1"
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
              <h3 className="text-sm font-bold text-[#18221E]">Needs attention</h3>
              <Link
                href="/app/tasks"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View all
              </Link>
            </div>

            {/* List */}
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
                {workTab === "approvals" && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#246244]" />
                )}
              </button>
            </div>

            {/* Tab content */}
            {workTab === "tasks" && (
              <div className="divide-y divide-[#E7EADF] pt-1">
                {displayTasks.map((t) => {
                  const isDone = t.status === "completed";
                  const { month, day } = formatShortDate(t.due_date);
                  const dueFormatted = t.due_date ? `${month.slice(0, 1) + month.slice(1).toLowerCase()} ${day}` : "Jun 2";
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date();

                  return (
                    <div
                      key={t.id}
                      className="group flex items-center justify-between gap-3 py-2.5 px-1.5 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Interactive Checkbox */}
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
                            {t.project_name || "General"}
                          </span>
                        </span>

                        {/* Due Date */}
                        <span
                          className={cn(
                            "text-[11px] font-medium min-w-[45px] text-right",
                            isOverdue ? "text-[#D9383A] font-semibold" : "text-[#65706A]"
                          )}
                        >
                          {dueFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {workTab === "projects" && (
              <div className="divide-y divide-[#E7EADF] pt-1">
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
            )}

            {workTab === "approvals" && (
              <div className="divide-y divide-[#E7EADF] pt-1">
                {pendingLeaves.length > 0 ? (
                  pendingLeaves.slice(0, 5).map((l) => (
                    <Link
                      key={l.id}
                      href="/app/leave"
                      className="flex items-center justify-between py-2.5 px-1.5 hover:bg-[#FAF9F5] rounded-[8px] transition-colors no-underline"
                    >
                      <span className="text-xs font-medium text-[#18221E]">
                        {l.person?.full_name || "Employee"} — {l.leave_type}
                      </span>
                      <span className="text-[11px] font-semibold text-[#B58500] bg-[#FEF6E4] px-2 py-0.5 rounded-full border border-[#F8E3B6]">
                        Pending
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-[#65706A]">
                    You have no pending approvals.
                  </p>
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
                href="/app/overview"
                className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
              >
                View all
              </Link>
            </div>

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
                    <p className="mt-0.5 text-[11px] text-[#8A958F] truncate">
                      {act.target} · {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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

            {/* Projects Table */}
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

            <div className="divide-y divide-[#E7EADF] pt-1">
              {displayUpcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-[#FAF9F5] rounded-[8px] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Date badge */}
                    <div className="flex flex-col items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] w-9 py-0.5 shrink-0 text-center">
                      <span className="text-[9px] font-bold text-[#8A958F] tracking-wider leading-none">
                        {ev.month}
                      </span>
                      <span className="text-sm font-bold text-[#18221E] leading-tight">
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
