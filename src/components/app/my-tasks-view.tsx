"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CategorizedTasks, Task, TaskPriority, TaskStatus, TaskAttachment, TaskComment } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { TaskDetailsDrawer } from "@/components/app/task-details-drawer";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  addTaskAttachmentAction,
  addTaskCommentAction,
} from "@/lib/task/actions";
import { AppIcon } from "@/components/ui/app-icon";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Plus,
  Check,
  Calendar,
  User,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Clock,
  SlidersHorizontal,
  Search,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  Filter,
  CheckCircle2,
  Trash2,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  CircleDashed,
  CircleDot,
  Flame,
  Minus,
  Paperclip,
  List,
  Kanban,
} from "lucide-react";
import {
  Kbd,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import { cn } from "@/lib/utils";

export interface MyTasksViewProps {
  workspaceId: string;
  workspaceName?: string;
  currentUserId: string;
  categorized?: CategorizedTasks;
  initialTasks?: Task[];
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

interface DisplayTaskItem {
  id: string;
  title: string;
  description?: string;
  project: { id?: string; name: string; icon: string; color: string };
  departmentName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTimeText: string;
  dueCategory: "today" | "week" | "later";
  dueDate?: string | null;
  assignee: { name: string; initial: string; bg?: string; jobTitle?: string };
  completed: boolean;
  order?: number;
  createdAt: string;
  createdBy?: string | null;
  creatorName?: string;
  attachments: TaskAttachment[];
  rawTask?: Task;
}

type GroupByOption = "due_date" | "project" | "priority" | "status";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDueText(dateStr?: string | null): { dueCategory: "today" | "week" | "later"; dueTimeText: string } {
  if (!dateStr) return { dueCategory: "later", dueTimeText: "No due date" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { dueCategory: "later", dueTimeText: "No due date" };

  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (isToday) {
    return { dueCategory: "today", dueTimeText: "Today" };
  }

  return {
    dueCategory: "later",
    dueTimeText: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
  };
}

function formatDateDeterministic(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function checkIsOverdue(dateStr?: string | null, completed?: boolean): boolean {
  if (completed || !dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function getTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getNextWeekIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function cleanDescriptionSnippet(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_#`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function taskToDisplayItem(task: Task, currentUserId: string): DisplayTaskItem {
  const assigneePerson = task.assignees?.[0];
  const assigneeName = assigneePerson?.full_name || (task as unknown as { assignee_name?: string }).assignee_name || (task.created_by === currentUserId ? "Me" : "Unassigned");
  const initial = assigneeName.charAt(0).toUpperCase();

  const { dueCategory, dueTimeText } = formatDueText(task.due_date);

  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    project: {
      id: task.project?.id,
      name: task.project?.name || "General",
      icon: task.project?.icon || "P",
      color: task.project?.color || "#10251F",
    },
    departmentName: task.department?.name || undefined,
    priority: task.priority || "medium",
    status: task.status || "todo",
    dueDate: task.due_date,
    dueTimeText,
    dueCategory,
    assignee: {
      name: assigneeName,
      initial,
      bg: "bg-[#10251F]",
      jobTitle: assigneePerson?.job_title || undefined,
    },
    completed: task.status === "completed",
    order: 1,
    createdAt: task.created_at || new Date().toISOString(),
    createdBy: task.created_by,
    creatorName: task.creator?.full_name || "Tashin Khan",
    attachments: task.attachments || [],
    rawTask: task,
  };
}

const INITIAL_DEMO_TASKS: DisplayTaskItem[] = [];

export function MyTasksView({
  workspaceId,
  workspaceName = "brnnd",
  currentUserId,
  categorized,
  initialTasks = [],
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
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [groupBy, setGroupBy] = React.useState<GroupByOption>("due_date");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [organizerModalOpen, setOrganizerModalOpen] = React.useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = React.useState<DisplayTaskItem | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);
  const [actionMenuTaskId, setActionMenuTaskId] = React.useState<string | null>(null);

  // Close drawer on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTaskDetails) {
        setSelectedTaskDetails(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskDetails]);

  // View Mode: List vs Board (Height.app style)
  const [viewMode, setViewMode] = React.useState<"list" | "board">("list");
  const [inlineCreateGroup, setInlineCreateGroup] = React.useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = React.useState("");

  const handleInlineCreate = async (groupKey: string) => {
    const trimmed = inlineTitle.trim();
    if (!trimmed || trimmed.length < 2) {
      setInlineCreateGroup(null);
      setInlineTitle("");
      return;
    }
    const title = trimmed;
    setInlineTitle("");
    setInlineCreateGroup(null);

    const tempId = `temp-${Date.now()}`;
    const targetStatus: TaskStatus =
      groupKey === "in_progress" ? "in_progress" : groupKey === "completed" ? "completed" : "todo";

    const newTask: DisplayTaskItem = {
      id: tempId,
      title,
      project: { id: projects[0]?.id, name: projects[0]?.name || "General", icon: "P", color: "#10251F" },
      priority: "medium",
      status: targetStatus,
      dueTimeText: "No due date",
      dueCategory: "later",
      assignee: { name: "Me", initial: "M", bg: "bg-[#10251F]" },
      completed: targetStatus === "completed",
      createdAt: new Date().toISOString(),
      attachments: [],
    };

    setLocalTasks((prev) => [newTask, ...prev]);

    try {
      const res = await createTaskAction({
        workspaceId,
        title,
        status: targetStatus,
        priority: "medium",
        projectId: projects[0]?.id,
      });
      if (res.success && res.taskId) {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: res.taskId! } : t))
        );
        toast.success("Task created");
      }
      router.refresh();
    } catch {
      toast.error("Failed to create task");
      setLocalTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  // Group collapsing
  const [collapsedGroups, setCollapsedGroups] = React.useState<{ [key: string]: boolean }>({});

  // Keyboard shortcuts: C to create, / to search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "/" && searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current.focus();
      }
      if (e.key.toLowerCase() === "c" && !createModalOpen && !selectedTaskDetails) {
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createModalOpen, selectedTaskDetails]);

  // Dynamic mapped tasks from DB or fallback
  const mappedTasks = React.useMemo(() => {
    const list = initialTasks && initialTasks.length > 0
      ? initialTasks
      : categorized
      ? [...categorized.today, ...categorized.upcoming, ...categorized.overdue, ...categorized.noDueDate, ...categorized.completed]
      : [];

    if (list.length > 0) {
      return list.map((t) => taskToDisplayItem(t, currentUserId));
    }
    return INITIAL_DEMO_TASKS;
  }, [initialTasks, categorized, currentUserId]);

  // Tasks list
  const [prevMappedTasks, setPrevMappedTasks] = React.useState(mappedTasks);
  const [localTasks, setLocalTasks] = React.useState<DisplayTaskItem[]>(mappedTasks);
  if (mappedTasks !== prevMappedTasks) {
    setPrevMappedTasks(mappedTasks);
    setLocalTasks(mappedTasks);
  }

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
  const handleToggleTask = async (task: DisplayTaskItem, e?: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    if (e) e.stopPropagation();
    const prevCompleted = task.completed;
    const prevStatus = task.status;
    const nextCompleted = !task.completed;
    const nextStatus: TaskStatus = nextCompleted ? "completed" : "in_progress";

    // Optimistic update
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
      // Rollback
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: prevCompleted, status: prevStatus } : t))
      );
      toast.error("Failed to update task");
    }
  };

  // 1. Quick Update Priority (Inline / Workable)
  const handleUpdatePriority = async (taskId: string, priority: TaskPriority) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority } : t))
    );
    setSelectedTaskDetails((curr) => (curr && curr.id === taskId ? { ...curr, priority } : curr));
    try {
      await updateTaskAction({
        taskId,
        workspaceId,
        priority,
      });
      router.refresh();
    } catch {
      toast.error("Failed to update priority");
    }
  };

  // 2. Quick Update Status (Inline / Workable)
  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    const isCompleted = status === "completed";
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status, completed: isCompleted } : t
      )
    );
    setSelectedTaskDetails((curr) =>
      curr && curr.id === taskId ? { ...curr, status, completed: isCompleted } : curr
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId,
        status,
      });
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // 3. Quick Update Due Date (Inline / Workable)
  const handleUpdateDueDate = async (taskId: string, dateStr: string | null) => {
    const { dueCategory, dueTimeText } = formatDueText(dateStr);
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, dueDate: dateStr, dueCategory, dueTimeText }
          : t
      )
    );
    setSelectedTaskDetails((curr) =>
      curr && curr.id === taskId
        ? { ...curr, dueDate: dateStr, dueCategory, dueTimeText }
        : curr
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId,
        dueDate: dateStr,
      });
      router.refresh();
    } catch {
      toast.error("Failed to update due date");
    }
  };

  // 4. Quick Update Assignee (Inline / Workable)
  const handleUpdateAssignee = async (
    taskId: string,
    userId: string | null,
    userName: string
  ) => {
    const initial = userName === "Unassigned" ? "" : userName.charAt(0).toUpperCase();
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assignee: {
                name: userName,
                initial: initial || "?",
                bg: "bg-hover",
              },
            }
          : t
      )
    );
    setSelectedTaskDetails((curr) =>
      curr && curr.id === taskId
        ? {
            ...curr,
            assignee: {
              name: userName,
              initial: initial || "?",
              bg: "bg-hover",
            },
          }
        : curr
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId,
        assigneeIds: userId ? [userId] : [],
      });
      router.refresh();
    } catch {
      toast.error("Failed to update assignee");
    }
  };

  // 5. Quick Update Project (Inline / Workable)
  const handleUpdateProject = async (
    taskId: string,
    projectId: string,
    projectName: string,
    projectColor?: string
  ) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              project: {
                id: projectId,
                name: projectName,
                color: projectColor || "#10251F",
                icon: "P",
              },
            }
          : t
      )
    );
    setSelectedTaskDetails((curr) =>
      curr && curr.id === taskId
        ? {
            ...curr,
            project: {
              id: projectId,
              name: projectName,
              color: projectColor || "#10251F",
              icon: "P",
            },
          }
        : curr
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId,
        projectId,
      });
      router.refresh();
    } catch {
      toast.error("Failed to update project");
    }
  };

  const handleDeleteSelectedTask = async (taskToDelete?: DisplayTaskItem) => {
    const target = taskToDelete || selectedTaskDetails;
    if (!target) return;
    if (!confirm(`Are you sure you want to delete "${target.title}"?`)) return;
    const taskId = target.id;
    const snapshot = target;
    setSelectedTaskDetails(null);
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTaskAction(taskId, workspaceId);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete task:", err);
      // Rollback
      setLocalTasks((prev) => [...prev, snapshot]);
      setSelectedTaskDetails(snapshot);
      toast.error("Failed to delete task");
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

  // Filtering — use debouncedSearch (200ms) so table only re-renders after user stops typing
  const filteredTasks = localTasks.filter((task) => {
      const q = debouncedSearch.toLowerCase();
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

  const todayScheduleTasks = React.useMemo(() => {
    return localTasks.filter((t) => t.dueCategory === "today" && !t.completed);
  }, [localTasks]);

  const priorityStats = React.useMemo(() => {
    const total = localTasks.length;
    const urgent = localTasks.filter((t) => t.priority === "urgent").length;
    const high = localTasks.filter((t) => t.priority === "high").length;
    const medium = localTasks.filter((t) => t.priority === "medium").length;
    const low = localTasks.filter((t) => t.priority === "low").length;

    const urgentPct = total > 0 ? Math.round((urgent / total) * 100) : 0;
    const highPct = total > 0 ? Math.round((high / total) * 100) : 0;
    const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
    const lowPct = total > 0 ? Math.max(0, 100 - urgentPct - highPct - mediumPct) : 0;

    return { total, urgent, high, medium, low, urgentPct, highPct, mediumPct, lowPct };
  }, [localTasks]);

  const upcomingDeadlineTasks = React.useMemo(() => {
    return localTasks
      .filter((t) => !t.completed && (t.dueCategory === "week" || t.dueCategory === "later"))
      .slice(0, 4);
  }, [localTasks]);

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
          count: filteredTasks.filter((t) => t.dueCategory === "later").length,
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
  }, [filteredTasks, groupBy]);  // Summary counts computed dynamically
  const totalTasksCount = localTasks.length;
  const inProgressCount = localTasks.filter((t) => t.status === "in_progress" && !t.completed).length;
  const completedCount = localTasks.filter((t) => t.completed || t.status === "completed").length;
  const overdueCount = localTasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  }).length;
  const todayCount = localTasks.filter((t) => t.dueCategory === "today" && !t.completed).length;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600">
            <Flame className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span>Urgent</span>
          </div>
        );
      case "high":
        return (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange-600">
            <SignalHigh className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span>High</span>
          </div>
        );
      case "medium":
        return (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
            <SignalMedium className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Medium</span>
          </div>
        );
      case "low":
        return (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
            <SignalLow className="h-3.5 w-3.5 text-blue-500/80 shrink-0" />
            <span>Low</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-3/40">
            <Minus className="h-3.5 w-3.5 shrink-0" />
            <span>None</span>
          </div>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus, completed?: boolean) => {
    if (completed || status === "completed") {
      return (
        <div className="inline-flex items-center gap-1.5 text-[12px] text-status-done font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 stroke-[2] shrink-0" />
          <span>Done</span>
        </div>
      );
    }
    if (status === "in_progress") {
      return (
        <div className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 font-medium">
          <CircleDot className="h-3.5 w-3.5 stroke-[2.5] text-blue-500 shrink-0" />
          <span>In Progress</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
        <CircleDashed className="h-3.5 w-3.5 stroke-[2] text-ink-3 shrink-0" />
        <span>To Do</span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 text-ink font-sans">
      {/* 1. HEIGHT / LINEAR TOOLBAR HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-hairline/80 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">
            Tasks
          </h1>
          <div className="h-4 w-[1px] bg-hairline hidden sm:block" />
          <div className="text-[12px] text-ink-3 tabular-nums font-medium flex items-center gap-1.5">
            <span>{localTasks.filter((t) => !t.completed).length} active</span>
            {overdueCount > 0 && (
              <span className="text-status-overdue font-medium">
                · {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: List vs Board */}
          <div className="inline-flex items-center p-0.5 bg-surface border border-hairline rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all select-none",
                viewMode === "list"
                  ? "bg-hover text-ink shadow-2xs font-semibold"
                  : "text-ink-2 hover:text-ink hover:bg-black/[0.03]"
              )}
            >
              <List className="h-3.5 w-3.5 stroke-[2]" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all select-none",
                viewMode === "board"
                  ? "bg-hover text-ink shadow-2xs font-semibold"
                  : "text-ink-2 hover:text-ink hover:bg-black/[0.03]"
              )}
            >
              <Kanban className="h-3.5 w-3.5 stroke-[2]" />
              <span>Board</span>
            </button>
          </div>

          {/* Group By Selector */}
          <div className="relative inline-flex items-center">
            <SlidersHorizontal className="absolute left-2.5 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              className="pl-8 pr-7 py-1 text-[12px] font-medium bg-surface hover:bg-hover border border-hairline rounded-lg text-ink shadow-2xs appearance-none cursor-pointer focus:outline-none focus:border-ink transition-colors"
            >
              <option value="status">Group: Status</option>
              <option value="priority">Group: Priority</option>
              <option value="due_date">Group: Due Date</option>
              <option value="project">Group: Project</option>
            </select>
            <ChevronDown className="absolute right-2 h-3 w-3 text-ink-3 pointer-events-none" />
          </div>

          {/* + New Task Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1 text-[12px] font-medium text-white shadow-2xs hover:bg-ink/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2]" />
            <span>New Task</span>
            <Kbd className="bg-white/20 text-white border-transparent text-[10px] ml-0.5">C</Kbd>
          </button>
        </div>
      </div>

      {/* 3. FULL-WIDTH TASK WORKSPACE */}
      <div className="space-y-3.5">
        {/* Controls: Segmented View Tabs & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented View Tabs */}
          <div className="inline-flex items-center gap-0.5 p-1 bg-surface border border-hairline rounded-lg shadow-2xs overflow-x-auto shrink-0">
            {[
              { key: "all", label: "All Tasks", count: totalTasksCount },
              { key: "my", label: "My Tasks", count: localTasks.filter((t) => t.assignee.name === "Me" || t.assignee.name.includes("Tashin")).length },
              { key: "created", label: "Created by Me", count: localTasks.filter((t) => t.createdBy === currentUserId).length },
              { key: "watching", label: "Watching", count: 0 },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as "all" | "my" | "created" | "watching")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all duration-120 select-none whitespace-nowrap",
                    isActive
                      ? "bg-hover text-ink font-semibold shadow-2xs"
                      : "text-ink-2 hover:text-ink hover:bg-black/[0.03]"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono",
                        isActive ? "bg-white text-ink font-semibold" : "bg-black/[0.04] text-ink-3"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Filter Controls & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            <div className="relative inline-flex items-center">
              <FolderKanban className="absolute left-2.5 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-[12px] font-medium bg-surface hover:bg-hover border border-hairline rounded-lg text-ink shadow-2xs appearance-none cursor-pointer focus:outline-none focus:border-ink transition-colors"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 h-3 w-3 text-ink-3 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative inline-flex items-center">
              <CircleDot className="absolute left-2.5 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-[12px] font-medium bg-surface hover:bg-hover border border-hairline rounded-lg text-ink shadow-2xs appearance-none cursor-pointer focus:outline-none focus:border-ink transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown className="absolute right-2 h-3 w-3 text-ink-3 pointer-events-none" />
            </div>

            {/* Priority Filter */}
            <div className="relative inline-flex items-center">
              <Signal className="absolute left-2.5 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-[12px] font-medium bg-surface hover:bg-hover border border-hairline rounded-lg text-ink shadow-2xs appearance-none cursor-pointer focus:outline-none focus:border-ink transition-colors"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown className="absolute right-2 h-3 w-3 text-ink-3 pointer-events-none" />
            </div>

            {/* Search Input with / shortcut */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none stroke-[1.75]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-36 sm:w-48 rounded-lg border border-hairline bg-surface pl-8 pr-7 py-1.5 text-[12px] text-ink placeholder:text-ink-3 shadow-2xs focus:border-ink focus:outline-none transition-colors"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-3 bg-hover px-1 py-0.2 rounded border border-hairline pointer-events-none">
                /
              </kbd>
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedTaskIds.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-[13px] text-white shadow-md animate-in fade-in">
            <span className="font-medium">
              {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkComplete}
                className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20 font-medium transition-colors text-[12px]"
              >
                Mark Complete
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-lg bg-red-500/80 px-3 py-1 hover:bg-red-500 font-medium text-white transition-colors text-[12px]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedTaskIds([])}
                className="text-white/70 hover:text-white ml-2 text-[12px]"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Tasks Workspace: List or Board */}
        {viewMode === "board" ? (
          /* KANBAN BOARD VIEW (Height.app / Linear style) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
            {taskGroups.map((group) => (
              <div
                key={group.key}
                className="flex flex-col rounded-xl border border-hairline bg-surface/80 p-2.5 min-w-[280px] shadow-2xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline/80 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", group.color)} />
                    <span className="text-[13px] font-semibold text-ink">{group.label}</span>
                    <span className="text-[11px] font-mono tabular-nums text-ink-3 px-1.5 py-0.2 rounded-md bg-hover font-normal">
                      {group.tasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineCreateGroup(group.key);
                      setInlineTitle("");
                    }}
                    className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-hover transition-colors"
                    title={`Add task to ${group.label}`}
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2]" />
                  </button>
                </div>

                {/* Cards List */}
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {group.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskDetails(task)}
                      className={cn(
                        "group/card rounded-lg border border-hairline bg-surface p-3 shadow-2xs hover:border-ink/20 hover:shadow-xs transition-all cursor-pointer space-y-2.5",
                        task.completed && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleTask(task, e)}
                            className={cn(
                              "h-3.5 w-3.5 rounded-full border transition-all duration-120 flex items-center justify-center shrink-0 cursor-pointer",
                              task.completed
                                ? "bg-status-done border-status-done text-white"
                                : "border-hairline hover:border-ink bg-surface shadow-2xs"
                            )}
                          >
                            {task.completed && <Check className="h-2 w-2 stroke-[3]" />}
                          </button>
                          <span className="font-mono text-[10px] text-ink-3">
                            RP-{task.id.slice(0, 4)}
                          </span>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 p-1 -m-1 rounded hover:bg-hover/80 transition-colors cursor-pointer focus:outline-none"
                              >
                                {getPriorityBadge(task.priority)}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "urgent")}>
                                <Flame className="h-3.5 w-3.5 text-red-500 mr-2" />
                                <span className="text-red-600 font-medium">Urgent</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "high")}>
                                <SignalHigh className="h-3.5 w-3.5 text-orange-500 mr-2" />
                                <span className="text-orange-600 font-medium">High</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "medium")}>
                                <SignalMedium className="h-3.5 w-3.5 text-amber-500 mr-2" />
                                <span className="text-ink-2">Medium</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "low")}>
                                <SignalLow className="h-3.5 w-3.5 text-blue-500 mr-2" />
                                <span className="text-ink-3">Low</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4
                          className={cn(
                            "text-[13px] font-medium text-ink leading-snug",
                            task.completed && "line-through text-ink-3"
                          )}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-ink-3 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-hairline/60 text-[11px] text-ink-3">
                        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 p-0.5 rounded hover:bg-hover/80 transition-colors cursor-pointer focus:outline-none max-w-full text-left"
                              >
                                <span
                                  style={{ backgroundColor: task.project.color || "#10251F" }}
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                />
                                <span className="truncate max-w-[110px] text-ink-2 font-medium">
                                  {task.project.name}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-y-auto">
                              <DropdownMenuLabel>Change Project</DropdownMenuLabel>
                              {projects.map((proj) => (
                                <DropdownMenuItem
                                  key={proj.id}
                                  onClick={() => handleUpdateProject(task.id, proj.id, proj.name, proj.color)}
                                >
                                  <span
                                    style={{ backgroundColor: proj.color || "#10251F" }}
                                    className="h-2 w-2 rounded-full shrink-0 mr-2"
                                  />
                                  <span className="truncate font-medium">{proj.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "tabular-nums font-mono text-[10px] px-1 py-0.5 rounded hover:bg-hover transition-colors cursor-pointer focus:outline-none",
                                  task.dueCategory === "today"
                                    ? "text-amber-600 font-medium"
                                    : checkIsOverdue(task.dueDate, task.completed)
                                    ? "text-status-overdue font-medium"
                                    : task.dueDate
                                    ? "text-ink-3"
                                    : "text-ink-3/40"
                                )}
                              >
                                {task.dueDate ? task.dueTimeText : "—"}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 p-1.5 space-y-1">
                              <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getTodayIso())}>
                                <Clock className="h-3.5 w-3.5 text-amber-500 mr-2" />
                                <span>Due Today</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getTomorrowIso())}>
                                <Calendar className="h-3.5 w-3.5 text-blue-500 mr-2" />
                                <span>Due Tomorrow</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getNextWeekIso())}>
                                <Calendar className="h-3.5 w-3.5 text-purple-500 mr-2" />
                                <span>Due Next Week</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[10px] font-mono uppercase text-ink-3 block mb-1">Pick date</label>
                                <input
                                  type="date"
                                  defaultValue={task.dueDate ? task.dueDate.split("T")[0] : ""}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleUpdateDueDate(task.id, new Date(e.target.value).toISOString());
                                    }
                                  }}
                                  className="w-full text-[11px] font-mono bg-hover border border-hairline rounded px-2 py-1 text-ink focus:outline-none cursor-pointer"
                                />
                              </div>
                              {task.dueDate && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateDueDate(task.id, null)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    <span>Clear date</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-hover transition-colors cursor-pointer focus:outline-none"
                                title={task.assignee.name}
                              >
                                {task.assignee.name !== "Unassigned" ? (
                                  <div className="h-4 w-4 rounded-full bg-hover text-ink text-[9px] font-semibold flex items-center justify-center ring-1 ring-black/5">
                                    {task.assignee.initial}
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-dashed border-hairline hover:border-ink/40 text-ink-3 text-[9px] flex items-center justify-center">
                                    <User className="h-2.5 w-2.5" />
                                  </div>
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 max-h-64 overflow-y-auto">
                              <DropdownMenuLabel>Assign task to</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleUpdateAssignee(task.id, currentUserId, "Me")}
                              >
                                <div className="h-5 w-5 rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center mr-2">
                                  M
                                </div>
                                <span className="font-medium">Assign to Me</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {people.map((p) => {
                                const displayName = p.full_name || p.email;
                                const targetUserId = p.user_id || p.id;
                                return (
                                  <DropdownMenuItem
                                    key={p.id}
                                    onClick={() => handleUpdateAssignee(task.id, targetUserId, displayName)}
                                  >
                                    <div className="h-5 w-5 rounded-full bg-hover text-ink text-[10px] font-medium ring-1 ring-black/5 flex items-center justify-center mr-2">
                                      {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate">{displayName}</span>
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUpdateAssignee(task.id, null, "Unassigned")}
                                className="text-ink-3"
                              >
                                <Minus className="h-3.5 w-3.5 mr-2" />
                                <span>Unassigned</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Inline quick add in board column */}
                  {inlineCreateGroup === group.key ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleInlineCreate(group.key);
                      }}
                      className="rounded-lg border border-ink/30 bg-surface p-2 shadow-xs space-y-2"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setInlineCreateGroup(null);
                            setInlineTitle("");
                          }
                        }}
                        placeholder="Task title... (Enter to add)"
                        className="w-full bg-transparent text-[12px] text-ink placeholder:text-ink-3 outline-none"
                      />
                      <div className="flex items-center justify-between text-[10px] text-ink-3 pt-1">
                        <span>Press Enter to save</span>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineCreateGroup(null);
                            setInlineTitle("");
                          }}
                          className="hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineCreateGroup(group.key);
                        setInlineTitle("");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[12px] text-ink-3 hover:text-ink hover:bg-hover/60 rounded-lg transition-colors border border-dashed border-hairline font-medium"
                    >
                      <Plus className="h-3 w-3 stroke-[2]" />
                      <span>Add task</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* HIGH-DENSITY LIST VIEW (Height.app / Linear style) */
          <div className="rounded-xl border border-hairline bg-surface shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-[#FAF9F5] text-[10px] font-bold text-ink-3 uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-hairline text-ink focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-[40%]">Task</th>
                  <th className="py-2.5 px-3 w-[16%]">Project</th>
                  <th className="py-2.5 px-3 w-[12%]">Priority</th>
                  <th className="py-2.5 px-3 w-[12%]">Status</th>
                  <th className="py-2.5 px-3 w-[14%]">Due Date</th>
                  <th className="py-2.5 px-3 w-[6%] text-center">Assignee</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-hairline">
                {taskGroups.map((group) => {
                  if (group.tasks.length === 0 && group.count === 0 && inlineCreateGroup !== group.key) return null;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Header Row */}
                      <tr
                        onClick={() => toggleGroup(group.key)}
                        className="group bg-hover/20 hover:bg-hover/40 cursor-pointer transition-colors select-none"
                      >
                        <td colSpan={7} className="py-2 px-3">
                          <div className="flex items-center justify-between text-[12px] font-semibold text-ink">
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 text-ink-3 transition-transform duration-150",
                                  collapsedGroups[group.key] && "-rotate-90"
                                )}
                              />
                              <span className={cn("h-2 w-2 rounded-full", group.color)} />
                              <span>{group.label}</span>
                              <span className="text-[11px] font-mono tabular-nums text-ink-3 px-1.5 py-0.2 rounded-md bg-hover/80 font-normal">
                                {group.count || group.tasks.length}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInlineCreateGroup(group.key);
                                setInlineTitle("");
                              }}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink transition-opacity px-2 py-0.5 rounded hover:bg-white"
                            >
                              <Plus className="h-3 w-3 stroke-[2]" />
                              <span>Add task</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Group Task Rows */}
                      {!collapsedGroups[group.key] &&
                        group.tasks.map((task) => (
                          <tr
                            key={task.id}
                            onClick={() => setSelectedTaskDetails(task)}
                            className={cn(
                              "group hover:bg-hover/50 transition-colors duration-100 cursor-pointer h-10",
                              selectedTaskIds.includes(task.id) && "bg-hover/80"
                            )}
                          >
                            <td className="py-2 px-3 text-center" onClick={(e) => handleToggleSelect(task.id, e)}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleTask(task, e)}
                                className={cn(
                                  "h-[15px] w-[15px] rounded-full border transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer mx-auto group/chk",
                                  task.completed
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                    : "border-ink-3/50 hover:border-ink hover:bg-ink/5 bg-transparent"
                                )}
                                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                              >
                                {task.completed ? (
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                ) : (
                                  <Check className="h-2 w-2 stroke-[2.5] text-ink-3 opacity-0 group-hover/chk:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </td>
                            <td className="py-2 px-3 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] text-ink-3/80 font-medium shrink-0 select-none tracking-tight">
                                  RP-{task.id.slice(0, 4)}
                                </span>
                                <span
                                  className={cn(
                                    "font-medium text-[13px] text-ink shrink-0 max-w-[260px] sm:max-w-[380px] truncate",
                                    task.completed && "line-through text-ink-3/70 font-normal"
                                  )}
                                >
                                  {task.title}
                                </span>
                                {cleanDescriptionSnippet(task.description) && (
                                  <span className="text-[12px] text-ink-3/60 truncate min-w-0 flex-1 font-normal hidden lg:inline">
                                    · {cleanDescriptionSnippet(task.description)}
                                  </span>
                                )}
                                {task.attachments.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-3/70 shrink-0 ml-1">
                                    <Paperclip className="h-3 w-3 opacity-70" />
                                    <span>{task.attachments.length}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Project Column - Interactive Dropdown */}
                            <td className="py-1 px-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-ink-2 hover:text-ink hover:bg-hover/80 transition-colors cursor-pointer group/cell focus:outline-none max-w-full text-left"
                                  >
                                    <span
                                      style={{ backgroundColor: task.project.color || "#10251F" }}
                                      className="h-2 w-2 rounded-full shrink-0"
                                    />
                                    <span className="truncate font-medium">
                                      {task.project.name}
                                    </span>
                                    <ChevronDown className="h-3 w-3 text-ink-3 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0 ml-0.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-y-auto">
                                  <DropdownMenuLabel>Change Project</DropdownMenuLabel>
                                  {projects.map((proj) => (
                                    <DropdownMenuItem
                                      key={proj.id}
                                      onClick={() => handleUpdateProject(task.id, proj.id, proj.name, proj.color)}
                                    >
                                      <span
                                        style={{ backgroundColor: proj.color || "#10251F" }}
                                        className="h-2 w-2 rounded-full shrink-0 mr-2"
                                      />
                                      <span className="truncate font-medium">{proj.name}</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>

                            {/* Priority Column - Interactive Dropdown */}
                            <td className="py-1 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] hover:bg-hover/80 transition-colors cursor-pointer group/cell focus:outline-none"
                                  >
                                    {getPriorityBadge(task.priority)}
                                    <ChevronDown className="h-3 w-3 text-ink-3 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-36">
                                  <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "urgent")}>
                                    <Flame className="h-3.5 w-3.5 text-red-500 mr-2" />
                                    <span className="text-red-600 font-medium">Urgent</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "high")}>
                                    <SignalHigh className="h-3.5 w-3.5 text-orange-500 mr-2" />
                                    <span className="text-orange-600 font-medium">High</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "medium")}>
                                    <SignalMedium className="h-3.5 w-3.5 text-amber-500 mr-2" />
                                    <span className="text-ink-2">Medium</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, "low")}>
                                    <SignalLow className="h-3.5 w-3.5 text-blue-500 mr-2" />
                                    <span className="text-ink-3">Low</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>

                            {/* Status Column - Interactive Dropdown */}
                            <td className="py-1 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] hover:bg-hover/80 transition-colors cursor-pointer group/cell focus:outline-none"
                                  >
                                    {getStatusBadge(task.status, task.completed)}
                                    <ChevronDown className="h-3 w-3 text-ink-3 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40">
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "todo")}>
                                    <CircleDashed className="h-3.5 w-3.5 text-ink-3 mr-2" />
                                    <span>To Do</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "in_progress")}>
                                    <CircleDot className="h-3.5 w-3.5 text-blue-500 mr-2" />
                                    <span className="text-blue-600 font-medium">In Progress</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, "completed")}>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-status-done mr-2" />
                                    <span className="text-status-done font-medium">Done</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>

                            {/* Due Date Column - Interactive Dropdown */}
                            <td className="py-1 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-mono tabular-nums hover:bg-hover/80 transition-colors cursor-pointer group/cell focus:outline-none",
                                      task.dueCategory === "today"
                                        ? "font-semibold text-amber-600"
                                        : checkIsOverdue(task.dueDate, task.completed)
                                        ? "font-semibold text-status-overdue"
                                        : task.dueDate
                                        ? "text-ink-2"
                                        : "text-ink-3/50"
                                    )}
                                  >
                                    <Calendar className="h-3 w-3 stroke-[1.75] opacity-70 shrink-0" />
                                    <span suppressHydrationWarning>{task.dueDate ? task.dueTimeText : "Set date"}</span>
                                    <ChevronDown className="h-3 w-3 text-ink-3 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52 p-1.5 space-y-1">
                                  <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getTodayIso())}>
                                    <Clock className="h-3.5 w-3.5 text-amber-500 mr-2" />
                                    <span>Due Today</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getTomorrowIso())}>
                                    <Calendar className="h-3.5 w-3.5 text-blue-500 mr-2" />
                                    <span>Due Tomorrow</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateDueDate(task.id, getNextWeekIso())}>
                                    <Calendar className="h-3.5 w-3.5 text-purple-500 mr-2" />
                                    <span>Due Next Week</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                                    <label className="text-[10px] font-mono uppercase text-ink-3 block mb-1">Pick date</label>
                                    <input
                                      type="date"
                                      defaultValue={task.dueDate ? task.dueDate.split("T")[0] : ""}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleUpdateDueDate(task.id, new Date(e.target.value).toISOString());
                                        }
                                      }}
                                      className="w-full text-[11px] font-mono bg-hover border border-hairline rounded px-2 py-1 text-ink focus:outline-none cursor-pointer"
                                    />
                                  </div>
                                  {task.dueDate && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleUpdateDueDate(task.id, null)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        <span>Clear date</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>

                            {/* Assignee Column - Interactive Dropdown */}
                            <td className="py-1 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center p-1 rounded-md hover:bg-hover/80 transition-colors cursor-pointer group/cell focus:outline-none"
                                    title={task.assignee.name}
                                  >
                                    {task.assignee.name !== "Unassigned" ? (
                                      <div className="h-5 w-5 rounded-full text-[10px] font-medium bg-hover text-ink ring-1 ring-black/10 flex items-center justify-center shadow-2xs">
                                        {task.assignee.initial}
                                      </div>
                                    ) : (
                                      <div className="h-5 w-5 rounded-full border border-dashed border-hairline hover:border-ink/40 text-ink-3 text-[10px] flex items-center justify-center">
                                        <User className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 max-h-64 overflow-y-auto">
                                  <DropdownMenuLabel>Assign task to</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateAssignee(task.id, currentUserId, "Me")}
                                  >
                                    <div className="h-5 w-5 rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center mr-2">
                                      M
                                    </div>
                                    <span className="font-medium">Assign to Me</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {people.map((p) => {
                                    const displayName = p.full_name || p.email;
                                    const targetUserId = p.user_id || p.id;
                                    return (
                                      <DropdownMenuItem
                                        key={p.id}
                                        onClick={() => handleUpdateAssignee(task.id, targetUserId, displayName)}
                                      >
                                        <div className="h-5 w-5 rounded-full bg-hover text-ink text-[10px] font-medium ring-1 ring-black/5 flex items-center justify-center mr-2">
                                          {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{displayName}</span>
                                      </DropdownMenuItem>
                                    );
                                  })}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateAssignee(task.id, null, "Unassigned")}
                                    className="text-ink-3"
                                  >
                                    <Minus className="h-3.5 w-3.5 mr-2" />
                                    <span>Unassigned</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}

                      {/* Inline Fast Add Row (Height.app signature UX) */}
                      {!collapsedGroups[group.key] && (
                        <tr className="border-t border-hairline/60 bg-surface/50 hover:bg-hover/30 transition-colors">
                          <td colSpan={7} className="py-1 px-3">
                            {inlineCreateGroup === group.key ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleInlineCreate(group.key);
                                }}
                                className="flex items-center gap-2 py-0.5"
                              >
                                <Plus className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                                <input
                                  autoFocus
                                  type="text"
                                  value={inlineTitle}
                                  onChange={(e) => setInlineTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      setInlineCreateGroup(null);
                                      setInlineTitle("");
                                    }
                                  }}
                                  placeholder={`Task title in ${group.label}... (Press Enter to save, Esc to cancel)`}
                                  className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 outline-none border-none py-1 focus:ring-0"
                                />
                                <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-ink-3">
                                  <kbd className="font-mono bg-hover px-1.5 py-0.5 rounded border border-hairline text-[10px]">↵ Enter</kbd>
                                  <kbd className="font-mono bg-hover px-1.5 py-0.5 rounded border border-hairline text-[10px]">Esc</kbd>
                                </div>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineCreateGroup(group.key);
                                  setInlineTitle("");
                                }}
                                className="flex items-center gap-2 py-1 text-[12px] text-ink-3 hover:text-ink transition-colors w-full text-left font-medium group/btn"
                              >
                                <Plus className="h-3.5 w-3.5 text-ink-3 group-hover/btn:text-ink transition-colors" />
                                <span>New task in {group.label}...</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-hairline text-[12px] text-ink-2 bg-hover/20">
              <span>Showing 1 to {Math.min(filteredTasks.length, 24)} of {totalTasksCount} tasks</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-ink hover:bg-hover disabled:opacity-40 transition-colors"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[12px] font-medium text-white shadow-2xs"
                >
                  1
                </button>
                <button
                  type="button"
                  disabled={currentPage >= 2}
                  onClick={() => setCurrentPage(2)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-[12px] font-medium text-ink hover:bg-hover transition-colors"
                >
                  2
                </button>
                <button
                  type="button"
                  disabled={currentPage >= 3}
                  onClick={() => setCurrentPage(3)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-[12px] font-medium text-ink hover:bg-hover transition-colors"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(3, currentPage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface text-ink hover:bg-hover transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
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

      {/* Task Details Drawer (Smooth like Framer) */}
      <TaskDetailsDrawer
        task={selectedTaskDetails}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        people={people}
        projects={projects}
        onClose={() => setSelectedTaskDetails(null)}
        onToggleComplete={handleToggleTask}
        onDeleteTask={handleDeleteSelectedTask}
        onTaskUpdated={(updated) => {
          setSelectedTaskDetails(updated);
          setLocalTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        }}
      />

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
