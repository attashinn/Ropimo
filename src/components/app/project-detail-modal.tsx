"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
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
  Send,
  Paperclip,
  Smile,
  AtSign,
  Download,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  X,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  Maximize2,
  Minimize2,
  CheckSquare,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { RichDescriptionEditor } from "@/components/app/rich-description-editor";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { Workspace } from "@/types/workspace";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import {
  updateProjectAction,
} from "@/lib/project/actions";
import { createTaskAction, updateTaskAction } from "@/lib/task/actions";
import { cn } from "@/lib/utils";
import {
  StatusMenu,
  PriorityMenu,
  AssigneesMenu,
  STATUS_LIST,
  PRIORITY_OPTIONS,
  ClickUpStatus,
  ClickUpPriority,
} from "./clickup-property-dropdowns";
import { DatePicker } from "@/components/ui/date-picker";

export interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  workspace: Workspace;
  tasks?: Task[];
  people?: WorkspacePerson[];
  departments?: Department[];
  onProjectUpdated?: (updatedProject: Project) => void;
  onProjectDeleted?: (projectId: string) => void;
  onTaskClicked?: (task: Task) => void;
}

export function ProjectDetailModal({
  isOpen,
  onClose,
  project,
  workspace,
  tasks = [],
  people = [],
  departments = [],
  onProjectUpdated,
  onProjectDeleted,
  onTaskClicked,
}: ProjectDetailModalProps) {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<ClickUpStatus>("todo");
  const [priority, setPriority] = React.useState<ClickUpPriority>("urgent");
  const [leadId, setLeadId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"details" | "subtasks" | "attachments" | "activity">("details");
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // Criteria State
  const [criteria, setCriteria] = React.useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newCriteriaInput, setNewCriteriaInput] = React.useState("");
  const [showAddCriteria, setShowAddCriteria] = React.useState(false);

  // Time Tracking
  const [loggedMinutes, setLoggedMinutes] = React.useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(0);
  const [isLoggingTime, setIsLoggingTime] = React.useState(false);
  const [logTimeInput, setLogTimeInput] = React.useState("");

  // Tags
  const [tags, setTags] = React.useState<string[]>([]);
  const [isEditingTags, setIsEditingTags] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState("");

  // Due Date State
  const [dueDate, setDueDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [reviewerId, setReviewerId] = React.useState("");

  // Comments
  const [comments, setComments] = React.useState<
    {
      id: string;
      user: string;
      role: string;
      avatarBg: string;
      text: string;
      time: string;
      attachment?: { name: string; type: string; size: string };
    }[]
  >([]);
  const [newComment, setNewComment] = React.useState("");

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Dropdown menus
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Local project tasks state
  const [localTasks, setLocalTasks] = React.useState<Task[]>(tasks);
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<TaskPriority>("medium");
  const [creatingTask, setCreatingTask] = React.useState(false);
  const [taskSearch, setTaskSearch] = React.useState("");
  const [addingTaskStatus, setAddingTaskStatus] = React.useState<TaskStatus | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = React.useState("");
  const [inlineTaskPriority, setInlineTaskPriority] = React.useState<TaskPriority>("medium");
  const [inlineTaskDueDate, setInlineTaskDueDate] = React.useState("");
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
  const [taskPriorityDropdownId, setTaskPriorityDropdownId] = React.useState<string | null>(null);
  const [taskStatusDropdownId, setTaskStatusDropdownId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      setTaskPriorityDropdownId(null);
      setTaskStatusDropdownId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync state when project changes
  React.useEffect(() => {
    if (project) {
      setName(project.name || "Document Project Overview");
      setDescription(
        project.description ||
        "Define the single source of truth for the engagement.\n\n" +
        "Document the product summary, business context, current phase, target users, primary journeys, project goals, key deliverables, success measures, assumptions, stakeholders, and open questions."
      );
      
      let initialStatus: ClickUpStatus = "todo";
      if (project.status === "active" || project.status === "in_progress") initialStatus = "in_progress";
      else if (project.status === "on_hold") initialStatus = "on_hold";
      else if (project.status === "completed") initialStatus = "complete";
      else if (project.status === "cancelled") initialStatus = "cancelled";
      setStatus(initialStatus);

      let initialPriority: ClickUpPriority = "urgent";
      if (project.priority === "urgent") initialPriority = "urgent";
      else if (project.priority === "high") initialPriority = "high";
      else if (project.priority === "medium") initialPriority = "normal";
      else if (project.priority === "low") initialPriority = "low";
      setPriority(initialPriority);

      setDepartmentId(project.department_id || "");
      setLeadId(project.lead_id || project.manager_id || (people[0]?.user_id ?? ""));
    }
  }, [project, people]);

  if (!isOpen || !project) return null;

  const activeDepartment = departments.find((d) => d.id === departmentId);
  const selectedLead = people.find((p) => p.user_id === leadId) || people[0];

  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

  const currentOwner = people.find((p) => p.role === "owner") || people[0];
  const creatorName = currentOwner?.full_name || "Tashin Khan";
  const createdOnText = project.created_at
    ? new Date(project.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently";

  const daysLeft = (() => {
    if (!dueDate) return null;
    const target = new Date(dueDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "Due today";
    return `${diff}d left`;
  })();

  const formattedDueDate = (() => {
    if (!dueDate) return "No due date";
    const [y, m, d] = dueDate.split("-");
    if (!y || !m || !d) return dueDate;
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  const projectTasks = localTasks.filter((t) => project && t.project_id === project.id);

  const handleToggleTaskStatus = async (task: Task) => {
    const isComp = task.status === "completed";
    const nextStatus: TaskStatus = isComp ? "todo" : "completed";

    // Optimistic update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateTaskAction({
        taskId: task.id,
        workspaceId: workspace.id,
        status: nextStatus,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setTaskStatusDropdownId(null);
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId: workspace.id,
        status: newStatus,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskPriority = async (taskId: string, newPriority: TaskPriority) => {
    setTaskPriorityDropdownId(null);
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    try {
      await updateTaskAction({
        taskId,
        workspaceId: workspace.id,
        priority: newPriority,
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInlineCreateTask = async (status: TaskStatus) => {
    if (!inlineTaskTitle.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await createTaskAction({
        workspaceId: workspace.id,
        projectId: project.id,
        departmentId: project.department_id || undefined,
        title: inlineTaskTitle.trim(),
        priority: inlineTaskPriority,
        dueDate: inlineTaskDueDate || undefined,
        status,
      });
      if (res.success && res.taskId) {
        const newTaskItem: Task = {
          id: res.taskId,
          workspace_id: workspace.id,
          project_id: project.id,
          department_id: project.department_id || null,
          title: inlineTaskTitle.trim(),
          description: null,
          status,
          priority: inlineTaskPriority,
          due_date: inlineTaskDueDate || null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assignees: [],
          attachments: [],
          activities: [],
          comments: [],
          submissions: [],
          project: {
            id: project.id,
            name: project.name,
            color: project.color || "#10251F",
            icon: project.icon || "folder",
          },
        };
        setLocalTasks((prev) => [newTaskItem, ...prev]);
        setInlineTaskTitle("");
        setInlineTaskDueDate("");
        setAddingTaskStatus(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await createTaskAction({
        workspaceId: workspace.id,
        projectId: project.id,
        departmentId: project.department_id || undefined,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: "todo",
      });
      if (res.success && res.taskId) {
        const newTaskItem: Task = {
          id: res.taskId,
          workspace_id: workspace.id,
          project_id: project.id,
          department_id: project.department_id || null,
          title: newTaskTitle.trim(),
          description: null,
          status: "todo",
          priority: newTaskPriority,
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
            id: project.id,
            name: project.name,
            color: project.color || "#10251F",
            icon: project.icon || "folder",
          },
        };
        setLocalTasks((prev) => [newTaskItem, ...prev]);
        setNewTaskTitle("");
        setIsAddingTask(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateField = async (fields: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    departmentId?: string;
    leadId?: string;
  }) => {
    try {
      await updateProjectAction({
        projectId: project.id,
        workspaceId: workspace.id,
        ...fields,
      });
      if (onProjectUpdated) {
        onProjectUpdated({
          ...project,
          ...(fields.name ? { name: fields.name } : {}),
          ...(fields.description ? { description: fields.description } : {}),
          ...(fields.status ? { status: fields.status } : {}),
          ...(fields.priority ? { priority: fields.priority } : {}),
        });
      }
      router.refresh();
    } catch {}
  };

  const handleStatusChange = async (newStatus: ClickUpStatus) => {
    setStatus(newStatus);
    setOpenDropdown(null);

    let dbStatus: ProjectStatus = "planning";
    if (newStatus === "in_progress" || newStatus === "at_risk" || newStatus === "update_required") dbStatus = "active";
    if (newStatus === "on_hold") dbStatus = "on_hold";
    if (newStatus === "complete") dbStatus = "completed";
    if (newStatus === "cancelled") dbStatus = "cancelled";

    await handleUpdateField({ status: dbStatus });
  };

  const handlePriorityChange = async (newPriority: ClickUpPriority) => {
    setPriority(newPriority);
    setOpenDropdown(null);

    let dbPriority: ProjectPriority = "medium";
    if (newPriority === "urgent") dbPriority = "urgent";
    else if (newPriority === "high") dbPriority = "high";
    else if (newPriority === "normal") dbPriority = "medium";
    else if (newPriority === "low") dbPriority = "low";

    await handleUpdateField({ priority: dbPriority });
  };

  const handleToggleComplete = async () => {
    const isComp = status === "complete";
    const nextStatus: ClickUpStatus = isComp ? "todo" : "complete";
    await handleStatusChange(nextStatus);
  };

  const handleAddCriteriaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaInput.trim()) return;
    setCriteria([
      ...criteria,
      { id: `c-${Date.now()}`, text: newCriteriaInput.trim(), done: false },
    ]);
    setNewCriteriaInput("");
    setShowAddCriteria(false);
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      ...comments,
      {
        id: `cm-${Date.now()}`,
        user: "Tashin Khan",
        role: "Workspace Member",
        avatarBg: "bg-[#0F172A]",
        text: newComment.trim(),
        time: "Just now",
      },
    ]);
    setNewComment("");
  };

  const handleLogTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(logTimeInput);
    if (!isNaN(hours) && hours > 0) {
      setLoggedMinutes(loggedMinutes + Math.round(hours * 60));
    }
    setLogTimeInput("");
    setIsLoggingTime(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(newTagInput.trim())) {
        setTags([...tags, newTagInput.trim()]);
      }
      setNewTagInput("");
    }
  };

  const formatHoursMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const progressPercent = Math.min(100, Math.round((loggedMinutes / estimatedMinutes) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden bg-black/45 backdrop-blur-[3px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          ref={dropdownRef}
          className={`relative z-10 flex flex-col bg-white border border-[#E2E8F0] shadow-2xl rounded-[18px] overflow-hidden text-[#111827] font-sans antialiased transition-all ${
            isFullscreen
              ? "fixed inset-2 sm:inset-3 max-w-none h-[calc(100vh-1.5rem)]"
              : "w-[94vw] max-w-[1220px] h-[90vh] max-h-[880px]"
          }`}
        >
          {/* ── TOP BREADCRUMB & HEADER BAR ──────────────────────────────── */}
          <div className="flex items-center justify-between px-7 py-3.5 border-b border-[#F1F5F9] bg-white shrink-0 text-[13px] select-none">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-[#64748B]">
              <span className="hover:text-[#0F172A] cursor-pointer font-normal">
                {activeDepartment ? activeDepartment.name : "Development"}
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="hover:text-[#0F172A] cursor-pointer font-normal">
                Projects
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="font-semibold text-[#0F172A] truncate max-w-[280px]">
                {name || project.name}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 text-[#64748B]">
              <div className="relative hidden sm:block">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search anything... ⌘K"
                  className="w-56 pl-8 pr-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white transition-all"
                />
              </div>

              <button
                type="button"
                className="relative p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </button>

              <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold">
                TK
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg text-[#94A3B8] hover:text-[#0F172A] transition-colors ml-1"
                title={isFullscreen ? "Restore" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SCROLLABLE BODY ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-8 pt-7 pb-8">
            {/* ── TITLE & PRIMARY ACTIONS ROW ────────────────────────────── */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="space-y-3 flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleUpdateField({ name })}
                  placeholder="Project name..."
                  className="w-full text-[26px] font-bold text-[#0F172A] placeholder:text-[#94A3B8] bg-transparent border-0 focus:outline-none tracking-tight"
                />

                {/* Quick Badges Row */}
                <div className="flex items-center gap-2.5 flex-wrap text-[12.5px]">
                  {/* ClickUp Exact Status Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentStatusObj.icon}
                        <span>{currentStatusObj.label}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {openDropdown === "status" && (
                      <div className="absolute left-0 top-full mt-1 z-50">
                        <StatusMenu
                          currentStatus={status}
                          onSelect={handleStatusChange}
                        />
                      </div>
                    )}
                  </div>

                  {/* ClickUp Exact Priority Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentPriorityObj.icon}
                        <span className={currentPriorityObj.color}>{currentPriorityObj.label}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {openDropdown === "priority" && (
                      <div className="absolute left-0 top-full mt-1 z-50">
                        <PriorityMenu
                          currentPriority={priority}
                          onSelect={handlePriorityChange}
                          people={people}
                        />
                      </div>
                    )}
                  </div>

                  {/* ClickUp Exact Assignee Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[8px] font-bold">
                        {selectedLead?.full_name ? selectedLead.full_name[0] : "TK"}
                      </div>
                      <span>{selectedLead?.full_name || "Tashin khan"}</span>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {openDropdown === "assignee" && (
                      <div className="absolute left-0 top-full mt-1 z-50">
                        <AssigneesMenu
                          selectedId={leadId}
                          onSelect={(userId) => {
                            setLeadId(userId);
                            setOpenDropdown(null);
                            handleUpdateField({ leadId: userId });
                          }}
                          people={people}
                        />
                      </div>
                    )}
                  </div>

                  {/* Due Date Badge */}
                  <div className="relative">
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="Due date"
                      buttonClassName="h-7 px-2.5 rounded-full bg-[#F1F5F9] border-transparent text-[#475569] hover:bg-[#E2E8F0] shadow-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors ${
                    isBookmarked ? "text-amber-500 bg-amber-50/50" : "text-[#64748B]"
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    status === "complete"
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "bg-[#10251F] hover:bg-[#18342C] text-[#F4F3EE]"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{status === "complete" ? "Completed" : "Mark as done"}</span>
                </button>
              </div>
            </div>

            {/* ── HORIZONTAL TABS ────────────────────────────────────────── */}
            <div className="flex items-center gap-8 border-b border-[#F1F5F9] mb-7 text-[13.5px]">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`pb-3 font-semibold transition-all relative ${
                  activeTab === "details"
                    ? "text-[#0F172A]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Details</span>
                {activeTab === "details" && (
                  <motion.div
                    layoutId="projPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("subtasks")}
                className={`pb-3 flex items-center gap-1.5 font-medium transition-all relative ${
                  activeTab === "subtasks"
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Tasks</span>
                <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569]">
                  {projectTasks.length}
                </span>
                {activeTab === "subtasks" && (
                  <motion.div
                    layoutId="projPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={`pb-3 flex items-center gap-1.5 font-medium transition-all relative ${
                  activeTab === "attachments"
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Attachments</span>
                <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569]">
                  3
                </span>
                {activeTab === "attachments" && (
                  <motion.div
                    layoutId="projPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("activity")}
                className={`pb-3 font-medium transition-all relative ${
                  activeTab === "activity"
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Activity</span>
                {activeTab === "activity" && (
                  <motion.div
                    layoutId="projPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>
            </div>

            {/* ── 2-COLUMN GRID BODY ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* ── LEFT COLUMN ────────────────────────────────────────── */}
              <div className="lg:col-span-8 space-y-8">
                {/* 1. DETAILS TAB */}
                {activeTab === "details" && (
                  <div className="space-y-8">
                    {/* Description */}
                    <div className="space-y-3">
                      <h2 className="text-[14px] font-bold text-[#0F172A]">Description</h2>
                      <RichDescriptionEditor
                        value={description}
                        onChange={(val) => setDescription(val)}
                        onBlur={(val) => handleUpdateField({ description: val })}
                        placeholder="Add detailed project overview, roadmap, and scope..."
                      />
                    </div>

                {/* Acceptance Criteria */}
                <div className="space-y-3.5 pt-2">
                  <h2 className="text-[14px] font-bold text-[#0F172A]">Acceptance criteria</h2>

                  <div className="space-y-2.5">
                    {criteria.map((c) => (
                      <div
                        key={c.id}
                        onClick={() =>
                          setCriteria(
                            criteria.map((item) =>
                              item.id === c.id ? { ...item, done: !item.done } : item
                            )
                          )
                        }
                        className="flex items-center gap-3 text-[13.5px] cursor-pointer group select-none"
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded flex items-center justify-center transition-all ${
                            c.done
                              ? "bg-[#10B981] text-white"
                              : "border border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]"
                          }`}
                        >
                          {c.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={
                            c.done
                              ? "line-through text-[#94A3B8]"
                              : "text-[#334155] group-hover:text-[#0F172A]"
                          }
                        >
                          {c.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {showAddCriteria ? (
                    <form onSubmit={handleAddCriteriaSubmit} className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        autoFocus
                        value={newCriteriaInput}
                        onChange={(e) => setNewCriteriaInput(e.target.value)}
                        placeholder="Type acceptance criteria..."
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#0F172A]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCriteria(false)}
                        className="px-2 py-2 text-xs text-[#64748B] hover:text-[#0F172A]"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddCriteria(true)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#10B981] hover:text-[#059669] pt-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add criteria</span>
                    </button>
                  )}
                </div>

                {/* Comments Thread */}
                <div className="space-y-4 pt-4 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-[#0F172A]">Comments</h2>
                    <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569]">
                      {comments.length}
                    </span>
                  </div>

                  {/* Comment Input */}
                  <form
                    onSubmit={handleAddCommentSubmit}
                    className="flex items-center gap-3 p-2 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold shrink-0 ml-1">
                      TK
                    </div>
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 text-xs bg-transparent text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                    />
                    <div className="flex items-center gap-1 text-[#94A3B8] mr-1">
                      <button type="button" className="p-1 hover:text-[#0F172A]">
                        <Smile className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-[#0F172A]">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1 hover:text-[#0F172A]">
                        <AtSign className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="p-1.5 rounded-lg bg-[#0F172A] text-white disabled:opacity-20 hover:bg-[#1E293B] transition-colors ml-1"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </form>

                  {/* Thread Comments */}
                  <div className="space-y-5 pt-2">
                    {comments.map((cm) => (
                      <div key={cm.id} className="flex items-start gap-3 text-xs">
                        <div className="w-8 h-8 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {cm.user.split(" ").map((n) => n[0]).join("")}
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0F172A] text-[13px]">{cm.user}</span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                              {cm.role}
                            </span>
                          </div>

                          <p className="text-[13px] text-[#334155] leading-normal">{cm.text}</p>

                          {cm.attachment && (
                            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] max-w-sm mt-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shadow-2xs">
                                  <svg className="w-4 h-4" viewBox="0 0 38 57" fill="none">
                                    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                                    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                                    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                                    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                                    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-semibold text-[#0F172A] text-xs">{cm.attachment.name}</p>
                                  <p className="text-[10px] text-[#64748B]">
                                    {cm.attachment.type} • {cm.attachment.size}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-white text-[#64748B] hover:text-[#0F172A] transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-[#94A3B8]">
                            <span>{cm.time}</span>
                            <button type="button" className="hover:text-[#0F172A] font-medium">
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                )}

                {/* 2. CLICKUP-STYLE TASKS TAB */}
                {activeTab === "subtasks" && (() => {
                  const filteredTasks = projectTasks.filter((t) => {
                    if (!taskSearch.trim()) return true;
                    return t.title.toLowerCase().includes(taskSearch.toLowerCase());
                  });

                  const completedCount = projectTasks.filter((t) => t.status === "completed").length;
                  const completionRate = projectTasks.length > 0
                    ? Math.round((completedCount / projectTasks.length) * 100)
                    : 0;

                  const GROUPS: {
                    id: TaskStatus;
                    label: string;
                    headerBg: string;
                    badgeBg: string;
                    badgeText: string;
                    dotColor: string;
                    filterFn: (t: Task) => boolean;
                  }[] = [
                    {
                      id: "todo",
                      label: "TO DO",
                      headerBg: "hover:bg-slate-50",
                      badgeBg: "bg-slate-100",
                      badgeText: "text-slate-700",
                      dotColor: "bg-slate-400",
                      filterFn: (t) => t.status === "todo",
                    },
                    {
                      id: "in_progress",
                      label: "IN PROGRESS",
                      headerBg: "hover:bg-purple-50/40",
                      badgeBg: "bg-purple-100",
                      badgeText: "text-[#7C3AED]",
                      dotColor: "bg-[#7C3AED]",
                      filterFn: (t) => t.status === "in_progress",
                    },
                    {
                      id: "in_review",
                      label: "IN REVIEW",
                      headerBg: "hover:bg-amber-50/40",
                      badgeBg: "bg-amber-100",
                      badgeText: "text-amber-800",
                      dotColor: "bg-amber-500",
                      filterFn: (t) => t.status === "in_review" || t.status === "blocked" || t.status === "changes_requested",
                    },
                    {
                      id: "completed",
                      label: "COMPLETE",
                      headerBg: "hover:bg-teal-50/40",
                      badgeBg: "bg-teal-100",
                      badgeText: "text-[#0D9488]",
                      dotColor: "bg-[#0D9488]",
                      filterFn: (t) => t.status === "completed",
                    },
                  ];

                  return (
                    <div className="space-y-6">
                      {/* ClickUp Header Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-bold text-[#0F172A]">Tasks</h2>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {projectTasks.length}
                            </span>
                          </div>

                          {/* Progress Meter */}
                          {projectTasks.length > 0 && (
                            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-[#0D9488] transition-all duration-300 rounded-full"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {completedCount}/{projectTasks.length} ({completionRate}%)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Search & Quick Add */}
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={taskSearch}
                              onChange={(e) => setTaskSearch(e.target.value)}
                              placeholder="Search tasks..."
                              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 w-44 sm:w-52"
                            />
                            {taskSearch && (
                              <button
                                type="button"
                                onClick={() => setTaskSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingTaskStatus("todo");
                              setInlineTaskTitle("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-semibold hover:bg-[#19362e] transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Task</span>
                          </button>
                        </div>
                      </div>

                      {/* Zero State if no tasks at all */}
                      {projectTasks.length === 0 ? (
                        <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-400">
                            <CheckSquare className="w-6 h-6 text-[#10251F]" />
                          </div>
                          <div className="max-w-md mx-auto">
                            <p className="text-sm font-bold text-[#0F172A]">No tasks in this project yet</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              Organize your deliverables into ClickUp-style status groups, assign owners, set deadlines, and track milestones.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingTaskStatus("todo");
                              setInlineTaskTitle("");
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10251F] text-[#C7F34A] text-xs font-semibold hover:bg-[#19362e] transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create First Task</span>
                          </button>
                        </div>
                      ) : (
                        /* ClickUp Status Groups */
                        <div className="space-y-6">
                          {GROUPS.map((group) => {
                            const groupTasks = filteredTasks.filter(group.filterFn);
                            const isCollapsed = !!collapsedGroups[group.id];
                            const isQuickAddActive = addingTaskStatus === group.id;

                            // Skip empty completed/review groups only if user is actively searching and there are no results
                            if (taskSearch.trim() && groupTasks.length === 0) {
                              return null;
                            }

                            return (
                              <div
                                key={group.id}
                                className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs"
                              >
                                {/* Group Header */}
                                <div
                                  onClick={() => {
                                    setCollapsedGroups((prev) => ({
                                      ...prev,
                                      [group.id]: !prev[group.id],
                                    }));
                                  }}
                                  className={cn(
                                    "flex items-center justify-between px-3 py-2.5 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none transition-colors",
                                    group.headerBg
                                  )}
                                >
                                  {/* Left: Status Pill + Count */}
                                  <div className="flex items-center gap-2">
                                    <ChevronDown
                                      className={cn(
                                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-150",
                                        isCollapsed && "-rotate-90"
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-2xs",
                                        group.badgeBg,
                                        group.badgeText
                                      )}
                                    >
                                      <span className={cn("w-1.5 h-1.5 rounded-full", group.dotColor)} />
                                      {group.label}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      {groupTasks.length}
                                    </span>
                                  </div>

                                  {/* Right: Table Column Labels & Quick Add */}
                                  <div className="flex items-center gap-6">
                                    <div className="hidden md:flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      <span className="w-24 text-center">Assignee</span>
                                      <span className="w-24 text-center">Due Date</span>
                                      <span className="w-20 text-center">Priority</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingTaskStatus(group.id);
                                        setInlineTaskTitle("");
                                        if (isCollapsed) {
                                          setCollapsedGroups((prev) => ({ ...prev, [group.id]: false }));
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors"
                                      title={`Add task to ${group.label}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Task Rows */}
                                {!isCollapsed && (
                                  <div className="divide-y divide-slate-100">
                                    {groupTasks.length === 0 && !isQuickAddActive ? (
                                      <div className="py-4 px-4 text-center text-xs text-slate-400">
                                        No tasks in {group.label.toLowerCase()}
                                      </div>
                                    ) : (
                                      groupTasks.map((t) => {
                                        const isCompleted = t.status === "completed";
                                        const assignee = t.assignees?.[0] || people.find((p) => p.user_id === t.created_by);

                                        // Priority metadata
                                        const priorityConfig: Record<
                                          TaskPriority,
                                          { flagColor: string; bg: string; text: string; label: string }
                                        > = {
                                          urgent: {
                                            flagColor: "text-red-600 fill-red-600",
                                            bg: "bg-red-50 hover:bg-red-100/80 border-red-200",
                                            text: "text-red-700",
                                            label: "Urgent",
                                          },
                                          high: {
                                            flagColor: "text-amber-500 fill-amber-500",
                                            bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200",
                                            text: "text-amber-700",
                                            label: "High",
                                          },
                                          medium: {
                                            flagColor: "text-blue-500 fill-blue-500",
                                            bg: "bg-blue-50 hover:bg-blue-100/80 border-blue-200",
                                            text: "text-blue-700",
                                            label: "Normal",
                                          },
                                          low: {
                                            flagColor: "text-slate-400 fill-slate-400",
                                            bg: "bg-slate-50 hover:bg-slate-100/80 border-slate-200",
                                            text: "text-slate-600",
                                            label: "Low",
                                          },
                                        };
                                        const pMeta = priorityConfig[t.priority] || priorityConfig.medium;

                                        // Due date calculation
                                        let dueDateLabel: string | null = null;
                                        let isOverdue = false;
                                        if (t.due_date) {
                                          const d = new Date(t.due_date);
                                          if (!isNaN(d.getTime())) {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const target = new Date(d);
                                            target.setHours(0, 0, 0, 0);
                                            const diffDays = Math.round(
                                              (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                                            );
                                            isOverdue = diffDays < 0 && !isCompleted;
                                            if (diffDays === 0) dueDateLabel = "Today";
                                            else if (diffDays === 1) dueDateLabel = "Tomorrow";
                                            else if (diffDays === -1) dueDateLabel = "Yesterday";
                                            else
                                              dueDateLabel = d.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                              });
                                          }
                                        }

                                        return (
                                          <div
                                            key={t.id}
                                            className="group flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                                          >
                                            {/* Left: Status Circle & Title */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              {/* ClickUp Check Circle Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleTaskStatus(t);
                                                }}
                                                className={cn(
                                                  "w-4 h-4 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer",
                                                  isCompleted
                                                    ? "bg-[#0D9488] text-white shadow-2xs"
                                                    : "border-2 border-slate-300 hover:border-[#0D9488] hover:bg-teal-50 text-transparent hover:text-[#0D9488]"
                                                )}
                                                title={isCompleted ? "Mark as incomplete" : "Click to complete"}
                                              >
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                              </button>

                                              {/* Title */}
                                              <span
                                                onClick={() =>
                                                  onTaskClicked ? onTaskClicked(t) : router.push("/app/my-tasks")
                                                }
                                                className={cn(
                                                  "text-xs font-medium truncate cursor-pointer transition-colors leading-snug",
                                                  isCompleted
                                                    ? "line-through text-slate-400"
                                                    : "text-[#0F172A] hover:text-[#0D9488]"
                                                )}
                                                title={t.title}
                                              >
                                                {t.title}
                                              </span>
                                            </div>

                                            {/* Right: Columns (Assignee, Due Date, Priority, Actions) */}
                                            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                                              {/* Assignee */}
                                              <div className="w-20 sm:w-24 flex items-center justify-center">
                                                {assignee ? (
                                                  <div
                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-700 font-medium max-w-full"
                                                    title={assignee.full_name || assignee.email}
                                                  >
                                                    <span className="w-3.5 h-3.5 rounded-full bg-[#10251F] text-[#C7F34A] flex items-center justify-center text-[8px] font-bold shrink-0">
                                                      {(assignee.full_name || assignee.email || "U").charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="truncate max-w-[55px]">
                                                      {assignee.full_name ? assignee.full_name.split(" ")[0] : "User"}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[11px] text-slate-300 group-hover:text-slate-400 flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="text-[10px] hidden sm:inline">None</span>
                                                  </span>
                                                )}
                                              </div>

                                              {/* Due Date */}
                                              <div className="w-20 sm:w-24 flex items-center justify-center">
                                                {dueDateLabel ? (
                                                  <span
                                                    className={cn(
                                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                                                      isOverdue
                                                        ? "bg-red-50 text-red-600 border-red-200"
                                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                                    )}
                                                  >
                                                    <Calendar className="w-2.5 h-2.5" />
                                                    <span>{dueDateLabel}</span>
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-slate-300 group-hover:text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-2.5 h-2.5" />
                                                    <span className="hidden sm:inline">No date</span>
                                                  </span>
                                                )}
                                              </div>

                                              {/* Priority Dropdown Trigger */}
                                              <div className="w-18 sm:w-20 relative flex items-center justify-center">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTaskPriorityDropdownId(
                                                      taskPriorityDropdownId === t.id ? null : t.id
                                                    );
                                                    setTaskStatusDropdownId(null);
                                                  }}
                                                  className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer",
                                                    pMeta.bg,
                                                    pMeta.text
                                                  )}
                                                >
                                                  <Flag className={cn("w-2.5 h-2.5", pMeta.flagColor)} />
                                                  <span>{pMeta.label}</span>
                                                </button>

                                                {/* ClickUp Priority Popover */}
                                                {taskPriorityDropdownId === t.id && (
                                                  <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-32 animate-in fade-in zoom-in-95 duration-100"
                                                  >
                                                    {(
                                                      [
                                                        { id: "urgent", label: "Urgent", flag: "text-red-600 fill-red-600" },
                                                        { id: "high", label: "High", flag: "text-amber-500 fill-amber-500" },
                                                        { id: "medium", label: "Normal", flag: "text-blue-500 fill-blue-500" },
                                                        { id: "low", label: "Low", flag: "text-slate-400 fill-slate-400" },
                                                      ] as const
                                                    ).map((opt) => (
                                                      <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => handleUpdateTaskPriority(t.id, opt.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 font-medium text-slate-700"
                                                      >
                                                        <Flag className={cn("w-3 h-3", opt.flag)} />
                                                        <span>{opt.label}</span>
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Open Task Modal Link */}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  onTaskClicked ? onTaskClicked(t) : router.push("/app/my-tasks")
                                                }
                                                className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Open task details"
                                              >
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}

                                    {/* Inline Rapid Task Creator Row */}
                                    {isQuickAddActive ? (
                                      <form
                                        onSubmit={(e) => {
                                          e.preventDefault();
                                          handleInlineCreateTask(group.id);
                                        }}
                                        className="p-3 bg-[#FAF9F5] border-t border-slate-200 space-y-2.5 animate-in fade-in duration-150"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                                          <input
                                            type="text"
                                            autoFocus
                                            value={inlineTaskTitle}
                                            onChange={(e) => setInlineTaskTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Escape") {
                                                setAddingTaskStatus(null);
                                                setInlineTaskTitle("");
                                              }
                                            }}
                                            placeholder={`Task name in ${group.label}... (Press Enter to save)`}
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10251F] shadow-2xs"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between pl-6 text-xs">
                                          <div className="flex items-center gap-2">
                                            <select
                                              value={inlineTaskPriority}
                                              onChange={(e) => setInlineTaskPriority(e.target.value as TaskPriority)}
                                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                                            >
                                              <option value="urgent">🚩 Urgent</option>
                                              <option value="high">🚩 High</option>
                                              <option value="medium">🚩 Normal</option>
                                              <option value="low">🚩 Low</option>
                                            </select>
                                            <input
                                              type="date"
                                              value={inlineTaskDueDate}
                                              onChange={(e) => setInlineTaskDueDate(e.target.value)}
                                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAddingTaskStatus(null);
                                                setInlineTaskTitle("");
                                              }}
                                              className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="submit"
                                              disabled={!inlineTaskTitle.trim() || creatingTask}
                                              className="px-3.5 py-1 rounded-lg bg-[#10251F] text-[#C7F34A] text-[11px] font-semibold hover:bg-[#19362e] disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1"
                                            >
                                              <span>{creatingTask ? "Saving..." : "Save Task"}</span>
                                              <span className="text-[9px] opacity-70">↵</span>
                                            </button>
                                          </div>
                                        </div>
                                      </form>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAddingTaskStatus(group.id);
                                          setInlineTaskTitle("");
                                        }}
                                        className="w-full flex items-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Task</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. ATTACHMENTS TAB */}
                {activeTab === "attachments" && (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-[#E2E8F0] space-y-2 bg-[#FAF9F5]/40">
                    <Paperclip className="w-6 h-6 text-[#94A3B8] mx-auto" />
                    <p className="text-xs font-semibold text-[#0F172A]">Project Files & Assets</p>
                    <p className="text-[11px] text-[#64748B]">All project specs, briefs, and assets can be attached here.</p>
                  </div>
                )}

                {/* 4. ACTIVITY TAB */}
                {activeTab === "activity" && (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-[#E2E8F0] space-y-2 bg-[#FAF9F5]/40">
                    <Clock className="w-6 h-6 text-[#94A3B8] mx-auto" />
                    <p className="text-xs font-semibold text-[#0F172A]">Project Activity Timeline</p>
                    <p className="text-[11px] text-[#64748B]">Created {createdOnText} by {creatorName}</p>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN (Project Details, Time Tracking, Tags) ─────── */}
              <div className="lg:col-span-4 space-y-6">
                {/* Card 1: Project Details */}
                <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs space-y-4 text-[13px]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A]">Project details</h3>
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="text-xs font-semibold text-[#246244] hover:underline flex items-center gap-1"
                    >
                      <span>Full view</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-3.5">
                    {/* Assignee */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <User className="w-4 h-4 text-[#94A3B8]" />
                        <span>Assignee</span>
                      </span>
                      <div className="flex items-center gap-2 font-medium text-[#0F172A]">
                        <div className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[9px] font-bold">
                          {selectedLead?.full_name ? selectedLead.full_name[0] : "TK"}
                        </div>
                        <span>{selectedLead?.full_name || "Tashin khan"}</span>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#94A3B8]" />
                        <span>Department</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
                        <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{activeDepartment ? activeDepartment.name : "Development"}</span>
                      </div>
                    </div>

                    {/* Project */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <Folder className="w-4 h-4 text-[#94A3B8]" />
                        <span>Project</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
                        <Folder className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{project.name}</span>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <Flag className="w-4 h-4 text-[#94A3B8]" />
                        <span>Priority</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {currentPriorityObj.icon}
                        <span className={`font-medium text-[12px] ${currentPriorityObj.color}`}>
                          {currentPriorityObj.label}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <CircleDot className="w-4 h-4 text-[#94A3B8]" />
                        <span>Status</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {currentStatusObj.icon}
                        <span className="font-semibold text-[12px] text-zinc-800">
                          {currentStatusObj.label}
                        </span>
                      </div>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#64748B] flex items-center gap-2 shrink-0">
                        <Calendar className="w-4 h-4 text-[#94A3B8]" />
                        <span>Due date</span>
                      </span>
                      <DatePicker
                        value={dueDate}
                        onChange={setDueDate}
                        placeholder="No due date"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px] border-[#E2E8F0] shadow-none"
                        align="right"
                      />
                    </div>

                    {/* Created by */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <User className="w-4 h-4 text-[#94A3B8]" />
                        <span>Created by</span>
                      </span>
                      <span className="font-medium text-[#0F172A]">{creatorName}</span>
                    </div>

                    {/* Created on */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8]" />
                        <span>Created on</span>
                      </span>
                      <span className="text-[#475569] text-xs">{createdOnText}</span>
                    </div>

                    {/* Reviewer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-2">
                        <User className="w-4 h-4 text-[#94A3B8]" />
                        <span>Reviewer</span>
                      </span>
                      <select
                        value={reviewerId}
                        onChange={(e) => setReviewerId(e.target.value)}
                        className="text-xs font-medium text-[#0F172A] bg-transparent border border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#0F172A] rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[150px] truncate"
                      >
                        <option value="">Unassigned</option>
                        {people.map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {p.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 2: Time Tracking */}
                <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs space-y-4">
                  <h3 className="font-bold text-[#0F172A] text-[13px]">Time tracking</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#94A3B8] block text-[11px]">Logged time</span>
                        <span className="font-bold text-[#0F172A] text-sm">{formatHoursMins(loggedMinutes)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#94A3B8] block text-[11px]">Estimated</span>
                        <span className="font-semibold text-[#475569] text-sm">{formatHoursMins(estimatedMinutes)}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          style={{ width: `${progressPercent}%` }}
                          className="h-full bg-[#10B981] rounded-full transition-all duration-300"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#64748B]">{progressPercent}%</span>
                    </div>

                    {isLoggingTime ? (
                      <form onSubmit={handleLogTimeSubmit} className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          step="0.5"
                          autoFocus
                          value={logTimeInput}
                          onChange={(e) => setLogTimeInput(e.target.value)}
                          placeholder="Hours (e.g. 1.5)"
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#0F172A]"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLoggingTime(false)}
                          className="text-xs text-[#64748B] hover:text-[#0F172A]"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsLoggingTime(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>Log time</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 3: Tags */}
                <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] text-[13px]">Tags</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingTags(!isEditingTags)}
                      className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2.5 py-1 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#065F46] font-medium text-xs flex items-center gap-1"
                      >
                        <span>{t}</span>
                        {isEditingTags && (
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((x) => x !== t))}
                            className="text-emerald-800 hover:text-red-600"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                    {isEditingTags && (
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="+ Tag..."
                        className="w-16 px-1.5 py-0.5 text-xs border-b border-[#0F172A] focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
