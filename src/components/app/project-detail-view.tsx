"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  User,
  Building2,
  Folder,
  Flag,
  CircleDot,
  MoreHorizontal,
  Bookmark,
  Check,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Activity as ActivityIcon,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { Workspace } from "@/types/workspace";
import { Task, TaskPriority, TaskStatus } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { updateProjectAction, deleteProjectAction } from "@/lib/project/actions";
import { toggleTaskCompletionAction } from "@/lib/task/actions";
import { CreateTaskModal } from "./create-task-modal";
import { TaskDetailModal } from "./task-detail-modal";
import { EditProjectModal } from "./edit-project-modal";
import { DeleteProjectDialog } from "./delete-project-dialog";

import { ProjectGroupedListView } from "./projects/project-grouped-list-view";

export interface ProjectDetailViewProps {
  project: Project;
  workspace: Workspace;
  tasks?: Task[];
  people?: WorkspacePerson[];
  projects?: Project[];
  departments?: Department[];
}

type TabKey = "list" | "overview" | "timeline" | "calendar" | "messages" | "tasks" | "members" | "files" | "activity";

export function ProjectDetailView({
  project,
  workspace,
  tasks = [],
  people = [],
  projects = [],
  departments = [],
}: ProjectDetailViewProps) {
  const router = useRouter();

  // Tab State - Default to 'list' as in modern project suites
  const [activeTab, setActiveTab] = React.useState<TabKey>("list");
  const [isStarred, setIsStarred] = React.useState(false);
  const [taskFilter, setTaskFilter] = React.useState<"all" | "todo" | "in_progress" | "completed">("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = React.useState<string>("all");

  // Modals
  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const headerMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. STATS & METRICS
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = projectTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
  const openTasks = projectTasks.filter((t) => t.status !== "completed").length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overdue tasks calculation
  const overdueTasks = projectTasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    return new Date(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
  }).length;

  // Department & Lead
  const department = departments.find((d) => d.id === project.department_id);
  const leadPerson = people.find((p) => p.user_id === project.manager_id || p.user_id === project.lead_id) || people[0];

  // Project Members
  const projectMembers = React.useMemo(() => {
    const memberMap = new Map<string, { person: WorkspacePerson; tasksCount: number }>();
    if (leadPerson) {
      memberMap.set(leadPerson.user_id, { person: leadPerson, tasksCount: 0 });
    }
    projectTasks.forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const p = people.find((x) => x.user_id === a.user_id) || a;
        if (p && p.user_id) {
          const curr = memberMap.get(p.user_id) || { person: p, tasksCount: 0 };
          curr.tasksCount += 1;
          memberMap.set(p.user_id, curr);
        }
      });
    });
    return Array.from(memberMap.values());
  }, [projectTasks, people, leadPerson]);

  // Project Files
  const projectFiles = React.useMemo(() => {
    const files: { id: string; name: string; size: number; type: string; url: string; uploaderName: string; createdAt: string }[] = [];
    projectTasks.forEach((t) => {
      (t.attachments || []).forEach((att) => {
        files.push({
          id: att.id,
          name: att.file_name,
          size: att.file_size,
          type: att.file_type,
          url: att.file_url,
          uploaderName: att.uploader?.full_name || "Workspace Member",
          createdAt: att.created_at,
        });
      });
    });
    return files;
  }, [projectTasks]);

  // Project Activities
  const projectActivities = React.useMemo(() => {
    const acts: { id: string; userName: string; action: string; time: string; createdAt: string }[] = [];
    projectTasks.forEach((t) => {
      (t.activities || []).forEach((act) => {
        acts.push({
          id: act.id,
          userName: act.user_name || "Workspace Member",
          action: `${act.action_type.replace(/_/g, " ")} on "${t.title}"`,
          time: new Date(act.created_at).toLocaleDateString(),
          createdAt: act.created_at,
        });
      });
    });
    acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return acts;
  }, [projectTasks]);

  // Task status toggle
  const handleToggleTask = async (taskId: string, currentStatus: TaskStatus) => {
    try {
      const isCompleted = currentStatus === "completed";
      await toggleTaskCompletionAction(taskId, workspace.id, !isCompleted);
      router.refresh();
    } catch {}
  };

  // Filtered tasks for Work tab
  const filteredTasks = projectTasks.filter((t) => {
    const matchesFilter =
      taskFilter === "all" ||
      (taskFilter === "completed" && t.status === "completed") ||
      (taskFilter === "in_progress" && (t.status === "in_progress" || t.status === "in_review")) ||
      (taskFilter === "todo" && (t.status === "todo" || t.status === "blocked"));

    const matchesPriority =
      taskPriorityFilter === "all" || t.priority === taskPriorityFilter;

    return matchesFilter && matchesPriority;
  });

  return (
    <div className="space-y-6 font-sans text-[#18221E] pb-16">
      {/* ── BREADCRUMBS ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <span>{workspace.name || "brnnd"}</span>
        <span>/</span>
        <Link href="/app/departments" className="hover:text-[#18221E] transition-colors">
          Departments
        </Link>
        <span>/</span>
        {department && (
          <>
            <Link
              href={`/app/departments/${department.id}`}
              className="hover:text-[#18221E] transition-colors"
            >
              {department.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="font-semibold text-[#18221E]">{project.name}</span>
      </div>

      {/* ── ASANA-STYLE PROJECT HERO HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[16px] border border-[#E5E8E1] shadow-2xs">
        {/* Left: Project Icon + Title + Dropdown & Star */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FF6B6B] text-white shadow-2xs">
            <Bookmark className="w-5 h-5 fill-white" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18221E]">
              {project.name}
            </h1>

            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="text-[#8A958F] hover:text-[#18221E] transition-colors cursor-pointer"
              title="Project settings"
            >
              <MoreHorizontal size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={`transition-colors cursor-pointer ${
                isStarred ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#8A958F] hover:text-[#F59E0B]"
              }`}
              title="Star project"
            >
              ★
            </button>
          </div>
        </div>

        {/* Right: Member Avatars Stack + Share + Customize */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stacked Member Avatars */}
          <div className="flex items-center -space-x-2 overflow-hidden">
            {people.slice(0, 4).map((p, i) => (
              <div
                key={p.id || i}
                className="inline-block h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-[#10251F] text-white text-[10px] font-bold flex items-center justify-center"
                title={p.full_name || undefined}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url || ""} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{p.full_name ? p.full_name[0].toUpperCase() : "U"}</span>
                )}
              </div>
            ))}
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4] text-[10px] font-bold text-[#65706A] ring-2 ring-white">
              +{Math.max(projectMembers.length, 45)}
            </div>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard?.writeText(window.location.href);
                alert("Project link copied to clipboard!");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#2563EB] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer shadow-2xs"
          >
            <Users size={13} />
            <span>Share</span>
          </button>

          {/* Customize Button */}
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal size={13} className="text-[#65706A]" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* ── HORIZONTAL NAVIGATION TABS ─────────────────────────────────── */}
      <div className="border-b border-[#E7EADF]">
        <nav className="flex gap-6 text-xs font-semibold">
          {[
            { key: "list", label: "List" },
            { key: "timeline", label: "Timeline" },
            { key: "calendar", label: "Calendar" },
            { key: "messages", label: "Messages" },
            { key: "overview", label: "Overview" },
            { key: "files", label: `Files (${projectFiles.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`pb-3 relative transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "text-[#18221E] font-bold"
                  : "text-[#65706A] hover:text-[#18221E]"
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeProjectDetailTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10251F]"
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB: LIST (ASANA GROUPED LIST VIEW) ─────────────────────────── */}
      {activeTab === "list" && (
        <ProjectGroupedListView
          project={project}
          tasks={tasks}
          people={people}
          departments={departments}
          onSelectTask={(task) => setSelectedTask(task)}
          onOpenCreateModal={() => setCreateTaskModalOpen(true)}
        />
      )}

      {/* ── TAB: OVERVIEW ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (68% / 8 COLS) ───────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* SECTION 1: CURRENT WORK */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Current Work
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className="text-xs font-semibold text-[#10251F] hover:underline"
                >
                  View all tasks →
                </button>
              </div>

              {/* Status Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{openTasks}</span>
                  <span className="text-[11px] text-[#65706A] block">Open</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#3B82F6] h-full w-3/4 rounded-full" />
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{inProgressTasks}</span>
                  <span className="text-[11px] text-[#65706A] block">In progress</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#F59E0B] h-full w-1/2 rounded-full" />
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{overdueTasks}</span>
                  <span className="text-[11px] text-[#65706A] block">Overdue</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#EF4444] h-full w-full rounded-full" />
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{completedTasks}</span>
                  <span className="text-[11px] text-[#65706A] block">Completed</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#10B981] h-full w-full rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TODAY & UPCOMING TASKS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Today & Upcoming Tasks
                </h2>
                <button
                  type="button"
                  onClick={() => setCreateTaskModalOpen(true)}
                  className="text-xs font-semibold text-[#10251F] hover:underline"
                >
                  + New Task
                </button>
              </div>

              {projectTasks.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-5 text-center">
                  <p className="text-xs text-[#65706A]">No tasks created for this project yet.</p>
                  <button
                    type="button"
                    onClick={() => setCreateTaskModalOpen(true)}
                    className="mt-2.5 rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors"
                  >
                    Create First Task
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E7EADF]">
                  {projectTasks.slice(0, 5).map((task) => {
                    const isDone = task.status === "completed";
                    const assignee = (task.assignees || [])[0];
                    const assigneePerson = people.find((p) => p.user_id === assignee?.user_id) || assignee;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3 group cursor-pointer hover:bg-[#FAF9F5]/70 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(task.id, task.status);
                            }}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                              isDone
                                ? "border-[#246244] bg-[#246244] text-white"
                                : "border-[#D8DDD4] hover:border-[#10251F] bg-white"
                            }`}
                          >
                            {isDone && <span className="text-[10px] leading-none">✓</span>}
                          </button>
                          <span
                            className={`text-xs truncate block group-hover:text-[#10251F] ${
                              isDone ? "text-[#8A958F] line-through" : "font-semibold text-[#18221E]"
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4.5 h-4.5 rounded-full bg-[#10251F] text-white flex items-center justify-center text-[8px] font-bold">
                              {assigneePerson?.full_name ? assigneePerson.full_name[0] : "TK"}
                            </div>
                            <span className="text-xs text-[#65706A] hidden sm:inline">
                              {assigneePerson?.full_name || "Tashin Khan"}
                            </span>
                          </div>

                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              task.priority === "urgent" || task.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]"
                            }`}
                          >
                            {task.priority || "Medium"}
                          </span>

                          {task.due_date && (
                            <span className="text-[10px] text-[#8A958F]">
                              {new Date(task.due_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 3: RECENT ACTIVITY */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Recent Activity
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className="text-xs font-semibold text-[#10251F] hover:underline"
                >
                  View all activity →
                </button>
              </div>

              {projectActivities.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-5 text-center text-xs text-[#65706A]">
                  No recent activities recorded for this project.
                </div>
              ) : (
                <div className="space-y-3">
                  {projectActivities.slice(0, 3).map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF9F5] text-[#10251F] border border-[#D8DDD4]">
                        <ActivityIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[#18221E]">
                          <span className="font-semibold">{act.userName}</span> {act.action}
                        </p>
                        <span className="text-[10px] text-[#8A958F]">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN (32% / 4 COLS) ──────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            {/* CARD 1: TEAM MEMBERS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Team Members
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("members")}
                  className="text-xs font-semibold text-[#10251F] hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="space-y-2.5">
                {projectMembers.map(({ person }) => (
                  <div key={person.user_id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-white">
                        {person.full_name ? person.full_name[0] : "U"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#18221E] truncate block">
                          {person.full_name}
                        </span>
                        <span className="text-[10px] text-[#65706A] truncate block">
                          {person.job_title || "Team Member"}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A] border border-[#D8DDD4] shrink-0">
                      {person.user_id === leadPerson?.user_id ? "Lead" : "Member"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 2: NEEDS ATTENTION */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                Needs Attention
              </h2>
              {overdueTasks > 0 ? (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <span className="font-bold block">{overdueTasks} Overdue Tasks</span>
                    <span className="text-[11px] opacity-90">Please review task milestones and due dates.</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 flex items-start gap-2.5">
                  <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                  <div className="text-xs text-[#18221E]">
                    <span className="font-bold block">All caught up</span>
                    <span className="text-[11px] text-[#65706A]">Nothing requires immediate attention.</span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: PROJECT DETAILS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Project Details
                </h2>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#65706A] hover:text-[#18221E] px-2 py-0.5 rounded border border-[#D8DDD4] hover:bg-[#FAF9F5]"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1 border-b border-[#F4F3EE]">
                  <span className="text-[#65706A]">Department</span>
                  <span className="font-semibold text-[#18221E]">{department ? department.name : "Development"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F4F3EE]">
                  <span className="text-[#65706A]">Project Lead</span>
                  <span className="font-semibold text-[#18221E]">{leadPerson?.full_name || "Tashin Khan"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F4F3EE]">
                  <span className="text-[#65706A]">Start Date</span>
                  <span className="text-[#18221E]">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F4F3EE]">
                  <span className="text-[#65706A]">Due Date</span>
                  <span className="text-[#18221E]">
                    {project.due_date ? new Date(project.due_date).toLocaleDateString() : "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#65706A]">Created</span>
                  <span className="text-[#18221E]">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Apr 19, 2026"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: WORK / TASKS ──────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as any)}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1.5 text-xs text-[#18221E]"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1.5 text-xs text-[#18221E]"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setCreateTaskModalOpen(true)}
              className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18342C]"
            >
              + Create Task
            </button>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center text-xs text-[#65706A]">
              No tasks found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7EADF] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7EADF]">
                  {filteredTasks.map((t) => {
                    const assignee = (t.assignees || [])[0];
                    const assigneePerson = people.find((p) => p.user_id === assignee?.user_id) || assignee;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-[#F4F3EE] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 font-semibold text-[#18221E] group-hover:text-[#10251F]">
                          {t.title}
                        </td>
                        <td className="py-3 px-3 text-[#65706A]">
                          {assigneePerson?.full_name || "Tashin Khan"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              t.priority === "urgent" || t.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]"
                            }`}
                          >
                            {t.priority || "Medium"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium capitalize text-[#18221E]">
                          {t.status.replace("_", " ")}
                        </td>
                        <td className="py-3 px-3 text-[#8A958F]">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MEMBERS ───────────────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#18221E]">
            Project Members ({projectMembers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectMembers.map(({ person, tasksCount }) => (
              <div
                key={person.user_id}
                className="flex items-center justify-between p-3.5 rounded-[12px] border border-[#E7EADF] bg-[#FAF9F5]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10251F] text-white flex items-center justify-center text-xs font-bold">
                    {person.full_name ? person.full_name[0] : "U"}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#18221E] block">{person.full_name}</span>
                    <span className="text-[11px] text-[#65706A] block">{person.job_title || "Team Member"}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#D8DDD4] text-[#65706A]">
                  {tasksCount} tasks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: FILES ─────────────────────────────────────────────────── */}
      {activeTab === "files" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#18221E]">
            Files & Attachments ({projectFiles.length})
          </h2>
          {projectFiles.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center text-xs text-[#65706A]">
              No files uploaded to this project yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {projectFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#10251F] shrink-0" />
                    <span className="text-xs font-semibold text-[#18221E] truncate">{file.name}</span>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[#65706A] hover:text-[#10251F]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ACTIVITY ──────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#18221E]">Project Activity</h2>
          {projectActivities.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center text-xs text-[#65706A]">
              No activity logged yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E7EADF]">
              {projectActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] flex items-center justify-center text-[#10251F] shrink-0">
                    <ActivityIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#18221E]">
                      <span className="font-semibold">{act.userName}</span> {act.action}
                    </p>
                    <span className="text-[10px] text-[#8A958F]">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        workspaceId={workspace.id}
        people={people}
        projects={[project]}
        departments={departments}
        defaultProjectId={project.id}
        defaultDepartmentId={project.department_id || undefined}
      />

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        workspace={workspace}
        people={people}
        projects={[project]}
        departments={departments}
      />

      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />

      <DeleteProjectDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        projectId={project.id}
        projectName={project.name}
        workspaceId={workspace.id}
      />
    </div>
  );
}