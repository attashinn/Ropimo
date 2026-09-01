"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CheckSquare,
  Clock,
  FolderKanban,
  Building2,
  CalendarDays,
  LogIn,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Flag,
  Calendar,
  Inbox,
  Briefcase,
  User,
  BarChart3,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, CategorizedTasks } from "@/types/task";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { UserContext } from "@/types/permissions";
import { AttendanceRecord, AttendanceState } from "@/types/attendance";
import { LeaveBalance, LeaveRequest } from "@/types/leave";
import { CalendarEvent } from "@/types/calendar";
import { WorkspaceActivityItem } from "@/lib/task/queries";
import { MemberDeptSummary } from "@/lib/overview/member-queries";
import { checkInAction, checkOutAction } from "@/lib/attendance/actions";
// Re-export shape for clarity
type CheckActionResult = { success: boolean; error?: string; data?: unknown };
import { toggleTaskCompletionAction } from "@/lib/task/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberDashboardProps {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userContext: UserContext | null;
  myTasks: CategorizedTasks;
  myProjects: Project[];
  myDepartments: MemberDeptSummary[];
  attendanceState: {
    state: AttendanceState;
    record: AttendanceRecord | null;
    workedMinutes: number;
  };
  leaveBalance: LeaveBalance[];
  recentLeaveRequests: LeaveRequest[];
  recentActivity: WorkspaceActivityItem[];
  upcomingEvents: CalendarEvent[];
}

