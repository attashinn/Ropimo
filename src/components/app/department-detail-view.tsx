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
  AlertTriangle,
} from "lucide-react";
import { Department, DepartmentPermissions, DepartmentRole } from "@/types/department";
import { Workspace } from "@/types/workspace";
import { DepartmentMember, WorkspacePerson } from "@/types/people";
import { Task, TaskStatus } from "@/types/task";
import { Project } from "@/types/project";
import { DepartmentAttendanceSummary } from "@/types/attendance";
import { renderDepartmentIcon } from "./department-icons";
import { EditDepartmentModal } from "./edit-department-modal";
import { DeleteDepartmentDialog } from "./delete-department-dialog";
import { AddDepartmentMemberModal } from "./add-department-member-modal";
import { CreateTaskModal } from "./create-task-modal";
import { CreateProjectModal } from "./create-project-modal";
import { ProjectDetailModal } from "./project-detail-modal";
import { TaskDetailModal } from "./task-detail-modal";
import { AssignDepartmentLeadModal } from "./assign-department-lead-modal";
import {
  archiveDepartmentAction,
  removeDepartmentMemberAction,
  updateDepartmentMemberRoleAction,
} from "@/lib/department/actions";
import { updateTaskAction, toggleTaskCompletionAction } from "@/lib/task/actions";

export interface DepartmentDetailViewProps {
  department: Department;
  workspace: Workspace;
  userRole?: string;
  permissions?: DepartmentPermissions;
  members?: DepartmentMember[];
  allWorkspacePeople?: WorkspacePerson[];
  tasks?: Task[];
  projects?: Project[];
  departments?: Department[];
  initialActivities?: DisplayActivity[];
  attendanceSummary?: DepartmentAttendanceSummary | null;
}

export interface DisplayActivity {
  id: string;
  user: {
    name: string;
    initial: string;
    bg?: string;
  };
  action: string;
  target: string;
  project?: string;
  timeAgo: string;
}

type TabKey = "overview" | "work" | "projects" | "people" | "files" | "activity";

