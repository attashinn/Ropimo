"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategorizedTasks, Task, TaskPriority, TaskStatus, TaskAttachment, TaskComment } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { updateTaskAction, deleteTaskAction, addTaskAttachmentAction, addTaskCommentAction } from "@/lib/task/actions";
import { AppIcon } from "@/components/ui/app-icon";

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
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [groupBy, setGroupBy] = React.useState<GroupByOption>("due_date");

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [organizerModalOpen, setOrganizerModalOpen] = React.useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = React.useState<DisplayTaskItem | null>(null);
  const [taskDetailTab, setTaskDetailTab] = React.useState<"overview" | "attachments" | "activity">("overview");
  const [uploadingAttachment, setUploadingAttachment] = React.useState(false);
  const [newCommentText, setNewCommentText] = React.useState("");
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const modalFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);
  const [actionMenuTaskId, setActionMenuTaskId] = React.useState<string | null>(null);

  // Group collapsing
  const [collapsedGroups, setCollapsedGroups] = React.useState<{ [key: string]: boolean }>({});

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
  const [localTasks, setLocalTasks] = React.useState<DisplayTaskItem[]>(mappedTasks);

  React.useEffect(() => {
    setLocalTasks(mappedTasks);
  }, [mappedTasks]);

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
  const handleToggleTask = async (task: DisplayTaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextCompleted = !task.completed;
    const nextStatus: TaskStatus = nextCompleted ? "completed" : "in_progress";

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
    }
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTaskDetails) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("folder", "attachments");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const fileUrl = uploadData.fileUrl;
      await addTaskAttachmentAction(
        selectedTaskDetails.id,
        workspaceId,
        file.name,
        file.size,
        file.type || "application/octet-stream",
        fileUrl
      );

      const newAtt: TaskAttachment = {
        id: `att-${Date.now()}`,
        task_id: selectedTaskDetails.id,
        workspace_id: workspaceId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        file_url: fileUrl,
        created_at: new Date().toISOString(),
      };

      setSelectedTaskDetails((prev) =>
        prev ? { ...prev, attachments: [...prev.attachments, newAtt] } : null
      );
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTaskDetails.id
            ? { ...t, attachments: [...t.attachments, newAtt] }
            : t
        )
      );
      router.refresh();
    } catch (err: any) {
      console.error("Failed to upload attachment:", err);
      alert(err.message || "Failed to upload file");
    } finally {
      setUploadingAttachment(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = "";
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedTaskDetails || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await addTaskCommentAction(
        selectedTaskDetails.id,
        workspaceId,
        newCommentText.trim()
      );
      if (res.success) {
        const newCommentObj: TaskComment = {
          id: res.commentId || `c-${Date.now()}`,
          task_id: selectedTaskDetails.id,
          workspace_id: workspaceId,
          user_id: currentUserId,
          author: people.find((p) => p.user_id === currentUserId) || null,
          content: newCommentText.trim(),
          created_at: new Date().toISOString(),
        };
        setSelectedTaskDetails((prev) => {
          if (!prev) return null;
          const currentComments = prev.rawTask?.comments || [];
          return {
            ...prev,
            rawTask: {
              ...prev.rawTask!,
              comments: [...currentComments, newCommentObj],
            },
          };
        });
        setNewCommentText("");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteSelectedTask = async () => {
    if (!selectedTaskDetails) return;
    if (!confirm(`Are you sure you want to delete "${selectedTaskDetails.title}"?`)) return;
    const taskId = selectedTaskDetails.id;
    setSelectedTaskDetails(null);
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTaskAction(taskId, workspaceId);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete task:", err);
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

  // Filtering
  const filteredTasks = React.useMemo(() => {
    return localTasks.filter((task) => {
      const q = searchQuery.toLowerCase();
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
  }, [localTasks, searchQuery, selectedProject, selectedStatus, selectedPriority]);

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
          count: 19,
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
  }, [filteredTasks, groupBy]);

  // Summary counts
  const totalTasksCount = 24;
  const inProgressCount = 8;
  const completedCount = 12;
  const overdueCount = 3;
  const todayCount = 5;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
      case "high":
        return (
          <span className="inline-flex rounded-[6px] border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex rounded-[6px] border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="inline-flex rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A]">
            No Priority
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus, completed?: boolean) => {
    if (completed || status === "completed") {
      return (
        <span className="inline-flex rounded-[6px] bg-[#EAF4E2] px-2 py-0.5 text-[10px] font-semibold text-[#246244]">
          Completed
        </span>
      );
    }
    if (status === "in_progress") {
      return (
        <span className="inline-flex rounded-[6px] bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#65706A]">
        To Do
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-7 pb-24 text-[#18221E]">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            My Tasks
          </h1>
          <p className="mt-1 text-xs text-[#65706A]">
            View and manage all your tasks across projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* + Add Task Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors"
          >
            <span>+</span>
            <span>Add Task</span>
          </button>

          {/* Organizer / Filters Button */}
          <button
            type="button"
            onClick={() => setOrganizerModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters & Organizer</span>
          </button>

          {/* Three-dot overflow button */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#65706A] shadow-2xs hover:bg-[#FAF9F5] hover:text-[#18221E]"
          >
            •••
          </button>
        </div>
      </div>

      {/* 3. TASK SUMMARY CARDS (5 Horizontal Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: TOTAL TASKS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF4E2] text-[#246244]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Total Tasks
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {totalTasksCount}
            </p>
            <p className="text-[11px] text-[#65706A]">All assigned tasks</p>
          </div>
        </div>

        {/* Card 2: IN PROGRESS */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF6E4] text-[#B58500]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              In Progress
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {inProgressCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks in progress</p>
          </div>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F3E8FF] text-[#7E22CE]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <polyline points="9 11 12 14 20 6" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Completed
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {completedCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks completed</p>
          </div>
        </div>

        {/* Card 4: OVERDUE */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FEE2E2] text-[#DC2626]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Overdue
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {overdueCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks past due</p>
          </div>
        </div>

        {/* Card 5: TODAY */}
        <div className="flex items-center gap-3.5 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F0F9FF] text-[#0284C7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
              Today
            </span>
            <p className="text-2xl font-bold tracking-tight text-[#18221E]">
              {todayCount}
            </p>
            <p className="text-[11px] text-[#65706A]">Tasks due today</p>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE AREA (Split Layout: Left Table ~70% + Right Sidebar ~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MAIN TASK TABLE (~70% = 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Filter / Tab Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 shrink-0">
              {[
                { key: "all", label: "All Tasks" },
                { key: "my", label: "My Tasks" },
                { key: "created", label: "Created by Me" },
                { key: "watching", label: "Watching" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#10251F] text-white shadow-2xs"
                      : "bg-white border border-[#D8DDD4] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Projects</option>
                <option value="Ropimo Platform">Ropimo Platform</option>
                <option value="Muntajar Website">Muntajar Website</option>
                <option value="Client Dashboard">Client Dashboard</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="todo">To Do</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedDueDate}
                onChange={(e) => setSelectedDueDate(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2 py-1.5 text-[11px] font-medium text-[#18221E] shadow-2xs focus:outline-none"
              >
                <option value="this_week">Due Date: This Week</option>
                <option value="today">Due Today</option>
                <option value="all">All Due Dates</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-32 sm:w-36 rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-[11px] text-[#18221E] placeholder:text-[#65706A]/60 shadow-2xs focus:border-[#10251F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedTaskIds.length > 0 && (
            <div className="flex items-center justify-between rounded-[10px] bg-[#10251F] px-4 py-2 text-xs text-white shadow-md animate-in fade-in">
              <span className="font-semibold">
                {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkComplete}
                  className="rounded bg-white/10 px-2.5 py-1 hover:bg-white/20 font-semibold"
                >
                  Mark Complete
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="rounded bg-red-500/80 px-2.5 py-1 hover:bg-red-500 font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-white/70 hover:text-white ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Main Tasks Table with Perfect Proportions */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed text-xs">
              <thead>
                <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5]/70 text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  <th className="py-3 px-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2 w-[34%]">Task</th>
                  <th className="py-3 px-2 w-[18%]">Project ▾</th>
                  <th className="py-3 px-2 w-[11%]">Priority</th>
                  <th className="py-3 px-2 w-[13%]">Status</th>
                  <th className="py-3 px-2 w-[16%]">Due Date</th>
                  <th className="py-3 px-1 w-[8%] text-center">Assignee</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#D8DDD4]/60">
                {taskGroups.map((group) => {
                  if (group.tasks.length === 0 && group.count === 0) return null;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Header */}
                      <tr
                        onClick={() => toggleGroup(group.key)}
                        className="bg-[#FAF9F5]/50 hover:bg-[#FAF9F5] cursor-pointer"
                      >
                        <td colSpan={7} className="py-2.5 px-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#18221E]">
                            <span className="text-[10px] text-[#65706A]">
                              {collapsedGroups[group.key] ? "▶" : "▼"}
                            </span>
                            <span className={`h-2 w-2 rounded-full ${group.color}`} />
                            <span>
                              {group.label} ({group.count || group.tasks.length})
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Group Task Rows */}
                      {!collapsedGroups[group.key] &&
                        group.tasks.map((task) => (
                          <tr
                            key={task.id}
                            onClick={() => setSelectedTaskDetails(task)}
                            className={`hover:bg-[#FAF9F5]/70 transition-colors cursor-pointer ${
                              selectedTaskIds.includes(task.id) ? "bg-[#F4F7EF]" : ""
                            }`}
                          >
                            <td className="py-3 px-2.5" onClick={(e) => handleToggleSelect(task.id, e)}>
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={(e) => handleToggleTask(task, e as any)}
                                className="h-4 w-4 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-2 min-w-0">
                              <p
                                className={`font-semibold text-xs text-[#18221E] truncate ${
                                  task.completed ? "line-through text-[#65706A]" : ""
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-[11px] text-[#65706A] mt-0.5 truncate">
                                  {task.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-2 min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <div
                                  style={{ backgroundColor: task.project.color }}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold text-white shadow-2xs"
                                >
                                  {task.project.icon}
                                </div>
                                <span className="font-medium text-[#18221E] text-xs truncate">
                                  {task.project.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2">{getPriorityBadge(task.priority)}</td>
                            <td className="py-3 px-2">{getStatusBadge(task.status, task.completed)}</td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <div
                                className={`flex items-center gap-1.5 text-xs ${
                                  task.dueCategory === "today"
                                    ? "font-semibold text-red-600"
                                    : "text-[#18221E]"
                                }`}
                              >
                                <AppIcon name="calendar" size={12} className="text-[#65706A]" />
                                <span className="truncate" suppressHydrationWarning>{task.dueTimeText}</span>
                              </div>
                            </td>
                            <td className="py-3 px-1 text-center">
                              <div
                                title={task.assignee.name}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${task.assignee.bg}`}
                              >
                                {task.assignee.initial}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-3.5 border-t border-[#D8DDD4] text-xs text-[#65706A] bg-[#FAF9F5]/40">
              <span>Showing 1 to 5 of 24 tasks</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-40"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#10251F] text-xs font-semibold text-white shadow-2xs"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(3)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  3
                </button>
                <span className="px-1 text-[#65706A]">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(5)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(5, currentPage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 STACKED PANELS (~30% = 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* PANEL 1: TODAY'S SCHEDULE */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]/80">
              <h3 className="text-sm font-bold text-[#18221E]">Today's Schedule</h3>
              <Link href="/app/calendar" className="text-xs font-semibold text-[#18221E] hover:underline">
                View Calendar →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {todayScheduleTasks.length === 0 ? (
                <div className="py-5 text-center text-[#65706A] text-xs">
                  No tasks scheduled for today
                </div>
              ) : (
                todayScheduleTasks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskDetails(item)}
                    className="flex items-center gap-3 p-1.5 rounded-[6px] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-[#65706A] w-16 shrink-0 text-[11px]" suppressHydrationWarning>
                      {item.dueTimeText || "Today"}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        item.priority === "urgent" || item.priority === "high"
                          ? "bg-red-500"
                          : item.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#18221E] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#65706A] truncate">
                        {item.project?.name || item.departmentName || "No Project"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PANEL 2: TASKS BY PRIORITY (Donut Chart) */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#18221E]">Tasks by Priority</h3>

            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Donut Chart SVG */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  {/* Urgent/High (red) */}
                  <path
                    className="text-red-500"
                    strokeDasharray={`${priorityStats.highPct + priorityStats.urgentPct}, 100`}
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Medium (amber) */}
                  <path
                    className="text-amber-500"
                    strokeDasharray={`${priorityStats.mediumPct}, 100`}
                    strokeDashoffset={`-${priorityStats.highPct + priorityStats.urgentPct}`}
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Low (green) */}
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${priorityStats.lowPct}, 100`}
                    strokeDashoffset={`-${priorityStats.highPct + priorityStats.urgentPct + priorityStats.mediumPct}`}
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-bold text-[#18221E] block leading-none">
                    {priorityStats.total}
                  </span>
                  <span className="text-[9px] font-bold text-[#65706A] uppercase tracking-wider block mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    High/Urgent
                  </span>
                  <span className="font-semibold text-[#18221E]">
                    {priorityStats.high + priorityStats.urgent} ({priorityStats.highPct + priorityStats.urgentPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Medium
                  </span>
                  <span className="font-semibold text-[#18221E]">
                    {priorityStats.medium} ({priorityStats.mediumPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#65706A]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Low
                  </span>
                  <span className="font-semibold text-[#18221E]">
                    {priorityStats.low} ({priorityStats.lowPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL 3: UPCOMING DEADLINES */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]/80">
              <h3 className="text-sm font-bold text-[#18221E]">Upcoming Deadlines</h3>
              <Link href="/app/calendar" className="text-xs font-semibold text-[#18221E] hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {upcomingDeadlineTasks.length === 0 ? (
                <div className="py-5 text-center text-[#65706A] text-xs">
                  No upcoming deadlines
                </div>
              ) : (
                upcomingDeadlineTasks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskDetails(item)}
                    className="flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AppIcon name="calendar" size={13} className="text-[#65706A] mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18221E] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#65706A] truncate">
                          {item.project?.name || item.departmentName || "General"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[11px] text-[#65706A]">{item.dueTimeText || "Upcoming"}</p>
                      <span
                        className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                          item.priority === "urgent" || item.priority === "high"
                            ? "bg-red-50 text-red-700"
                            : item.priority === "medium"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#10251F]/40 backdrop-blur-xs">
          <div className="w-full max-w-[1180px] max-h-[calc(100vh-64px)] h-auto rounded-[20px] border border-[#D8DDD4] bg-white shadow-2xl overflow-hidden flex flex-col text-[#18221E] my-auto">
            {/* 1. TOP HEADER (Sticky / Fixed) */}
            <div className="px-6 sm:px-8 py-4 border-b border-[#D8DDD4]/80 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <span
                  style={{ backgroundColor: selectedTaskDetails.project.color }}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-bold text-white shadow-2xs"
                >
                  {selectedTaskDetails.project.icon}
                </span>
                <span className="font-bold text-sm text-[#18221E]">
                  {selectedTaskDetails.project.name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAEFE6] px-2.5 py-0.5 text-xs font-semibold text-[#246244]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
                  Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                  title="Share / Copy link"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                  title="More actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="19" cy="12" r="1.75" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTaskDetails(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                  title="Close modal"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#D8DDD4]/80">
              {/* Top Section: Title, Description & Compact Metadata Grid */}
              <div className="px-6 sm:px-8 pt-6 pb-6 space-y-5 bg-white">
                {/* Title + Priority Row */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl sm:text-[28px] font-bold text-[#18221E] tracking-tight leading-snug">
                      {selectedTaskDetails.title}
                    </h1>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                        selectedTaskDetails.priority === "urgent" || selectedTaskDetails.priority === "high"
                          ? "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]"
                          : selectedTaskDetails.priority === "medium"
                          ? "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]"
                          : "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          selectedTaskDetails.priority === "urgent" || selectedTaskDetails.priority === "high"
                            ? "bg-[#D9383A]"
                            : selectedTaskDetails.priority === "medium"
                            ? "bg-[#B58500]"
                            : "bg-[#246244]"
                        }`}
                      />
                      <span className="capitalize">{selectedTaskDetails.priority}</span>
                    </span>
                  </div>

                  {selectedTaskDetails.description && (
                    <p className="text-sm text-[#65706A] leading-relaxed max-w-3xl whitespace-pre-wrap">
                      {selectedTaskDetails.description}
                    </p>
                  )}
                </div>

                {/* Compact Information Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Card 1: Due Date */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Due Date</span>
                    </div>
                    <p className="text-sm font-bold text-[#18221E]">
                      {selectedTaskDetails.dueTimeText || "No due date"}
                    </p>
                  </div>

                  {/* Card 2: Assignee */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span>Assignee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-white shadow-2xs">
                        {selectedTaskDetails.assignee.initial || selectedTaskDetails.assignee.name[0] || "U"}
                      </div>
                      <span className="text-sm font-bold text-[#18221E] truncate">
                        {selectedTaskDetails.assignee.name}
                      </span>
                      {selectedTaskDetails.assignee.jobTitle && (
                        <span className="text-xs text-[#65706A] hidden md:inline truncate">
                          • {selectedTaskDetails.assignee.jobTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Status */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Status</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selectedTaskDetails.status === "completed"
                              ? "bg-[#246244]"
                              : selectedTaskDetails.status === "in_progress"
                              ? "bg-blue-600"
                              : selectedTaskDetails.status === "blocked"
                              ? "bg-red-500"
                              : "bg-[#B58500]"
                          }`}
                        />
                        <select
                          value={selectedTaskDetails.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as TaskStatus;
                            const isCompleted = newStatus === "completed";
                            setSelectedTaskDetails((prev) =>
                              prev ? { ...prev, status: newStatus, completed: isCompleted } : null
                            );
                            setLocalTasks((prev) =>
                              prev.map((t) =>
                                t.id === selectedTaskDetails.id
                                  ? { ...t, status: newStatus, completed: isCompleted }
                                  : t
                              )
                            );
                            await updateTaskAction({
                              taskId: selectedTaskDetails.id,
                              workspaceId,
                              status: newStatus,
                            });
                            router.refresh();
                          }}
                          className="text-sm font-bold text-[#18221E] capitalize bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="blocked">Blocked</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#65706A]">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Card 4: Project */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Project</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: selectedTaskDetails.project.color }}
                        className="flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-bold text-white shadow-2xs shrink-0"
                      >
                        {selectedTaskDetails.project.icon}
                      </span>
                      <span className="text-sm font-bold text-[#18221E] truncate">
                        {selectedTaskDetails.project.name}
                      </span>
                    </div>
                  </div>

                  {/* Card 5: Task ID */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      Task ID
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#18221E] font-mono">
                        RP-{selectedTaskDetails.id.slice(0, 8).toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`RP-${selectedTaskDetails.id.slice(0, 8).toUpperCase()}`);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#D8DDD4] bg-white text-[#65706A] hover:text-[#18221E] transition-colors"
                        title="Copy Task ID"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Card 6: Created */}
                  <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      Created
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#18221E]" suppressHydrationWarning>
                        {formatDateDeterministic(selectedTaskDetails.createdAt)}
                      </span>
                      <span className="text-xs text-[#65706A]">by {selectedTaskDetails.creatorName || "Workspace Member"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation Bar (52px Height) */}
              <div className="px-6 sm:px-8 border-b border-[#D8DDD4]/80 flex items-center gap-8 text-sm font-semibold h-[52px] shrink-0 bg-white overflow-x-auto whitespace-nowrap">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "attachments", label: "Files & Attachments", count: selectedTaskDetails.attachments?.length || 0 },
                  { key: "activity", label: "Activity" },
                ].map((tab) => {
                  const isActive = taskDetailTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTaskDetailTab(tab.key as any)}
                      className={`h-full relative flex items-center gap-2 transition-colors ${
                        isActive ? "text-[#18221E]" : "text-[#65706A] hover:text-[#18221E]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            isActive ? "bg-[#10251F] text-white" : "bg-[#EAEFE6] text-[#18221E]"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#10251F] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hidden file input for uploading attachments */}
              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleModalFileUpload}
                className="hidden"
              />

              {/* Main Content Layout */}
              <div className="px-6 sm:px-8 py-6 bg-white min-h-[320px]">
                {/* TAB 1: OVERVIEW */}
                {taskDetailTab === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
                    {/* Left Column: Description & Attachments */}
                    <div className="space-y-8 min-w-0">
                      {/* Description */}
                      <div className="space-y-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                          Description
                        </h2>
                        <div className="rounded-xl border border-[#D8DDD4]/80 bg-[#FAF9F5]/40 p-4 text-sm text-[#18221E] leading-relaxed whitespace-pre-wrap min-h-[90px]">
                          {selectedTaskDetails.description ? (
                            selectedTaskDetails.description
                          ) : (
                            <span className="text-[#8A958F] italic">No description provided for this task.</span>
                          )}
                        </div>
                      </div>

                      {/* Attached Files Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                            Attached Files ({selectedTaskDetails.attachments?.length || 0})
                          </h2>
                          <button
                            type="button"
                            onClick={() => setTaskDetailTab("attachments")}
                            className="text-xs font-semibold text-[#246244] hover:underline"
                          >
                            Manage all files →
                          </button>
                        </div>
                        {selectedTaskDetails.attachments && selectedTaskDetails.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedTaskDetails.attachments.map((file) => {
                              const isImage = file.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name);
                              return (
                                <a
                                  key={file.id}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-xl border border-[#D8DDD4] bg-white hover:bg-[#FAF9F5] hover:border-[#10251F] transition-all shadow-2xs group"
                                >
                                  {isImage ? (
                                    <img
                                      src={file.file_url}
                                      alt={file.file_name}
                                      className="w-12 h-12 rounded-lg object-cover border border-[#D8DDD4] shrink-0 bg-slate-100"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-[#EAEFE6] text-[#10251F] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                      {file.file_name.split(".").pop() || "file"}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#18221E] truncate group-hover:text-[#246244]">
                                      {file.file_name}
                                    </p>
                                    <p className="text-[11px] text-[#65706A]">
                                      {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "Attached file"} • Click to view
                                    </p>
                                  </div>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#65706A] group-hover:text-[#18221E] shrink-0">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-[#D8DDD4] text-center text-xs text-[#65706A] bg-[#FAF9F5]">
                            No files attached yet.{" "}
                            <button
                              type="button"
                              onClick={() => setTaskDetailTab("attachments")}
                              className="text-[#246244] font-semibold hover:underline"
                            >
                              Attach a file
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Properties & Quick Actions */}
                    <div className="space-y-6">
                      <div className="rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-5 space-y-4 shadow-2xs">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A958F] pb-2 border-b border-[#D8DDD4]/70">
                          Task Information
                        </h3>

                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#65706A]">Priority</span>
                            <span className="capitalize font-semibold text-[#18221E]">
                              {selectedTaskDetails.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#65706A]">Project</span>
                            <span className="font-semibold text-[#18221E]">
                              {selectedTaskDetails.project.name}
                            </span>
                          </div>
                          {selectedTaskDetails.departmentName && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#65706A]">Department</span>
                              <span className="font-semibold text-[#18221E]">
                                {selectedTaskDetails.departmentName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[#65706A]">Due Date</span>
                            <span className="font-semibold text-[#18221E]">
                              {selectedTaskDetails.dueTimeText || "None"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#65706A]">Assignee</span>
                            <span className="font-semibold text-[#18221E]">
                              {selectedTaskDetails.assignee.name}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#D8DDD4]/70 space-y-2">
                          <button
                            type="button"
                            disabled={uploadingAttachment}
                            onClick={() => modalFileInputRef.current?.click()}
                            className="w-full rounded-[10px] border border-[#D8DDD4] bg-white py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <span>📎</span>
                            <span>{uploadingAttachment ? "Uploading..." : "Attach File"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelectedTask}
                            className="w-full rounded-[10px] border border-red-200 bg-red-50/50 py-2 text-xs font-semibold text-red-600 hover:bg-red-100/60 shadow-2xs transition-colors cursor-pointer"
                          >
                            Delete Task
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: FILES & ATTACHMENTS */}
                {taskDetailTab === "attachments" && (
                  <div className="space-y-6">
                    {/* Upload Dropzone */}
                    <div
                      onClick={() => modalFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#D8DDD4] rounded-2xl p-6 text-center bg-[#FAF9F5]/60 hover:bg-white hover:border-[#10251F] transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#EAEFE6] text-[#10251F] mx-auto flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        +
                      </div>
                      <p className="text-xs font-bold text-[#18221E]">
                        {uploadingAttachment ? "Uploading file..." : "Click to upload an attachment to this task"}
                      </p>
                      <p className="text-[11px] text-[#65706A]">
                        Supports images, documents (PDF, DOCX), archives, and logos
                      </p>
                    </div>

                    {/* Files Grid */}
                    {selectedTaskDetails.attachments && selectedTaskDetails.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedTaskDetails.attachments.map((file) => {
                          const isImage = file.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name);
                          return (
                            <div
                              key={file.id}
                              className="rounded-xl border border-[#D8DDD4] bg-white p-3.5 space-y-2.5 shadow-2xs hover:border-[#10251F] transition-colors"
                            >
                              {isImage ? (
                                <div className="w-full h-36 rounded-lg overflow-hidden border border-[#D8DDD4] bg-slate-50 flex items-center justify-center">
                                  <img
                                    src={file.file_url}
                                    alt={file.file_name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-36 rounded-lg bg-[#FAF9F5] border border-[#D8DDD4] flex flex-col items-center justify-center gap-1.5 text-[#65706A]">
                                  <span className="text-2xl font-bold uppercase">{file.file_name.split(".").pop() || "FILE"}</span>
                                  <span className="text-xs">Document</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#18221E] truncate" title={file.file_name}>
                                  {file.file_name}
                                </p>
                                <p className="text-[11px] text-[#65706A]">
                                  {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "File"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t border-[#D8DDD4]/60">
                                <a
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 rounded-[8px] border border-[#D8DDD4] bg-white py-1.5 text-center text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                                >
                                  View Full
                                </a>
                                <a
                                  href={file.file_url}
                                  download={file.file_name}
                                  className="flex-1 rounded-[8px] bg-[#10251F] py-1.5 text-center text-xs font-semibold text-white hover:bg-[#18221E]"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-[#65706A] bg-[#FAF9F5]/40 rounded-xl border border-dashed border-[#D8DDD4]">
                        No files attached to this task yet.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ACTIVITY */}
                {taskDetailTab === "activity" && (
                  <div className="space-y-6 max-w-2xl">
                    {/* Add Comment Form */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                        Add Comment or Update
                      </h3>
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write a message or update on this task..."
                          className="w-full rounded-xl border border-[#D8DDD4] bg-white p-3 text-xs text-[#18221E] placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!newCommentText.trim() || submittingComment}
                            onClick={handleAddComment}
                            className="rounded-[8px] bg-[#10251F] text-white px-4 py-2 text-xs font-semibold hover:bg-[#18221E] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {submittingComment ? "Posting..." : "Post Comment"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A958F]">
                        Activity History
                      </h3>
                      <div className="space-y-3 text-xs">
                        {/* Task Creation event */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF9F5] border border-[#D8DDD4]/60">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-white shadow-2xs mt-0.5">
                            {(selectedTaskDetails.creatorName || "T")[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[#18221E] font-semibold">
                                {selectedTaskDetails.creatorName || "Workspace Member"}
                              </p>
                              <span className="text-[11px] text-[#8A958F] shrink-0" suppressHydrationWarning>
                                {formatDateDeterministic(selectedTaskDetails.createdAt)}
                              </span>
                            </div>
                            <p className="text-[#65706A] text-[11px] mt-0.5">
                              Created this task in project {selectedTaskDetails.project.name}
                            </p>
                          </div>
                        </div>

                        {/* Real comments if any */}
                        {selectedTaskDetails.rawTask?.comments && selectedTaskDetails.rawTask.comments.length > 0 ? (
                          selectedTaskDetails.rawTask.comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#D8DDD4]">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#246244] text-[10px] font-bold text-white shadow-2xs mt-0.5">
                                {c.author?.full_name ? c.author.full_name[0] : "M"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[#18221E] font-semibold">
                                    {c.author?.full_name || "Team Member"}
                                  </p>
                                  <span className="text-[11px] text-[#8A958F] shrink-0" suppressHydrationWarning>
                                    {formatDateDeterministic(c.created_at)}
                                  </span>
                                </div>
                                <p className="text-[#18221E] text-xs mt-1 whitespace-pre-wrap">
                                  {c.content}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. STICKY FOOTER (Fixed at Bottom of Modal) */}
            <div className="px-6 sm:px-8 py-4 border-t border-[#D8DDD4] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTask(selectedTaskDetails)}
                  className="rounded-[10px] bg-[#10251F] text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-2 hover:bg-[#18221E] shadow-2xs transition-colors cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{selectedTaskDetails.completed ? "Mark Incomplete" : "Mark Complete"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors cursor-pointer"
                >
                  Attach File
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelectedTask}
                  className="rounded-[10px] border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskDetails(null)}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-5 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
