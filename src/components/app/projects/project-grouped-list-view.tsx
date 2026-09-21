"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  Building2,
  Calendar,
  User,
  MoreHorizontal,
  ArrowRight,
  X,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { Project } from "@/types/project";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { toggleTaskCompletionAction, createTaskAction, updateTaskAction } from "@/lib/task/actions";
import {
  STRUCTURED_PROJECT_PHASES,
  getTaskPhase,
  getTaskCollaborativeDepartments,
} from "@/lib/project/phases";
import { cn } from "@/lib/utils";

export interface ProjectGroupedListViewProps {
  project: Project;
  tasks: Task[];
  people: WorkspacePerson[];
  departments: Department[];
  activePhaseId?: string;
  onPhaseChange?: (phaseId: string) => void;
  onSelectTask?: (task: Task) => void;
  onOpenCreateModal?: (defaultPhaseId?: string) => void;
}

const PRIORITY_BADGES: Record<string, { label: string; class: string }> = {
  urgent: { label: "Urgent", class: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "High", class: "bg-orange-50 text-orange-700 border-orange-200" },
  medium: { label: "Medium", class: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "Low", class: "bg-green-50 text-green-700 border-green-200" },
};

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  todo: { label: "To Do", class: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]" },
  in_progress: { label: "In Progress", class: "bg-blue-50 text-blue-700 border-blue-200" },
  in_review: { label: "In Review", class: "bg-purple-50 text-purple-700 border-purple-200" },
  completed: { label: "Completed", class: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]" },
};