type TaskTab = "all" | "today" | "upcoming" | "completed";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatWorkedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const taskDateStr = d.toISOString().split("T")[0];

  if (taskDateStr === todayStr) return "Today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (taskDateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-50 border-red-200" },
  high: { label: "High", color: "text-orange-600 bg-orange-50 border-orange-200" },
  medium: { label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
  low: { label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
};

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-[#F4F3EE] text-[#65706A]" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700" },
  in_review: { label: "In Review", color: "bg-purple-50 text-purple-700" },
  completed: { label: "Completed", color: "bg-green-50 text-green-700" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[14px] border border-[#E7EADF] bg-white p-4 shadow-2xs flex items-center gap-4"
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]", color)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#65706A] uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-[#18221E] leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[#8A958F] mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function TaskRow({
  task,
  workspaceId,
  onComplete,
}: {
  task: Task;
  workspaceId: string;
  onComplete: (taskId: string, current: boolean) => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isCompleted = task.status === "completed";

  return (
    <div className="group flex items-center gap-3 py-2.5 px-1 rounded-[10px] hover:bg-[#FAF9F5] transition-colors">
      <button
        type="button"
        onClick={() => onComplete(task.id, isCompleted)}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          isCompleted
            ? "border-[#10251F] bg-[#10251F]"
            : "border-[#C4CDC7] hover:border-[#10251F]"
        )}
      >
        {isCompleted && <Check size={10} className="text-[#C7F34A]" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium text-[#18221E] truncate", isCompleted && "line-through text-[#8A958F]")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project && (
            <span className="text-[10px] text-[#65706A] truncate max-w-[120px]">{task.project.name}</span>
          )}
          {task.department && !task.project && (
            <span className="text-[10px] text-[#65706A] truncate">{task.department.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("px-1.5 py-0.5 rounded-[4px] border text-[10px] font-medium", priorityCfg.color)}>
          {priorityCfg.label}
        </span>
        {task.due_date && (
          <span className="text-[10px] text-[#65706A]">{formatRelativeDate(task.due_date)}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export function MemberDashboard({
  workspaceId,
  workspaceName,
  userId,
  userName,
  userContext,
  myTasks,
  myProjects,
  myDepartments,
  attendanceState,
  leaveBalance,
  recentLeaveRequests,
  recentActivity,
  upcomingEvents,
}: MemberDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<TaskTab>("all");
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [localState, setLocalState] = React.useState(attendanceState.state);
  const [localWorkedMinutes, setLocalWorkedMinutes] = React.useState(attendanceState.workedMinutes);

  // Task state for optimistic completion
  const allMyTasks = [
    ...myTasks.overdue,
    ...myTasks.today,
    ...myTasks.upcoming,
    ...myTasks.noDueDate,
  ];
  const [taskStates, setTaskStates] = React.useState<Record<string, boolean>>({});

  const handleToggleTask = async (taskId: string, currentlyCompleted: boolean) => {
    setTaskStates((prev) => ({ ...prev, [taskId]: !currentlyCompleted }));
    await toggleTaskCompletionAction(taskId, workspaceId, !currentlyCompleted);
  };

  const isOverrideCompleted = (task: Task) =>
    taskStates[task.id] !== undefined ? taskStates[task.id] : task.status === "completed";

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const result = await checkInAction({ workspaceId }) as CheckActionResult;
      if (result.success) setLocalState("Checked In");
    } catch {
      // ignore
    }
    setCheckingIn(false);
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      const result = await checkOutAction({ workspaceId }) as CheckActionResult;
      if (result.success) setLocalState("Checked Out");
    } catch {
      // ignore
    }
    setCheckingIn(false);
  };

  // Tasks for current tab
  const displayTasks = React.useMemo((): Task[] => {
    switch (activeTab) {
      case "today":
        return myTasks.today;
      case "upcoming":
        return [...myTasks.upcoming, ...myTasks.noDueDate];
      case "completed":
        return myTasks.completed;
      default:
        return allMyTasks;
    }
  }, [activeTab, myTasks]);

  const totalOpen = allMyTasks.length;
  const dueToday = myTasks.today.length;
  const overdue = myTasks.overdue.length;

  // Leave balance helpers
  const annualBalance = leaveBalance.find((b) => b.leave_type === "Annual Leave");
  const sickBalance = leaveBalance.find((b) => b.leave_type === "Sick Leave");
  const personalBalance = leaveBalance.find((b) => b.leave_type === "Personal Leave");

  const isDeptLead = userContext?.isDeptLead ?? false;
  const firstName = getFirstName(userName);

  return (
    <div className="space-y-7">
      {/* ── Greeting Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#18221E]">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-[#65706A]">
            Here&apos;s what&apos;s happening with your work today.
          </p>
          {isDeptLead && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#246244] bg-[#EAF4E2] border border-[#C2E0C8] rounded-full px-2.5 py-0.5">
              <Building2 size={11} />
              Department Lead
            </span>
          )}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-[#65706A]">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-xs font-medium text-[#18221E] mt-0.5">{workspaceName}</p>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CheckSquare}
          label="Open Tasks"
          value={totalOpen}
          sub={overdue > 0 ? `${overdue} overdue` : "All on track"}
          color="bg-[#EAF4E2] text-[#246244]"
        />
        <StatCard
          icon={Flag}
          label="Due Today"
          value={dueToday}
          sub={dueToday > 0 ? "Need attention" : "Nothing due today"}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={myProjects.length}
          sub={myProjects.length === 0 ? "No projects yet" : "Active"}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={myDepartments.length}
          sub={myDepartments.length === 0 ? "Not assigned" : myDepartments.map((d) => d.department.name).join(", ")}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Tasks + Projects */}
        <div className="xl:col-span-2 space-y-6">
          {/* My Tasks */}
          <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2">
                <CheckSquare size={15} className="text-[#246244]" />
                My Tasks
              </h2>
              <Link
                href="/app/my-tasks"
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 pb-2 border-b border-[#E7EADF]">
              {(["all", "today", "upcoming", "completed"] as TaskTab[]).map((tab) => {
                const count =
                  tab === "all"
                    ? allMyTasks.length
                    : tab === "today"
                    ? myTasks.today.length
                    : tab === "upcoming"
                    ? myTasks.upcoming.length + myTasks.noDueDate.length
                    : myTasks.completed.length;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all",
                      activeTab === tab
                        ? "bg-[#10251F] text-[#C7F34A]"
                        : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="ml-1.5 tabular-nums opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Task list */}
            <div className="px-4 py-2 max-h-[380px] overflow-y-auto">
              {displayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EAF4E2] flex items-center justify-center mb-3">
                    <CheckSquare size={18} className="text-[#246244]" />
                  </div>
                  <p className="text-sm font-semibold text-[#18221E]">
                    {activeTab === "completed" ? "No completed tasks yet." : "You're all caught up!"}
                  </p>
                  <p className="text-xs text-[#65706A] mt-1">
                    {activeTab === "all" ? "No tasks assigned to you yet." : ""}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F4F3EE]">
                  {displayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      workspaceId={workspaceId}
                      onComplete={handleToggleTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Projects */}
          <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2">
                <FolderKanban size={15} className="text-blue-600" />
                My Projects
              </h2>
              <Link
                href="/app/projects"
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {myProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-5">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <FolderKanban size={18} className="text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-[#18221E]">No projects assigned yet.</p>
                <p className="text-xs text-[#65706A] mt-1">Projects you join or are assigned to will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 pb-5">
                {myProjects.slice(0, 6).map((project) => (
                  <Link key={project.id} href={`/app/projects/${project.slug || project.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="rounded-[12px] border border-[#E7EADF] p-3.5 hover:border-[#B8C0B2] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: project.color || "#10251F" }}
                        >
                          {project.icon || (project.name ? project.name[0] : "P")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#18221E] truncate">{project.name}</p>
                          {project.department_name && (
                            <p className="text-[10px] text-[#65706A] truncate">{project.department_name}</p>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-[#F4F3EE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10251F] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-[#65706A]">
                          {project.completed_tasks ?? 0}/{project.total_tasks ?? 0} tasks
                        </span>
                        <span className="text-[10px] font-semibold text-[#18221E]">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Sidebar cards */}
        <div className="space-y-4">
          {/* My Department */}
          {myDepartments.length > 0 ? (
            myDepartments.map((deptSummary) => (
              <div
                key={deptSummary.department.id}
                className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2">
                    <Building2 size={14} className="text-[#246244]" />
                    My Department
                  </h2>
                  <Link
                    href={`/app/departments/${deptSummary.department.slug || deptSummary.department.id}`}
                    className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] flex items-center gap-1"
                  >
                    View <ChevronRight size={11} />
                  </Link>
                </div>

                <div className="rounded-[10px] bg-[#FAF9F5] border border-[#E7EADF] p-3">
                  <p className="text-xs font-bold text-[#18221E]">{deptSummary.department.name}</p>
                  {deptSummary.leadName && (
                    <p className="text-[10px] text-[#65706A] mt-0.5">Lead: {deptSummary.leadName}</p>
                  )}
                  <div className="flex gap-3 mt-2.5">
                    <div className="text-center">
                      <p className="text-base font-bold text-[#18221E]">{deptSummary.memberCount}</p>
                      <p className="text-[9px] text-[#65706A]">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-[#18221E]">{deptSummary.openTaskCount}</p>
                      <p className="text-[9px] text-[#65706A]">Open Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-[#18221E]">{deptSummary.activeProjectCount}</p>
                      <p className="text-[9px] text-[#65706A]">Projects</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs p-4">
              <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-[#65706A]" />
                My Department
              </h2>
              <div className="flex flex-col items-center py-5 text-center">
                <div className="w-9 h-9 rounded-full bg-[#F4F3EE] flex items-center justify-center mb-2">
                  <Building2 size={16} className="text-[#8A958F]" />
                </div>
                <p className="text-xs font-semibold text-[#18221E]">Not assigned to a department</p>
                <p className="text-[10px] text-[#65706A] mt-0.5">Ask your admin to add you.</p>
              </div>
            </div>
          )}

          {/* My Attendance */}
          <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2">
                <Clock size={14} className="text-[#246244]" />
                Attendance
              </h2>
              <Link href="/app/attendance" className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] flex items-center gap-1">
                History <ChevronRight size={11} />
              </Link>
            </div>

            <div className="rounded-[10px] bg-[#FAF9F5] border border-[#E7EADF] p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-[#18221E]">Today</p>
                  <p
                    className={cn(
                      "text-[11px] font-medium mt-0.5",
                      localState === "Checked In" ? "text-[#246244]" :
                      localState === "Checked Out" ? "text-[#18221E]" :
                      localState === "On Leave" ? "text-blue-600" : "text-[#65706A]"
                    )}
                  >
                    {localState}
                  </p>
                </div>
                {localState === "Checked In" && (
                  <div className="text-right">
                    <p className="text-[10px] text-[#65706A]">Working</p>
                    <p className="text-xs font-bold text-[#18221E]">{formatWorkedTime(localWorkedMinutes)}</p>
                  </div>
                )}
              </div>

              {localState === "Not Checked In" && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full mt-1 py-1.5 rounded-[8px] bg-[#10251F] text-[#C7F34A] text-xs font-semibold hover:bg-[#1A3828] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LogIn size={13} />
                  {checkingIn ? "Checking in..." : "Check In"}
                </button>
              )}

              {localState === "Checked In" && (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={checkingIn}
                  className="w-full mt-1 py-1.5 rounded-[8px] border border-[#D8DDD4] bg-white text-[#18221E] text-xs font-semibold hover:bg-[#FAF9F5] transition-colors disabled:opacity-50"
                >
                  {checkingIn ? "Checking out..." : "Check Out"}
                </button>
              )}
            </div>
          </div>

          {/* My Leave */}
          <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2">
                <CalendarDays size={14} className="text-[#246244]" />
                Leave Balance
              </h2>
              <Link href="/app/leave" className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] flex items-center gap-1">
                Manage <ChevronRight size={11} />
              </Link>
            </div>

            <div className="space-y-2">
              {leaveBalance.length === 0 ? (
                <p className="text-xs text-[#65706A] text-center py-3">No leave data available.</p>
              ) : (
                leaveBalance.map((bal) => (
                  <div
                    key={bal.leave_type}
                    className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#FAF9F5] border border-[#E7EADF]"
                  >
                    <span className="text-[11px] font-medium text-[#18221E] truncate">{bal.leave_type.replace(" Leave", "")}</span>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#10251F]">{bal.remaining}</span>
                      <span className="text-[10px] text-[#65706A]">/{bal.allocated} days</span>
                    </div>
                  </div>
                ))
              )}

              <Link
                href="/app/leave"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-[8px] border border-[#D8DDD4] text-[11px] font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors mt-1"
              >
                <Plus size={11} />
                Request Leave
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[16px] border border-[#E7EADF] bg-white shadow-2xs p-4">
            <h2 className="text-sm font-bold text-[#18221E] flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#246244]" />
              Recent Activity
            </h2>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center py-5 text-center">
                <div className="w-9 h-9 rounded-full bg-[#F4F3EE] flex items-center justify-center mb-2">
                  <Inbox size={14} className="text-[#8A958F]" />
                </div>
                <p className="text-xs text-[#65706A]">No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        act.type === "task_completed" ? "bg-green-50" :
                        act.type === "project_created" ? "bg-blue-50" : "bg-[#EAF4E2]"
                      )}
                    >
                      {act.type === "task_completed" ? (
                        <Check size={10} className="text-green-600" />
                      ) : act.type === "project_created" ? (
                        <FolderKanban size={10} className="text-blue-600" />
                      ) : (
                        <CheckSquare size={10} className="text-[#246244]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#18221E] leading-snug">
                        <span className="font-semibold">{act.actorName}</span>{" "}
                        {act.type === "project_created" ? "created project" : act.type === "task_completed" ? "completed" : "added task"}{" "}
                        <span className="font-medium">"{act.targetName}"</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
