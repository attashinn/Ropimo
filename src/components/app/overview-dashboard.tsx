"use client";

import * as React from "react";
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
import { toast } from "sonner";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { TaskPeekPanel } from "@/components/app/task-peek-panel";
import {
  Button,
  IconButton,
  Avatar,
  AvatarStack,
  Kbd,
  Tabs,
  StatusDot,
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

  // Today's formatted date string e.g. "Friday, Oct 9"
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
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="group relative flex h-11 items-center justify-between border-b border-hairline px-2 text-[13px] hover:bg-hover transition-colors duration-120 cursor-pointer select-none rounded-lg"
      >
        {/* Left: Circle Checkbox + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          <button
            type="button"
            onClick={(e) => handleToggleTask(task, e)}
            className={`h-4 w-4 rounded-full border transition-colors duration-120 flex items-center justify-center shrink-0 cursor-pointer ${
              isCompleted
                ? "bg-ink border-ink text-white"
                : "border-hairline hover:border-ink bg-surface"
            }`}
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {isCompleted && <Check className="h-2.5 w-2.5 stroke-[2]" />}
          </button>

          <span
            className={`truncate font-normal ${
              isCompleted ? "text-ink-3 line-through" : "text-ink"
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Middle/Right: Project dot + Due date + Hover actions */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Project Color Dot + Name */}
          <div className="hidden sm:flex items-center gap-1.5 max-w-[120px] truncate">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
              aria-hidden="true"
            />
            <span className="text-[12px] text-ink-2 truncate">{projectName}</span>
          </div>

          {/* Due date */}
          {formattedDue && (
            <span
              className={`text-[12px] tabular-nums ${
                isOverdue ? "text-status-overdue font-normal" : "text-ink-3"
              }`}
            >
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
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-6 space-y-8 font-sans text-ink">
      {/* 1. Header */}
      <header className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-2">
        <div className="flex items-baseline flex-wrap">
          <h1 className="text-[20px] font-semibold text-ink tracking-tight">
            Good morning, {firstName}
          </h1>
          <span className="text-[13px] font-normal text-ink-3 ml-3 tabular-nums select-none">
            {formattedTodayDate}
          </span>
        </div>

        {/* Right buttons: ONE black "New task" (with C hint) and ghost "New project" */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreateProjectModalOpen(true)}
          >
            <span>New project</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>New task</span>
            <Kbd className="bg-white/20 text-white border-transparent">C</Kbd>
          </Button>
        </div>
      </header>

      {/* 2. Stat Strip: Single row, no card, no icons, 5 items separated by vertical hairlines */}
      <section className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-hairline border-y border-hairline py-3">
        {/* Item 1: Open tasks */}
        <Link
          href="/app/my-tasks"
          className="group block p-2 rounded-lg hover:bg-hover/60 transition-colors"
        >
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-ink tabular-nums leading-tight">
              {openTasksCount || tasks.filter((t) => t.status !== "completed").length}
            </span>
            {overdueCount > 0 && (
              <span className="text-[11px] text-status-overdue ml-2 tabular-nums">
                {overdueCount} overdue
              </span>
            )}
          </div>
          <p className="text-[12px] font-normal text-ink-2 mt-0.5">Open tasks</p>
        </Link>

        {/* Item 2: Due this week */}
        <Link
          href="/app/my-tasks"
          className="group block p-2 rounded-lg hover:bg-hover/60 transition-colors"
        >
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-ink tabular-nums leading-tight">
              {dueTodayCount || todayTasks.length}
            </span>
            {todayTasks.length > 0 && (
              <span className="text-[11px] text-ink-3 ml-2 tabular-nums">
                today
              </span>
            )}
          </div>
          <p className="text-[12px] font-normal text-ink-2 mt-0.5">Due this week</p>
        </Link>

        {/* Item 3: Active projects */}
        <Link
          href="/app/projects"
          className="group block p-2 rounded-lg hover:bg-hover/60 transition-colors"
        >
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-ink tabular-nums leading-tight">
              {projects.length}
            </span>
          </div>
          <p className="text-[12px] font-normal text-ink-2 mt-0.5">Active projects</p>
        </Link>

        {/* Item 4: Open roles */}
        <Link
          href="/app/people"
          className="group block p-2 rounded-lg hover:bg-hover/60 transition-colors"
        >
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-ink tabular-nums leading-tight">
              {openJobsCount || jobOpenings.length}
            </span>
            {candidates.length > 0 && (
              <span className="text-[11px] text-ink-3 ml-2 tabular-nums">
                +{candidates.length} candidates
              </span>
            )}
          </div>
          <p className="text-[12px] font-normal text-ink-2 mt-0.5">Open roles</p>
        </Link>

        {/* Item 5: Pending leave */}
        <Link
          href="/app/leave"
          className="group block p-2 rounded-lg hover:bg-hover/60 transition-colors"
        >
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-ink tabular-nums leading-tight">
              {pendingLeavesCount || pendingLeaves.length}
            </span>
          </div>
          <p className="text-[12px] font-normal text-ink-2 mt-0.5">Pending leave</p>
        </Link>
      </section>

      {/* 3. Two columns below (65% / 35%), separated by vertical hairline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-0 pt-2">
        {/* Left Column (65%): "My tasks" with Tabs */}
        <div className="lg:col-span-8 lg:pr-8 lg:border-r lg:border-hairline space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-[14px] font-semibold text-ink">My tasks</h2>
          </div>

          {/* Underline Tabs: Tasks / Projects / Approvals */}
          <Tabs
            tabs={tabsConfig}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab 1: Tasks list grouped by Overdue, Today, Upcoming */}
          {activeTab === "tasks" && (
            <div className="space-y-6 pt-2">
              {/* Group 1: Overdue */}
              {overdueTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[12px] font-medium text-status-overdue">
                      Overdue ({overdueTasks.length})
                    </span>
                  </div>
                  <div>
                    {overdueTasks.map((task) => renderTaskRow(task, true))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateTaskModalOpen(true)}
                    className="h-8 flex items-center gap-2 px-2 text-[12px] text-ink-3 hover:text-ink hover:bg-hover/60 rounded-lg cursor-pointer transition-colors duration-120 w-full"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    <span>Add task</span>
                  </button>
                </div>
              )}

              {/* Group 2: Today */}
              {todayTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[12px] font-medium text-ink-2">
                      Today ({todayTasks.length})
                    </span>
                  </div>
                  <div>
                    {todayTasks.map((task) => renderTaskRow(task, false))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateTaskModalOpen(true)}
                    className="h-8 flex items-center gap-2 px-2 text-[12px] text-ink-3 hover:text-ink hover:bg-hover/60 rounded-lg cursor-pointer transition-colors duration-120 w-full"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    <span>Add task</span>
                  </button>
                </div>
              )}

              {/* Group 3: Upcoming */}
              {upcomingTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[12px] font-medium text-ink-2">
                      Upcoming ({upcomingTasks.length})
                    </span>
                  </div>
                  <div>
                    {upcomingTasks.map((task) => renderTaskRow(task, false))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateTaskModalOpen(true)}
                    className="h-8 flex items-center gap-2 px-2 text-[12px] text-ink-3 hover:text-ink hover:bg-hover/60 rounded-lg cursor-pointer transition-colors duration-120 w-full"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    <span>Add task</span>
                  </button>
                </div>
              )}

              {/* If no tasks in any group */}
              {overdueTasks.length === 0 &&
                todayTasks.length === 0 &&
                upcomingTasks.length === 0 && (
                  <EmptyLine
                    message="No open tasks right now."
                    actionText="Create one"
                    onAction={() => setCreateTaskModalOpen(true)}
                  />
                )}
            </div>
          )}

          {/* Tab 2: Projects */}
          {activeTab === "projects" && (
            <div className="space-y-1 pt-2">
              {projects.length > 0 ? (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onMouseEnter={() => router.prefetch(`/app/projects/${proj.id}`)}
                    onClick={() => router.push(`/app/projects/${proj.id}`)}
                    className="flex h-11 items-center justify-between border-b border-hairline px-2 text-[13px] hover:bg-hover transition-colors duration-120 cursor-pointer rounded-lg"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || "#3B63F0" }}
                      />
                      <span className="text-ink font-normal truncate">
                        {proj.name}
                      </span>
                    </div>
                    <span className="text-[12px] text-ink-3">
                      {proj.status || "Active"}
                    </span>
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
            <div className="space-y-1 pt-2">
              {approvalTasks.length > 0 ? (
                approvalTasks.map((task) => renderTaskRow(task, false))
              ) : (
                <EmptyLine
                  message="No items awaiting approval."
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column (35%): "Up next" & optional "Needs attention" */}
        <div className="lg:col-span-4 lg:pl-8 space-y-6 pt-6 lg:pt-0">
          {/* Up next: Today's meetings as simple vertical timeline */}
          <div className="space-y-3">
            <h2 className="text-[14px] font-semibold text-ink">Up next</h2>

            {todayEvents.length > 0 ? (
              <div className="space-y-2.5">
                {todayEvents.map((evt) => {
                  const time = evt.start_time
                    ? evt.start_time.includes("T") || evt.start_time.includes("-")
                      ? (() => {
                          const d = new Date(evt.start_time);
                          return isNaN(d.getTime())
                            ? evt.start_time
                            : d.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              });
                        })()
                      : evt.start_time
                    : "Today";

                  return (
                    <div
                      key={evt.id}
                      onMouseEnter={() => router.prefetch("/app/calendar")}
                      onClick={() => router.push("/app/calendar")}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover transition-colors duration-120 cursor-pointer"
                    >
                      <span className="text-[12px] tabular-nums text-ink-3 w-14 shrink-0 font-normal">
                        {time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-normal text-ink truncate">
                          {evt.title}
                        </p>
                      </div>
                      <Video className="h-3.5 w-3.5 stroke-[1.5] text-ink-3 shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyLine
                message="No upcoming events today."
                actionText="Schedule one"
                onAction={() => router.push("/app/calendar")}
              />
            )}
          </div>

          {/* Needs attention: rendered ONLY if there are items */}
          {attentionItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-hairline">
              <h2 className="text-[14px] font-semibold text-ink">Needs attention</h2>

              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-hairline bg-surface hover:bg-hover transition-colors duration-120 text-[13px]"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-normal text-ink truncate">{item.title}</p>
                      <span className="text-[11px] text-ink-3">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 stroke-[1.5] text-ink-3 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Bottom: "Activity" as a compact feed (6 items with View all) */}
      <section className="pt-6 border-t border-hairline space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink">Activity</h2>
          <Link
            href="/app/my-tasks"
            className="text-[12px] font-medium text-ink-2 hover:text-ink transition-colors"
          >
            View all
          </Link>
        </div>

        {recentActivities && recentActivities.length > 0 ? (
          <div className="divide-y divide-hairline">
            {recentActivities.slice(0, 6).map((act) => {
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
                  <Avatar name={actorName} size={20} accent="blue" />
                  <span className="text-ink truncate font-normal">
                    {formatActivityText(act)}
                  </span>
                  <span className="text-[12px] tabular-nums text-ink-3 shrink-0 ml-auto pl-3">
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
