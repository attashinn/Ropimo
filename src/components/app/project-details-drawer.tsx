"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FolderKanban,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Plus,
  Check,
  Trash2,
  Share2,
  Copy,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Project, ProjectStatus } from "@/types/project";
import { Task, TaskStatus } from "@/types/task";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { updateProjectAction, deleteProjectAction } from "@/lib/project/actions";
import { createTaskAction, updateTaskAction } from "@/lib/task/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import { cn, stripHtml } from "@/lib/utils";

export interface ProjectDetailsDrawerProps {
  project: Project | null;
  workspaceId: string;
  departments: Department[];
  people: WorkspacePerson[];
  tasks: Task[];
  onClose: () => void;
  onProjectUpdated?: (updated: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  planning: {
    label: "Planning",
    dot: "bg-purple-600",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  active: {
    label: "In Progress",
    dot: "bg-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  on_hold: {
    label: "On Hold",
    dot: "bg-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-600",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
};

export function ProjectDetailsDrawer({
  project,
  workspaceId,
  departments = [],
  people = [],
  tasks = [],
  onClose,
  onProjectUpdated,
  onDeleteProject,
}: ProjectDetailsDrawerProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = React.useState<Project | null>(project);
  const [localTasks, setLocalTasks] = React.useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [creatingTask, setCreatingTask] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [descriptionValue, setDescriptionValue] = React.useState("");

  // Sync state
  React.useEffect(() => {
    setCurrentProject(project);
    if (project) {
      setDescriptionValue(project.description || "");
      setLocalTasks(tasks.filter((t) => t.project_id === project.id));
    }
  }, [project, tasks]);

  // Global Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && project) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, onClose]);

  if (!project || !currentProject) return null;

  const projectStatus =
    currentProject.status === "active" ? "in_progress" : currentProject.status;
  const statusConfig = STATUS_CONFIG[projectStatus] || STATUS_CONFIG.planning;

  const currentDepartment = departments.find(
    (d) => d.id === currentProject.department_id
  );
  const currentManager = people.find(
    (p) => (p.user_id || p.id) === (currentProject.lead_id || currentProject.manager_id)
  );

  const completedCount = localTasks.filter((t) => t.status === "completed").length;
  const totalCount = localTasks.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : currentProject.progress || 0;

  const formattedDeadline = currentProject.deadline || currentProject.due_date
    ? new Date(currentProject.deadline || currentProject.due_date!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline";

  // Handlers
  const handleStatusChange = async (newStatus: string) => {
    const updated = { ...currentProject, status: newStatus as ProjectStatus };
    setCurrentProject(updated);
    onProjectUpdated?.(updated);

    try {
      await updateProjectAction({
        projectId: currentProject.id,
        workspaceId,
        status: newStatus,
      });
      toast.success(`Project moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDepartmentChange = async (deptId: string | null) => {
    const dept = departments.find((d) => d.id === deptId);
    const updated = {
      ...currentProject,
      department_id: deptId,
      department_name: dept?.name || null,
      department_color: dept?.color || null,
    };
    setCurrentProject(updated);
    onProjectUpdated?.(updated);

    try {
      await updateProjectAction({
        projectId: currentProject.id,
        workspaceId,
        departmentId: deptId,
      });
      toast.success(`Department updated to ${dept?.name || "None"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleManagerChange = async (managerId: string | null) => {
    const manager = people.find((p) => (p.user_id || p.id) === managerId);
    const updated = {
      ...currentProject,
      lead_id: managerId,
      manager_id: managerId,
      manager_name: manager ? (manager.full_name || manager.email) : null,
    };
    setCurrentProject(updated);
    onProjectUpdated?.(updated);

    try {
      await updateProjectAction({
        projectId: currentProject.id,
        workspaceId,
        leadId: managerId,
      });
      toast.success(`Manager updated to ${manager ? (manager.full_name || manager.email) : "Unassigned"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update manager");
    }
  };

  const handleSaveDescription = async () => {
    setIsEditingDescription(false);
    if (descriptionValue === (currentProject.description || "")) return;

    const updated = { ...currentProject, description: descriptionValue };
    setCurrentProject(updated);
    onProjectUpdated?.(updated);

    try {
      await updateProjectAction({
        projectId: currentProject.id,
        workspaceId,
        description: descriptionValue,
      });
      toast.success("Description updated");
      router.refresh();
    } catch {
      toast.error("Failed to update description");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || creatingTask) return;

    setCreatingTask(true);
    try {
      const res = await createTaskAction({
        workspaceId,
        projectId: currentProject.id,
        departmentId: currentProject.department_id || undefined,
        title,
        priority: "medium",
        status: "todo",
      });

      if (res.success && res.taskId) {
        const newTask: Task = {
          id: res.taskId,
          workspace_id: workspaceId,
          project_id: currentProject.id,
          department_id: currentProject.department_id || null,
          title,
          description: null,
          status: "todo",
          priority: "medium",
          due_date: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assignees: [],
          attachments: [],
          activities: [],
          comments: [],
          submissions: [],
          project: {
            id: currentProject.id,
            name: currentProject.name,
            color: currentProject.color || "#10251F",
            icon: currentProject.icon || "P",
          },
        };
        setLocalTasks((prev) => [newTask, ...prev]);
        setNewTaskTitle("");
        toast.success("Task added to project");
        router.refresh();
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const isCompleted = task.status === "completed";
    const nextStatus: TaskStatus = isCompleted ? "todo" : "completed";

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateTaskAction({
        taskId: task.id,
        workspaceId,
        status: nextStatus,
      });
      router.refresh();
    } catch {
      // rollback
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${currentProject.name}"?`)) return;
    onClose();
    onDeleteProject?.(currentProject.id);

    try {
      await deleteProjectAction(currentProject.id, workspaceId);
      toast.success("Project deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop (Framer Motion fade) */}
        <motion.div
          key="proj-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/25 backdrop-blur-xs cursor-pointer"
        />

        {/* Slide-over Drawer Panel (Spring physics like Framer) */}
        <motion.aside
          key="proj-panel"
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
          className="relative z-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-[820px] h-full bg-surface border-l border-hairline shadow-2xl flex flex-col text-ink font-sans overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-hairline flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                style={{ backgroundColor: currentProject.color || "#10251F" }}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-2xs shrink-0"
              >
                {currentProject.icon || (currentProject.name?.[0] || "P").toUpperCase()}
              </span>
              <span className="font-semibold text-xs text-ink truncate max-w-[180px] sm:max-w-[260px]">
                {currentProject.name}
              </span>
              <span className="font-mono text-[11px] text-ink-3 bg-subtle px-1.5 py-0.5 rounded border border-hairline shrink-0">
                PROJ-{currentProject.id.slice(0, 4).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/app/projects/${currentProject.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors"
                title="Open full page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Project link copied");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Copy link"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 items-center gap-1 px-2.5 rounded-md text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
                <span className="text-[10px] text-ink-3 font-mono hidden sm:inline">ESC</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-hairline">
            {/* Title & Quick Metadata Strip */}
            <div className="px-6 py-5 space-y-4 bg-surface">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight leading-snug">
                  {currentProject.name}
                </h1>

                {/* Inline Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-opacity hover:opacity-80 cursor-pointer focus:outline-none",
                        statusConfig.bg,
                        statusConfig.text
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                      <span>{statusConfig.label}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>Project Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                        <span>{cfg.label}</span>
                        {projectStatus === key && <Check className="h-3 w-3 ml-auto text-ink" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Linear-style Property Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Department Dropdown */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Building2 className="h-3 w-3" />
                    <span>Department</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-ink/80 transition-colors w-full text-left truncate cursor-pointer focus:outline-none"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            currentDepartment?.color ? "" : "bg-emerald-600"
                          )}
                          style={{ backgroundColor: currentDepartment?.color || undefined }}
                        />
                        <span className="truncate">{currentDepartment?.name || "General"}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>Assign Department</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDepartmentChange(null)}
                        className="cursor-pointer"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-3 mr-2" />
                        <span>No department</span>
                      </DropdownMenuItem>
                      {departments.map((d) => (
                        <DropdownMenuItem
                          key={d.id}
                          onClick={() => handleDepartmentChange(d.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color || "#246244" }}
                          />
                          <span className="truncate">{d.name}</span>
                          {currentProject.department_id === d.id && (
                            <Check className="h-3 w-3 ml-auto text-ink shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Manager Dropdown */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <User className="h-3 w-3" />
                    <span>Manager</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-ink/80 transition-colors w-full text-left truncate cursor-pointer focus:outline-none"
                      >
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">
                          {currentManager ? (currentManager.full_name || currentManager.email)[0].toUpperCase() : "U"}
                        </div>
                        <span className="truncate">
                          {currentManager ? (currentManager.full_name || currentManager.email) : "Unassigned"}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuLabel>Assign Manager</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleManagerChange(null)}
                        className="cursor-pointer"
                      >
                        Unassigned
                      </DropdownMenuItem>
                      {people.map((p) => {
                        const personId = p.user_id || p.id;
                        const personName = p.full_name || p.email;
                        return (
                          <DropdownMenuItem
                            key={personId}
                            onClick={() => handleManagerChange(personId)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">
                              {personName[0].toUpperCase()}
                            </div>
                            <span className="truncate">{personName}</span>
                            {(currentProject.lead_id === personId || currentProject.manager_id === personId) && (
                              <Check className="h-3 w-3 ml-auto text-ink shrink-0" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Deadline */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Calendar className="h-3 w-3" />
                    <span>Deadline</span>
                  </div>
                  <p className="text-xs font-semibold text-ink truncate">
                    {formattedDeadline}
                  </p>
                </div>

                {/* Progress */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <span>Progress</span>
                    <span className="tabular-nums font-mono text-ink">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-hover overflow-hidden mt-1">
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="h-full bg-ink rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="px-6 py-5 space-y-2 bg-surface">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Description
                </h2>
                {!isEditingDescription && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    className="text-xs text-ink-3 hover:text-ink font-medium cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    placeholder="Enter project description..."
                    className="w-full rounded-lg border border-hairline bg-surface p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="text-xs px-2.5 py-1 text-ink-3 hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      className="rounded-md bg-ink text-surface px-3 py-1 text-xs font-medium hover:bg-ink/90 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="rounded-lg border border-hairline bg-subtle/30 p-3 text-xs text-ink leading-relaxed whitespace-pre-wrap min-h-[60px] cursor-pointer hover:border-ink/20 transition-colors"
                >
                  {stripHtml(currentProject.description) ? (
                    stripHtml(currentProject.description)
                  ) : (
                    <span className="text-ink-3/70 italic">Click to add a project description...</span>
                  )}
                </div>
              )}
            </div>

            {/* Project Tasks Section */}
            <div className="px-6 py-5 space-y-3.5 bg-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Project Tasks
                  </h2>
                  <span className="rounded-full bg-subtle px-1.5 py-0.2 text-[10px] font-medium text-ink-2">
                    {completedCount} / {totalCount}
                  </span>
                </div>
              </div>

              {/* Quick Add Task Input */}
              <form onSubmit={handleCreateTask} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a task to this project... (Press Enter)"
                  className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || creatingTask}
                  className="rounded-lg bg-ink text-surface px-3 py-1.5 text-xs font-medium hover:bg-ink/90 disabled:opacity-40 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-1.5 pt-1">
                {localTasks.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-hairline text-center text-xs text-ink-3 bg-subtle/20">
                    No tasks created in this project yet. Use the input above to add the first task.
                  </div>
                ) : (
                  localTasks.map((t) => {
                    const isCompleted = t.status === "completed";
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center justify-between gap-3 p-2.5 rounded-lg border border-hairline bg-surface hover:bg-hover/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t)}
                            className={cn(
                              "h-3.5 w-3.5 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer",
                              isCompleted
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-ink-3/50 hover:border-ink bg-transparent"
                            )}
                          >
                            {isCompleted && <Check className="h-2 w-2 stroke-[3]" />}
                          </button>
                          <span
                            className={cn(
                              "text-xs font-medium text-ink truncate",
                              isCompleted && "line-through text-ink-3"
                            )}
                          >
                            {t.title}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-3 shrink-0">
                          RP-{t.id.slice(0, 4)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-hairline bg-surface flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-rose-200 bg-surface px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete Project</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-hairline bg-surface px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-hover shadow-2xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