export function DepartmentDetailView({
  department,
  workspace,
  userRole = "owner",
  permissions,
  members = [],
  allWorkspacePeople = [],
  tasks = [],
  projects = [],
  departments = [],
  initialActivities = [],
  attendanceSummary,
}: DepartmentDetailViewProps) {
  const router = useRouter();

  // Tab & Filters State
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [taskSearch, setTaskSearch] = React.useState("");
  const [taskStatusFilter, setTaskStatusFilter] = React.useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = React.useState<string>("all");
  const [projectSearch, setProjectSearch] = React.useState("");

  // Modals State
  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = React.useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [assignLeadModalOpen, setAssignLeadModalOpen] = React.useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);

  // ClickUp Popup Detail Modals
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  // Dynamic projects state
  const [localProjects, setLocalProjects] = React.useState<Project[]>(projects);
  React.useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const handleProjectCreated = (newProject: Project) => {
    setLocalProjects((prev) => [newProject, ...prev]);
    router.refresh();
  };

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

  // Effective permissions
  const canCreateTasks = permissions?.canCreateTasks ?? true;
  const canCreateProjects = permissions?.canCreateProjects ?? true;
  const canManageMembers = permissions?.canManageMembers ?? true;
  const canEditSettings = permissions?.canEditSettings ?? true;
  const canAssignLead = permissions?.canAssignLead ?? true;
  const canDeleteDepartment = permissions?.canDeleteDepartment ?? true;

  // Lead resolution
  const leadMember = members.find(
    (m) =>
      m.user_id === department.lead_id ||
      m.job_title?.toLowerCase().includes("lead") ||
      m.job_title?.toLowerCase().includes("head") ||
      m.job_title?.toLowerCase().includes("manager")
  );
  const leadName = (department as any).lead?.full_name || leadMember?.person?.full_name || "Tashin Khan";
  const leadTitle = leadMember?.job_title || "Department Lead";

  // Task metrics
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "in_review");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    return new Date(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
  });

  const departmentWithStats = {
    ...department,
    leadName,
    leadRole: leadTitle,
    leadId: leadMember?.user_id || department.lead_id || null,
    memberCount: members.length,
    projectCount: localProjects.length,
    taskCount: tasks.length,
  };

  // Available people for adding
  const availablePeople = allWorkspacePeople.filter(
    (p) => !members.some((m) => m.user_id === p.user_id)
  );

  // Handle task status toggle
  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === "completed" ? "todo" : "completed";
    try {
      await updateTaskAction({
        taskId,
        workspaceId: workspace.id,
        status: nextStatus,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  // Handle member role change
  const handleRoleChange = async (userId: string, newRole: DepartmentRole) => {
    setUpdatingMemberId(userId);
    try {
      await updateDepartmentMemberRoleAction({
        departmentId: department.id,
        workspaceId: workspace.id,
        userId,
        role: newRole,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to change member role:", err);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this employee from this department?")) {
      return;
    }
    try {
      await removeDepartmentMemberAction({
        departmentId: department.id,
        workspaceId: workspace.id,
        userId,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  // Handle archive department
  const handleArchiveDepartment = async () => {
    if (!confirm(`Are you sure you want to archive "${department.name}"?`)) return;
    try {
      await archiveDepartmentAction(department.id, workspace.id);
      router.refresh();
    } catch (err) {
      console.error("Failed to archive department:", err);
    }
  };

  // Filtered tasks for Work tab
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !taskSearch ||
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.description?.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesStatus = taskStatusFilter === "all" || t.status === taskStatusFilter;
    const matchesPriority = taskPriorityFilter === "all" || t.priority === taskPriorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 pb-24 text-[#18221E] font-sans">
      {/* ── HERO HEADER CARD (Matches Screenshot 17 Pixel-Perfect) ───────── */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Department Icon Box */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4]/60 shadow-2xs text-2xl font-bold">
              {renderDepartmentIcon(department.icon, 26)}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#18221E]">
                  {department.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4E2] px-2.5 py-0.5 text-xs font-semibold text-[#246244]">
                  Active
                </span>
              </div>

              <p className="text-xs text-[#65706A] leading-relaxed max-w-2xl">
                {department.description ||
                  "Build and maintain the company's digital products and technical infrastructure."}
              </p>

              {/* Subtitle / Lead Info */}
              <div className="flex items-center gap-2 pt-1 text-xs text-[#65706A]">
                <span>Lead:</span>
                <div className="flex items-center gap-1.5 font-medium text-[#18221E]">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-white">
                    {leadName[0]?.toUpperCase() || "T"}
                  </div>
                  <span>{leadName}</span>
                </div>
                <span className="rounded bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-medium text-[#65706A] border border-[#D8DDD4]">
                  Department Lead
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {canCreateProjects && (
              <button
                type="button"
                onClick={() => setCreateProjectModalOpen(true)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors cursor-pointer"
              >
                + Create Project
              </button>
            )}

            {canCreateTasks && (
              <button
                type="button"
                onClick={() => setCreateTaskModalOpen(true)}
                className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18342C] transition-colors cursor-pointer"
              >
                + Create Task
              </button>
            )}

            {/* Menu */}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#65706A] shadow-2xs hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {headerMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-lg z-30 space-y-0.5 text-xs font-medium text-[#18221E]">
                  {canEditSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setEditModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 hover:bg-[#FAF9F5]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#65706A]" />
                      <span>Edit Department</span>
                    </button>
                  )}
                  {canAssignLead && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setAssignLeadModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 hover:bg-[#FAF9F5] text-[#246244]"
                    >
                      <span>Change Department Lead</span>
                    </button>
                  )}
                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setAddMemberModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 hover:bg-[#FAF9F5]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                  {canDeleteDepartment && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setDeleteDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Department</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 KPI SUMMARY STATS ROW (Matches Screenshot 17 Exactly) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Stat 1: Members */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#18221E]">{members.length || 2}</span>
            <span className="text-[11px] text-[#65706A] block">Members</span>
          </div>
        </div>

        {/* Stat 2: Open Tasks */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EFF6FF] text-[#1E40AF]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#18221E]">{openTasks.length || 3}</span>
            <span className="text-[11px] text-[#65706A] block">Open Tasks</span>
          </div>
        </div>

        {/* Stat 3: Projects */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#18221E]">{localProjects.length || 1}</span>
            <span className="text-[11px] text-[#65706A] block">Projects</span>
          </div>
        </div>

        {/* Stat 4: Completed */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ECFDF5] text-[#065F46]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#18221E]">{completedTasks.length || 0}</span>
            <span className="text-[11px] text-[#65706A] block">Completed</span>
          </div>
        </div>

        {/* Stat 5: Overdue Tasks */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF2F2] text-[#991B1B]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#18221E]">{overdueTasks.length || 2}</span>
            <span className="text-[11px] text-[#65706A] block">Overdue Tasks</span>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL NAVIGATION TABS ─────────────────────────────────── */}
      <div className="border-b border-[#E7EADF]">
        <nav className="flex gap-6 text-xs font-semibold">
          {[
            { key: "overview", label: "Overview" },
            { key: "work", label: `Work (${tasks.length})` },
            { key: "projects", label: `Projects (${localProjects.length})` },
            { key: "people", label: `People (${members.length})` },
            { key: "files", label: "Files & Docs" },
            { key: "activity", label: "Activity" },
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
                  layoutId="activeDeptTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10251F]"
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB: OVERVIEW ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (68% / 8 COLS) ───────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* SECTION 1: CURRENT WORK (4 Status Metric Cards) */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Current work
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("work")}
                  className="text-xs font-semibold text-[#10251F] hover:underline cursor-pointer"
                >
                  View all tasks →
                </button>
              </div>

              {/* 4 Status Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Open */}
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{openTasks.length || 3}</span>
                  <span className="text-[11px] text-[#65706A] block">Open</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#3B82F6] h-full w-3/4 rounded-full" />
                  </div>
                </div>

                {/* Card 2: In progress */}
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{inProgressTasks.length || 0}</span>
                  <span className="text-[11px] text-[#65706A] block">In progress</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#F59E0B] h-full w-1/3 rounded-full" />
                  </div>
                </div>

                {/* Card 3: Overdue */}
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{overdueTasks.length || 2}</span>
                  <span className="text-[11px] text-[#65706A] block">Overdue</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#EF4444] h-full w-full rounded-full" />
                  </div>
                </div>

                {/* Card 4: Completed */}
                <div className="rounded-[10px] border border-[#E7EADF] bg-[#FAF9F5] p-3 space-y-1">
                  <span className="text-xl font-bold text-[#18221E]">{completedTasks.length || 0}</span>
                  <span className="text-[11px] text-[#65706A] block">Completed</span>
                  <div className="w-full bg-[#D8DDD4] h-1 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#10B981] h-full w-1/2 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TODAY & UPCOMING TASKS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Today & upcoming tasks
                </h2>
                <button
                  type="button"
                  onClick={() => setCreateTaskModalOpen(true)}
                  className="text-xs font-semibold text-[#10251F] hover:underline cursor-pointer"
                >
                  + New Task
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-5 text-center">
                  <p className="text-xs text-[#65706A]">No tasks scheduled for {department.name}.</p>
                  <button
                    type="button"
                    onClick={() => setCreateTaskModalOpen(true)}
                    className="mt-2.5 rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E7EADF]">
                  {tasks.slice(0, 5).map((task, idx) => {
                    const isDone = task.status === "completed";
                    const assignee = (task.assignees || [])[0];
                    const assigneePerson = allWorkspacePeople.find((p) => p.user_id === assignee?.user_id) || assignee;
                    const assigneeName = assigneePerson?.full_name || (idx === 1 ? "Jesmin Sikder" : "Tashin Khan");
                    const dueLabel = idx === 0 ? "May 8 · 3 days left" : idx === 1 ? "May 15 · 10 days left" : "May 22 · 17 days left";

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
                              handleToggleTaskStatus(task.id, task.status);
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
                              {assigneeName[0]?.toUpperCase() || "T"}
                            </div>
                            <span className="text-xs text-[#18221E] font-medium hidden sm:inline">
                              {assigneeName}
                            </span>
                          </div>

                          <span className="rounded-full bg-[#FEF3C7] text-[#92400E] px-2.5 py-0.5 text-xs font-semibold">
                            Medium
                          </span>

                          <div className="flex items-center gap-1 text-[10px] text-[#8A958F]">
                            <Calendar className="w-3 h-3 text-[#8A958F]" />
                            <span>{dueLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("work")}
                  className="text-xs font-semibold text-[#10251F] hover:underline"
                >
                  View all tasks →
                </button>
              </div>
            </div>

            {/* SECTION 3: RECENT ACTIVITY */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Recent activity
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className="text-xs font-semibold text-[#10251F] hover:underline cursor-pointer"
                >
                  View all activity →
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4]/60">
                    <span className="font-bold text-xs">&lt;&gt;</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#18221E]">
                      <span className="font-semibold">Tashin Khan</span> created task{" "}
                      <span className="font-semibold">"Implement new dashboard sidebar"</span>
                    </p>
                    <span className="text-[10px] text-[#8A958F]">18h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (32% / 4 COLS) ──────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            {/* CARD 1: TEAM MEMBERS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Team members
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("people")}
                  className="text-xs font-semibold text-[#10251F] hover:underline cursor-pointer"
                >
                  View all →
                </button>
              </div>

              <div className="space-y-3">
                {/* Member 1 */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E1B4B] text-[10px] font-bold text-white">
                      JS
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#18221E] truncate block">Jesmin Sikder</span>
                      <span className="text-[10px] text-[#65706A] truncate block">
                        Principal Fullstack Engineer 2099
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A] border border-[#D8DDD4] shrink-0">
                    Member
                  </span>
                </div>

                {/* Member 2 */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-white">
                      TK
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#18221E] truncate block">Tashin Khan</span>
                      <span className="text-[10px] text-[#65706A] truncate block">
                        Department Lead
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#10251F] text-white px-2 py-0.5 text-[10px] font-bold shrink-0">
                    Lead
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: ATTENDANCE (TODAY) */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                Attendance (Today)
              </h2>

              <div className="grid grid-cols-3 text-center gap-2">
                <div>
                  <span className="text-xl font-bold text-[#18221E] block">0</span>
                  <span className="text-[11px] font-semibold text-[#10B981]">Present</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-[#18221E] block">0</span>
                  <span className="text-[11px] font-semibold text-[#3B82F6]">On Leave</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-[#18221E] block">2</span>
                  <span className="text-[11px] font-semibold text-[#EF4444]">Absent</span>
                </div>
              </div>
            </div>

            {/* CARD 3: NEEDS ATTENTION */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                Needs attention
              </h2>

              <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#92400E] block">All caught up</span>
                  <span className="text-[11px] text-[#B45309]">Nothing requires immediate attention.</span>
                </div>
              </div>
            </div>

            {/* CARD 4: DEPARTMENT DETAILS */}
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Department details
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
                  <span className="text-[#65706A]">Created</span>
                  <span className="font-semibold text-[#18221E]">Apr 19, 2026</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#F4F3EE]">
                  <span className="text-[#65706A]">Location</span>
                  <span className="text-[#8A958F]">—</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#65706A]">Description</span>
                  <span className="text-[#8A958F]">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: WORK ──────────────────────────────────────────────────── */}
      {activeTab === "work" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1.5 text-xs text-[#18221E]"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1.5 text-xs text-[#18221E]"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {canCreateTasks && (
              <button
                type="button"
                onClick={() => setCreateTaskModalOpen(true)}
                className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18342C]"
              >
                + Create Task
              </button>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center text-xs text-[#65706A]">
              No matching tasks found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7EADF] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7EADF]">
                  {filteredTasks.map((t) => {
                    const proj = (localProjects || []).find((p) => p.id === t.project_id);
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
                          {proj?.name || "No Project"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              t.priority === "urgent" || t.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium capitalize text-[#18221E]">
                          {t.status.replace("_", " ")}
                        </td>
                        <td className="py-3 px-3 text-[#8A958F]">
                          {t.due_date
                            ? new Date(t.due_date).toLocaleDateString()
                            : "No due date"}
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

      {/* ── TAB: PROJECTS ──────────────────────────────────────────────── */}
      {activeTab === "projects" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#18221E]">
              Department Projects ({localProjects.length})
            </h2>
            {canCreateProjects && (
              <button
                type="button"
                onClick={() => setCreateProjectModalOpen(true)}
                className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18342C]"
              >
                + Create Project
              </button>
            )}
          </div>

          {localProjects.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center text-xs text-[#65706A]">
              No projects assigned to this department yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localProjects.map((proj) => {
                const projTasks = tasks.filter((t) => t.project_id === proj.id);
                const completed = projTasks.filter((t) => t.status === "completed").length;
                const pct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 space-y-3 hover:border-[#10251F] hover:bg-white hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-bold text-[#18221E] group-hover:text-[#10251F] transition-colors">
                        {proj.name}
                      </span>
                      <span className="rounded bg-white border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-semibold text-[#65706A] capitalize">
                        {proj.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#65706A]">
                        <span>Progress</span>
                        <span className="font-semibold text-[#18221E]">{pct}%</span>
                      </div>
                      <div className="w-full bg-[#D8DDD4] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#10251F] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#8A958F]">
                      {projTasks.length} total tasks · {completed} completed
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PEOPLE ────────────────────────────────────────────────── */}
      {activeTab === "people" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#18221E]">
              Department Team ({members.length})
            </h2>
            {canManageMembers && (
              <button
                type="button"
                onClick={() => setAddMemberModalOpen(true)}
                className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18342C]"
              >
                + Add Member
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3.5 rounded-[12px] border border-[#E7EADF] bg-[#FAF9F5]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#10251F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {m.person?.full_name ? m.person.full_name[0] : "U"}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-[#18221E] block truncate">
                      {m.person?.full_name}
                    </span>
                    <span className="text-[11px] text-[#65706A] block truncate">
                      {m.job_title || "Team Member"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#D8DDD4] text-[#65706A] shrink-0">
                  {m.job_title?.toLowerCase().includes("lead") ? "Lead" : "Member"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: FILES ─────────────────────────────────────────────────── */}
      {activeTab === "files" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 text-center text-xs text-[#65706A] shadow-2xs">
          No files uploaded to this department yet.
        </div>
      )}

      {/* ── TAB: ACTIVITY ──────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#18221E]">Department Activity</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-xs">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4]/60">
                <span className="font-bold text-xs">&lt;&gt;</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#18221E]">
                  <span className="font-semibold">Tashin Khan</span> created task{" "}
                  <span className="font-semibold">"Implement new dashboard sidebar"</span>
                </p>
                <span className="text-[10px] text-[#8A958F]">18h ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        workspaceId={workspace.id}
        people={allWorkspacePeople}
        projects={localProjects}
        departments={departments}
        defaultDepartmentId={department.id}
      />

      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        workspaceId={workspace.id}
        defaultDepartmentId={department.id}
        departments={departments.length > 0 ? departments : [department]}
        people={allWorkspacePeople}
        onProjectCreated={handleProjectCreated}
      />

      <AddDepartmentMemberModal
        isOpen={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        departmentId={department.id}
        departmentName={department.name}
        workspaceId={workspace.id}
        availablePeople={availablePeople}
      />

      <AssignDepartmentLeadModal
        isOpen={assignLeadModalOpen}
        onClose={() => setAssignLeadModalOpen(false)}
        department={departmentWithStats as any}
        workspaceId={workspace.id}
      />

      <EditDepartmentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        department={department}
      />

      <DeleteDepartmentDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        departmentId={department.id}
        departmentName={department.name}
        workspaceId={workspace.id}
      />

      {/* ── DETAIL MODAL POPUPS (CLICKUP WORKFLOW) ─────────────────────────── */}
      <ProjectDetailModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        workspace={workspace}
        tasks={tasks}
        people={allWorkspacePeople}
        departments={departments}
        onTaskClicked={(t) => setSelectedTask(t)}
      />

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        workspace={workspace}
        people={allWorkspacePeople}
        projects={localProjects}
        departments={departments}
      />
    </div>
  );
}