function formatTaskDueDate(dateStr?: string | null): string {
  if (!dateStr) return "No due date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function ProjectGroupedListView({
  project,
  tasks: initialTasks,
  people,
  departments = [],
  activePhaseId = "01",
  onPhaseChange,
  onSelectTask,
  onOpenCreateModal,
}: ProjectGroupedListViewProps) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});
  const [inlineTaskTitle, setInlineTaskTitle] = React.useState("");
  const [inlineAddingPhaseId, setInlineAddingPhaseId] = React.useState<string | null>(null);

  // Department picker popover state for a specific task
  const [activeDeptMenuTaskId, setActiveDeptMenuTaskId] = React.useState<string | null>(null);
  const deptMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deptMenuRef.current && !deptMenuRef.current.contains(e.target as Node)) {
        setActiveDeptMenuTaskId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    const isCompleted = task.status === "completed";
    const newStatus: TaskStatus = isCompleted ? "todo" : "completed";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await toggleTaskCompletionAction(
        task.id,
        task.workspace_id || project.workspace_id,
        !isCompleted
      );
    } catch (err) {
      console.error("[ProjectView] Failed to toggle task:", err);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  // Inline Add Task to current phase
  const handleInlineAddTask = async (phaseId: string) => {
    if (!inlineTaskTitle.trim()) {
      setInlineAddingPhaseId(null);
      return;
    }

    const title = inlineTaskTitle.trim();
    const tempId = `task-temp-${Date.now()}`;
    const targetPhase = STRUCTURED_PROJECT_PHASES.find((p) => p.id === phaseId) || STRUCTURED_PROJECT_PHASES[0];

    const newTask: Task = {
      id: tempId,
      workspace_id: project.workspace_id,
      project_id: project.id,
      department_id: departments[0]?.id || null,
      deliverable_type: targetPhase.name,
      section: targetPhase.id,
      department: departments[0]
        ? { id: departments[0].id, name: departments[0].name, color: departments[0].color || "#10251F", icon: departments[0].icon || "Building2" }
        : null,
      project: { id: project.id, name: project.name, color: project.color || "#10251F", icon: project.icon || "Folder" },
      title,
      status: "todo",
      priority: "medium",
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: [],
    };

    setTasks((prev) => [...prev, newTask]);
    setInlineTaskTitle("");
    setInlineAddingPhaseId(null);

    try {
      const res = await createTaskAction({
        workspaceId: project.workspace_id,
        projectId: project.id,
        departmentId: departments[0]?.id || undefined,
        deliverableType: targetPhase.name,
        title,
        priority: "medium",
        status: "todo",
      });

      if (res.success && res.taskId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: res.taskId! } : t))
        );
      }
    } catch (err) {
      console.error("[ProjectView] Failed to create inline task:", err);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  // Toggle department for a task (collaborative working across departments)
  const handleToggleDepartmentOnTask = async (task: Task, dept: Department) => {
    const currentDepts = getTaskCollaborativeDepartments(task, departments);
    const hasDept = currentDepts.some((d) => d.id === dept.id);
    let updatedDepts: Department[];

    if (hasDept) {
      // Keep at least one department
      if (currentDepts.length > 1) {
        updatedDepts = currentDepts.filter((d) => d.id !== dept.id);
      } else {
        return;
      }
    } else {
      updatedDepts = [...currentDepts, dept];
    }

    const deptNames = updatedDepts.map((d) => d.name).join(", ");
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              expected_outcome: deptNames,
              department_id: updatedDepts[0]?.id || t.department_id,
            }
          : t
      )
    );

    try {
      await updateTaskAction({
        taskId: task.id,
        workspaceId: task.workspace_id,
        departmentId: updatedDepts[0]?.id,
        expectedOutcome: deptNames,
      });
    } catch (err) {
      console.error("[ProjectView] Failed to update collaborative departments:", err);
    }
  };

  // Get current active phase object
  const currentPhaseIndex = STRUCTURED_PROJECT_PHASES.findIndex((p) => p.id === activePhaseId);
  const currentPhase = STRUCTURED_PROJECT_PHASES[currentPhaseIndex] || STRUCTURED_PROJECT_PHASES[0];
  const nextPhase =
    currentPhaseIndex >= 0 && currentPhaseIndex < STRUCTURED_PROJECT_PHASES.length - 1
      ? STRUCTURED_PROJECT_PHASES[currentPhaseIndex + 1]
      : null;

  // Filter tasks for the active phase (or if activePhaseId is "all", show all)
  const isAllPhases = activePhaseId === "all";
  const displayedPhases = isAllPhases
    ? STRUCTURED_PROJECT_PHASES
    : [currentPhase];

  return (
    <div className="w-full bg-white rounded-[18px] border border-[#E5E8E1] overflow-hidden shadow-xs select-none">
      {/* ── PHASE WORKSTREAM HEADER BANNER ─────────────────────────────── */}
      {!isAllPhases && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-[#FAF9F5] border-b border-[#E5E8E1]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#10251F] text-white">
              <ListTodo size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#18221E]">{currentPhase.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D8DDD4] text-[#65706A]">
                  Active Workstream
                </span>
              </div>
              <p className="text-[11px] text-[#8A958F] mt-0.2">
                Tasks & collaborative deliverables for this phase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCreateModal?.(currentPhase.id)}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Task to {currentPhase.title}</span>
            </button>

            {nextPhase && (
              <button
                type="button"
                onClick={() => onPhaseChange?.(nextPhase.id)}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                title={`Advance to ${nextPhase.name}`}
              >
                <span>Next: {nextPhase.title}</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── LIST TABLE ─────────────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#E5E8E1] bg-[#FAFAF8] text-[#65706A] font-semibold text-[11px]">
              <th className="py-2.5 px-4 font-semibold w-[320px]">Task name</th>
              <th className="py-2.5 px-3 font-semibold w-[220px]">Assigned Departments (Collaborative)</th>
              <th className="py-2.5 px-3 font-semibold w-[150px]">Assignee</th>
              <th className="py-2.5 px-3 font-semibold w-[100px]">Priority</th>
              <th className="py-2.5 px-3 font-semibold w-[120px]">Due date</th>
              <th className="py-2.5 px-3 font-semibold w-[110px]">Status</th>
              <th className="py-2.5 px-2 font-semibold w-[35px] text-center"></th>
            </tr>
          </thead>

          {/* Table Body Groups: ONE SECTION PER PHASE */}
          <tbody className="divide-y divide-[#E5E8E1]/60">
            {displayedPhases.map((phase) => {
              const phaseTasks = tasks.filter((t) => {
                const p = getTaskPhase(t);
                return p === phase.id;
              });
              const completedCount = phaseTasks.filter((t) => t.status === "completed").length;
              const isCollapsed = collapsedSections[phase.id];

              return (
                <React.Fragment key={phase.id}>
                  {/* Phase Section Header Row (Shown when viewing all phases) */}
                  {isAllPhases && (
                    <tr className="bg-[#FFFFFF] hover:bg-[#F9FAF7] transition-colors border-t border-[#E5E8E1]">
                      <td colSpan={7} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleSection(phase.id)}
                            className="flex items-center gap-2 text-xs font-bold text-[#18221E] hover:text-[#246244] transition-colors cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight size={14} className="text-[#8A958F]" />
                            ) : (
                              <ChevronDown size={14} className="text-[#8A958F]" />
                            )}

                            <span className="font-bold text-[#18221E]">{phase.name}</span>
                            <span className="text-[10px] font-semibold text-[#8A958F]">
                              ({phaseTasks.length} {phaseTasks.length === 1 ? "task" : "tasks"}
                              {phaseTasks.length > 0 && ` · ${completedCount} completed`})
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCollapsedSections((prev) => ({ ...prev, [phase.id]: false }));
                              setInlineAddingPhaseId(phase.id);
                              setInlineTaskTitle("");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] px-2 py-0.5 rounded hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add task</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Phase Tasks Rows */}
                  {!isCollapsed && (
                    <>
                      {phaseTasks.length > 0 ? (
                        phaseTasks.map((task) => {
                          const isDone = task.status === "completed";
                          const assignee = task.assignees?.[0];
                          const assigneeName = assignee?.full_name || "Unassigned";
                          const priorityCfg =
                            PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                          const statusCfg =
                            STATUS_BADGES[task.status] || STATUS_BADGES.todo;
                          const isOverdue =
                            !isDone &&
                            task.due_date &&
                            new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

                          // Collaborative multiple departments
                          const taskDepts = getTaskCollaborativeDepartments(task, departments);
                          const isDeptMenuOpen = activeDeptMenuTaskId === task.id;

                          return (
                            <tr
                              key={task.id}
                              className="group hover:bg-[#F9FAF7] transition-colors text-xs border-b border-[#E5E8E1]/40"
                            >
                              {/* Task Name & Completion Checkbox */}
                              <td className="py-2.5 px-4 pl-6">
                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTask(task)}
                                    className="shrink-0 transition-transform active:scale-90 cursor-pointer"
                                    title={isDone ? "Mark incomplete" : "Mark complete"}
                                  >
                                    {isDone ? (
                                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#246244] text-white">
                                        <Check size={10} strokeWidth={3} />
                                      </div>
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border border-[#8A958F] hover:border-[#246244] transition-colors" />
                                    )}
                                  </button>

                                  <span
                                    onClick={() => onSelectTask?.(task)}
                                    className={cn(
                                      "font-medium text-[#18221E] hover:text-[#246244] cursor-pointer truncate transition-colors",
                                      isDone && "line-through text-[#8A958F]"
                                    )}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                              </td>

                              {/* Assigned Departments (Collaborative Multi-Department Badges) */}
                              <td className="py-2 px-3 relative">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {taskDepts.map((d) => (
                                    <span
                                      key={d.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10.5px] font-semibold border shadow-2xs"
                                      style={{
                                        backgroundColor: `${d.color || "#10251F"}12`,
                                        color: d.color || "#10251F",
                                        borderColor: `${d.color || "#10251F"}25`,
                                      }}
                                    >
                                      <span
                                        className="h-1.5 w-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: d.color || "#10251F" }}
                                      />
                                      <span>{d.name}</span>
                                    </span>
                                  ))}

                                  {/* Button to toggle / add collaborative departments */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDeptMenuTaskId(isDeptMenuOpen ? null : task.id);
                                    }}
                                    className="h-5 w-5 rounded-full border border-dashed border-[#D8DDD4] hover:border-[#10251F] text-[#8A958F] hover:text-[#18221E] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Assign/collaborate with department"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>

                                {/* Collaborative Department Selector Popover */}
                                {isDeptMenuOpen && (
                                  <div
                                    ref={deptMenuRef}
                                    className="absolute left-3 top-full mt-1 z-50 w-56 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-xl select-none"
                                  >
                                    <div className="px-2 py-1 border-b border-[#E7EADF] mb-1">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                                        Collaborative Departments
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      {departments.map((dept) => {
                                        const isAssigned = taskDepts.some((d) => d.id === dept.id);
                                        return (
                                          <button
                                            key={dept.id}
                                            type="button"
                                            onClick={() => handleToggleDepartmentOnTask(task, dept)}
                                            className={cn(
                                              "flex w-full items-center justify-between px-2 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer text-left",
                                              isAssigned
                                                ? "bg-[#FAF9F5] text-[#10251F] font-bold"
                                                : "text-[#18221E] hover:bg-[#FAF9F5]"
                                            )}
                                          >
                                            <div className="flex items-center gap-1.5 truncate">
                                              <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: dept.color || "#10251F" }}
                                              />
                                              <span className="truncate">{dept.name}</span>
                                            </div>
                                            {isAssigned && (
                                              <Check size={13} className="text-[#10251F] shrink-0" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Assignee */}
                              <td className="py-2 px-3">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E8E1] px-2 py-0.5 max-w-[145px]">
                                  {assignee?.avatar_url ? (
                                    <img
                                      src={assignee.avatar_url}
                                      alt=""
                                      className="h-4 w-4 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10251F] text-white text-[8px] font-bold shrink-0">
                                      {assigneeName[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className="truncate text-[11px] text-[#18221E] font-medium">
                                    {assigneeName}
                                  </span>
                                </div>
                              </td>

                              {/* Priority */}
                              <td className="py-2 px-3">
                                <span
                                  className={cn(
                                    "inline-block rounded-[6px] border px-2 py-0.5 text-[10.5px] font-semibold",
                                    priorityCfg.class
                                  )}
                                >
                                  {priorityCfg.label}
                                </span>
                              </td>

                              {/* Due date */}
                              <td className="py-2 px-3">
                                <span
                                  className={cn(
                                    "text-[11px] font-medium",
                                    isOverdue
                                      ? "text-red-600 font-bold"
                                      : task.due_date
                                      ? "text-[#18221E]"
                                      : "text-[#8A958F]"
                                  )}
                                >
                                  {formatTaskDueDate(task.due_date)}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-2 px-3">
                                <span
                                  className={cn(
                                    "inline-block rounded-[6px] border px-2 py-0.5 text-[10.5px] font-semibold",
                                    statusCfg.class
                                  )}
                                >
                                  {statusCfg.label}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => onSelectTask?.(task)}
                                  className="text-[#8A958F] hover:text-[#18221E] p-1 rounded hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                                  title="View task details"
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="border-b border-[#E5E8E1]/40">
                          <td colSpan={7} className="py-6 text-center text-xs text-[#8A958F]">
                            No tasks in this phase yet.
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddingPhaseId(phase.id);
                                setInlineTaskTitle("");
                              }}
                              className="ml-2 font-bold text-[#10251F] hover:underline cursor-pointer"
                            >
                              Add first task
                            </button>
                          </td>
                        </tr>
                      )}

                      {/* Inline Add Task Row */}
                      {inlineAddingPhaseId === phase.id ? (
                        <tr className="bg-[#FAF9F5]/70 border-b border-[#E5E8E1]">
                          <td colSpan={7} className="py-2 px-6">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleInlineAddTask(phase.id);
                              }}
                              className="flex items-center gap-2"
                            >
                              <input
                                autoFocus
                                type="text"
                                value={inlineTaskTitle}
                                onChange={(e) => setInlineTaskTitle(e.target.value)}
                                placeholder="Enter task title and press Enter..."
                                className="flex-1 bg-white border border-[#D8DDD4] rounded-[8px] px-3 py-1.5 text-xs text-[#18221E] placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none shadow-2xs"
                              />
                              <button
                                type="submit"
                                disabled={!inlineTaskTitle.trim()}
                                className="rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineAddingPhaseId(null)}
                                className="p-1 text-[#8A958F] hover:text-[#18221E] cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-2 px-6 bg-[#FAFAF8]/50">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddingPhaseId(phase.id);
                                setInlineTaskTitle("");
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#65706A] hover:text-[#10251F] cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Add task to {phase.title}</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
