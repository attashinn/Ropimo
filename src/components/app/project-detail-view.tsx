"use client";

import * as React from "react";
import Link from "next/link";
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
  CheckSquare,
  ArrowUpRight,
  Edit2,
  Trash2,
  Share2,
  Upload,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { RichDescriptionEditor } from "@/components/app/rich-description-editor";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { Workspace } from "@/types/workspace";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { updateProjectAction, deleteProjectAction } from "@/lib/project/actions";
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
import { TaskDetailModal } from "./task-detail-modal";
import { EditProjectModal } from "./edit-project-modal";
import { DeleteProjectDialog } from "./delete-project-dialog";

export interface ProjectFileItem {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  file_type?: string;
  extension?: string;
  created_at: string;
  uploaded_by?: string | null;
}

export interface ProjectDetailViewProps {
  project: Project;
  workspace: Workspace;
  tasks?: Task[];
  people?: WorkspacePerson[];
  projects?: Project[];
  departments?: Department[];
  initialPhase?: string;
  initialFiles?: ProjectFileItem[];
}

export function ProjectDetailView({
  project,
  workspace,
  tasks = [],
  people = [],
  projects = [],
  departments = [],
  initialFiles = [],
}: ProjectDetailViewProps) {
  const router = useRouter();

  const [projectFiles, setProjectFiles] = React.useState<ProjectFileItem[]>(initialFiles);
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Core editable fields
  const [name, setName] = React.useState(project.name || "Project Overview");
  const [description, setDescription] = React.useState(
    project.description ||
      "Define the single source of truth for the engagement.\n\n" +
        "Document the product summary, business context, current phase, target users, primary journeys, project goals, key deliverables, success measures, assumptions, stakeholders, and open questions."
  );
  const [status, setStatus] = React.useState<ClickUpStatus>(() => {
    if (project.status === "active" || project.status === "in_progress") return "in_progress";
    if (project.status === "on_hold") return "on_hold";
    if (project.status === "completed") return "complete";
    if (project.status === "cancelled") return "cancelled";
    return "todo";
  });
  const [priority, setPriority] = React.useState<ClickUpPriority>(() => {
    if (project.priority === "urgent") return "urgent";
    if (project.priority === "high") return "high";
    if (project.priority === "medium") return "normal";
    if (project.priority === "low") return "low";
    return "normal";
  });
  const [leadId, setLeadId] = React.useState(project.lead_id || project.manager_id || (people[0]?.user_id ?? ""));
  const [departmentId, setDepartmentId] = React.useState(project.department_id || "");
  const [activeTab, setActiveTab] = React.useState<"details" | "tasks" | "attachments" | "activity">("tasks");
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // Criteria State
  const [criteria, setCriteria] = React.useState<{ id: string; text: string; done: boolean }[]>([
    { id: "c-1", text: "Product requirements aligned with stakeholders", done: true },
    { id: "c-2", text: "Design system tokens and components confirmed", done: false },
    { id: "c-3", text: "Initial release test coverage above 80%", done: false },
  ]);
  const [newCriteriaInput, setNewCriteriaInput] = React.useState("");
  const [showAddCriteria, setShowAddCriteria] = React.useState(false);

  // Time Tracking
  const [loggedMinutes, setLoggedMinutes] = React.useState(250);
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(480);
  const [isLoggingTime, setIsLoggingTime] = React.useState(false);
  const [logTimeInput, setLogTimeInput] = React.useState("");

  // Tags
  const [tags, setTags] = React.useState<string[]>(["Core Engine", "Q3 Deliverable", "Client Facing"]);
  const [isEditingTags, setIsEditingTags] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState("");

  // Due Date
  const [dueDate, setDueDate] = React.useState<string>(() => {
    if (project.deadline) return new Date(project.deadline).toISOString().split("T")[0];
    if (project.due_date) return new Date(project.due_date).toISOString().split("T")[0];
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

  // Dropdowns
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Local tasks state & modal selection
  const [localTasks, setLocalTasks] = React.useState<Task[]>(tasks);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [taskSearch, setTaskSearch] = React.useState("");
  const [addingTaskStatus, setAddingTaskStatus] = React.useState<TaskStatus | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = React.useState("");
  const [inlineTaskPriority, setInlineTaskPriority] = React.useState<TaskPriority>("medium");
  const [inlineTaskDueDate, setInlineTaskDueDate] = React.useState("");
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
  const [taskPriorityDropdownId, setTaskPriorityDropdownId] = React.useState<string | null>(null);
  const [taskStatusDropdownId, setTaskStatusDropdownId] = React.useState<string | null>(null);
  const [creatingTask, setCreatingTask] = React.useState(false);

  // Modals
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

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

  // Filter tasks for this project
  const projectTasks = localTasks.filter((t) => t.project_id === project.id);
  const activeDepartment = departments.find((d) => d.id === departmentId);
  const activeLead = people.find((p) => p.user_id === leadId);

  const createdOnText = (() => {
    const dateObj = new Date(project.created_at || Date.now());
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  // Handlers
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
      router.refresh();
    } catch (err) {
      console.error(err);
    }
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

  const handleToggleTaskStatus = async (task: Task) => {
    const isComp = task.status === "completed";
    const nextStatus: TaskStatus = isComp ? "todo" : "completed";

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

  const handleInlineCreateTask = async (taskStatus: TaskStatus) => {
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
        status: taskStatus,
      });
      if (res.success && res.taskId) {
        const newTaskItem: Task = {
          id: res.taskId,
          workspace_id: workspace.id,
          project_id: project.id,
          department_id: project.department_id || null,
          title: inlineTaskTitle.trim(),
          description: null,
          status: taskStatus,
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

  const filteredProjectTasks = projectTasks.filter((t) => {
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
    <div ref={dropdownRef} className="space-y-6 font-sans text-[#18221E] pb-24">
      {/* ── PROJECT HEADER BAR ────────────────────────────────────────── */}
      <div className="space-y-4 pt-1">
        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#10251F] text-[#C7F34A] flex items-center justify-center shrink-0 shadow-2xs">
              <Folder className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleUpdateField({ name })}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] bg-transparent border-none outline-none focus:ring-0 p-0 w-full hover:bg-slate-100/70 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors"
              placeholder="Project Name"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard?.writeText(window.location.href);
                  alert("Project link copied to clipboard!");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title="Edit Project"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors cursor-pointer shadow-2xs",
                isBookmarked
                  ? "border-amber-300 bg-amber-50 text-amber-500"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700"
              )}
              title="Bookmark Project"
            >
              <Bookmark className={cn("w-3.5 h-3.5", isBookmarked && "fill-current")} />
            </button>

            <button
              type="button"
              onClick={handleToggleComplete}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer",
                status === "complete"
                  ? "bg-[#0D9488] text-white hover:bg-[#0f766e]"
                  : "bg-[#10251F] text-white hover:bg-[#19362e]"
              )}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{status === "complete" ? "Completed" : "Mark as done"}</span>
            </button>
          </div>
        </div>

        {/* ClickUp Property Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer shadow-2xs text-[11px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10251F]" />
              <span className="uppercase tracking-wider">{status.replace("_", " ")}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {openDropdown === "status" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <StatusMenu currentStatus={status} onSelect={handleStatusChange} />
              </div>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer shadow-2xs text-[11px]"
            >
              <Flag
                className={cn(
                  "w-3 h-3",
                  priority === "urgent"
                    ? "text-red-600 fill-red-600"
                    : priority === "high"
                    ? "text-amber-500 fill-amber-500"
                    : priority === "normal"
                    ? "text-blue-500 fill-blue-500"
                    : "text-slate-400 fill-slate-400"
                )}
              />
              <span className="capitalize">{priority}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {openDropdown === "priority" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <PriorityMenu currentPriority={priority} onSelect={handlePriorityChange} />
              </div>
            )}
          </div>

          {/* Lead / Manager */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "lead" ? null : "lead")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer shadow-2xs text-[11px]"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#10251F] text-[#C7F34A] flex items-center justify-center text-[8px] font-bold">
                {(activeLead?.full_name || "T").charAt(0).toUpperCase()}
              </div>
              <span>{activeLead?.full_name || "Tashin khan"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {openDropdown === "lead" && (
              <div className="absolute left-0 top-full mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <AssigneesMenu
                  people={people}
                  selectedId={leadId}
                  onSelect={(id: string) => {
                    setLeadId(id);
                    setOpenDropdown(null);
                    handleUpdateField({ leadId: id });
                  }}
                />
              </div>
            )}
          </div>

          {/* Department */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-medium shadow-2xs">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>{activeDepartment?.name || "Development"}</span>
          </div>

          {/* Due Date with ClickUp DatePicker */}
          <div className="flex items-center">
            <DatePicker
              value={dueDate}
              onChange={(newDate) => {
                setDueDate(newDate);
              }}
              placeholder="Set due date"
              buttonClassName="h-auto py-1 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ───────────────────────────────────────────── */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-7 text-xs font-semibold text-slate-500">
          {[
            { id: "tasks", label: `Tasks (${projectTasks.length})` },
            { id: "details", label: "Overview" },
            { id: "attachments", label: `Attachments (${projectFiles.length})` },
            { id: "activity", label: "Activity" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "pb-3 pt-1 relative transition-colors cursor-pointer text-[13px]",
                  isActive ? "text-[#0F172A] font-bold" : "hover:text-[#0F172A]"
                )}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F172A]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      {/* 1. OVERVIEW / DETAILS TAB */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          <div className="lg:col-span-8 space-y-8">
                  {/* Rich Description */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Description
                    </h3>
                    <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                      <RichDescriptionEditor
                        value={description}
                        onChange={(val) => {
                          setDescription(val);
                          handleUpdateField({ description: val });
                        }}
                      />
                    </div>
                  </div>

                  {/* Acceptance Criteria */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Acceptance Criteria
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddCriteria(!showAddCriteria)}
                        className="text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add criteria</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {criteria.map((cr) => (
                        <div
                          key={cr.id}
                          onClick={() => {
                            setCriteria(
                              criteria.map((c) => (c.id === cr.id ? { ...c, done: !c.done } : c))
                            );
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all cursor-pointer group"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                              cr.done
                                ? "bg-[#0D9488] border-[#0D9488] text-white"
                                : "border-slate-300 bg-white group-hover:border-slate-400"
                            )}
                          >
                            {cr.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className={cn(
                              "text-xs font-medium transition-colors flex-1",
                              cr.done ? "line-through text-slate-400" : "text-slate-800"
                            )}
                          >
                            {cr.text}
                          </span>
                        </div>
                      ))}

                      {showAddCriteria && (
                        <form onSubmit={handleAddCriteriaSubmit} className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            autoFocus
                            value={newCriteriaInput}
                            onChange={(e) => setNewCriteriaInput(e.target.value)}
                            placeholder="Enter criteria and press Enter..."
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#10251F]"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-bold hover:bg-[#19362e]"
                          >
                            Add
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Tasks Deliverables Preview Section (Right Under The Page!) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                          Deliverables & Tasks
                        </h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {projectTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tasks")}
                        className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                      >
                        View all tasks in board →
                      </button>
                    </div>

                    {projectTasks.length === 0 ? (
                      <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                        <CheckSquare className="w-5 h-5 text-slate-400 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700">No deliverables added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("tasks");
                            setAddingTaskStatus("todo");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-semibold hover:bg-[#19362e] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                        {projectTasks.map((t) => {
                          const isCompleted = t.status === "completed";
                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
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
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </button>
                                <span
                                  className={cn(
                                    "text-xs font-semibold truncate group-hover:text-[#0D9488] transition-colors",
                                    isCompleted ? "line-through text-slate-400" : "text-slate-900"
                                  )}
                                >
                                  {t.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {t.status.replace("_", " ")}
                                </span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comments Thread */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Comments ({comments.length})
                    </h3>

                    {/* Comment Composer */}
                    <form
                      onSubmit={handleAddCommentSubmit}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          TK
                        </div>
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400 pt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-400">
                        <div className="flex items-center gap-2 pl-10">
                          <button type="button" className="hover:text-slate-600 p-1">
                            <Smile className="w-4 h-4" />
                          </button>
                          <button type="button" className="hover:text-slate-600 p-1">
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button type="button" className="hover:text-slate-600 p-1">
                            <AtSign className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="p-1.5 rounded-lg bg-[#10251F] text-[#C7F34A] hover:bg-[#19362e] disabled:opacity-40 cursor-pointer shadow-xs transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                    {/* Comment List */}
                    {comments.length > 0 && (
                      <div className="space-y-3">
                        {comments.map((cm) => (
                          <div key={cm.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{cm.user}</span>
                              <span className="text-[10px] text-slate-400">{cm.time}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{cm.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Time Tracking & Tags */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Time Tracking Card */}
                  <div className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Time Tracking
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsLoggingTime(!isLoggingTime)}
                        className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                      >
                        + Log time
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-900">{formatHoursMins(loggedMinutes)}</span>
                      <span className="text-slate-500 font-medium">
                        of {formatHoursMins(estimatedMinutes)} estimated
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className="h-full bg-[#0D9488] rounded-full transition-all"
                      />
                    </div>

                    {isLoggingTime && (
                      <form onSubmit={handleLogTimeSubmit} className="pt-2 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.25"
                          min="0.25"
                          value={logTimeInput}
                          onChange={(e) => setLogTimeInput(e.target.value)}
                          placeholder="Hours (e.g. 1.5)"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-bold shrink-0"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Tags Card */}
                  <div className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Tags
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingTags(!isEditingTags)}
                        className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                      >
                        + Add tag
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tg) => (
                        <span
                          key={tg}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {tg}
                        </span>
                      ))}
                    </div>

                    {isEditingTags && (
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Type tag & press Enter..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

      {/* 2. CLICKUP-STYLE TASKS TAB (FULL WIDTH) */}
      {activeTab === "tasks" && (
        <div className="space-y-6 pt-2">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-bold text-[#0F172A]">Project Tasks</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {projectTasks.length}
                        </span>
                      </div>

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

                    {/* Search & Add Button */}
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

                  {/* Tasks List */}
                  {projectTasks.length === 0 ? (
                    <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-400">
                        <CheckSquare className="w-6 h-6 text-[#10251F]" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <p className="text-sm font-bold text-[#0F172A]">No tasks in this project yet</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Break down deliverables into ClickUp-style status groups, assign owners, set deadlines, and track milestones.
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
                    <div className="space-y-6">
                      {GROUPS.map((group) => {
                        const groupTasks = filteredProjectTasks.filter(group.filterFn);
                        const isCollapsed = !!collapsedGroups[group.id];
                        const isQuickAddActive = addingTaskStatus === group.id;

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
                                "flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none transition-colors",
                                group.headerBg
                              )}
                            >
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
                                  className="p-1 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
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
                                    const assignee =
                                      t.assignees?.[0] || people.find((p) => p.user_id === t.created_by);

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
                                        onClick={() => setSelectedTask(t)}
                                        className="group flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                                      >
                                        {/* Left: Circle & Title */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                          >
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          </button>
                                          <span
                                            className={cn(
                                              "text-xs font-medium truncate transition-colors leading-snug",
                                              isCompleted
                                                ? "line-through text-slate-400"
                                                : "text-[#0F172A] hover:text-[#0D9488]"
                                            )}
                                          >
                                            {t.title}
                                          </span>
                                        </div>

                                        {/* Right Columns */}
                                        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                                          {/* Assignee */}
                                          <div className="w-20 sm:w-24 flex items-center justify-center">
                                            {assignee ? (
                                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-700 font-medium max-w-full">
                                                <span className="w-3.5 h-3.5 rounded-full bg-[#10251F] text-[#C7F34A] flex items-center justify-center text-[8px] font-bold shrink-0">
                                                  {(assignee.full_name || assignee.email || "U")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                </span>
                                                <span className="truncate max-w-[55px]">
                                                  {assignee.full_name
                                                    ? assignee.full_name.split(" ")[0]
                                                    : "User"}
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

                                          {/* Priority Flag */}
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

                                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                                        </div>
                                      </div>
                                    );
                                  })
                                )}

                                {/* Inline Rapid Task Creator */}
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
              )}

              {/* 3. ATTACHMENTS TAB */}
              {activeTab === "attachments" && (
                <div className="space-y-6 pt-2">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
                        <span>Project Files & Brand Assets</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {projectFiles.length}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Brand logos, design specifications, client briefs, and deliverables attached to this project.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const uploaded = e.target.files;
                          if (!uploaded || uploaded.length === 0) return;

                          setIsUploadingFile(true);
                          const fileList = Array.from(uploaded);
                          e.target.value = "";

                          try {
                            for (const file of fileList) {
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("folder", "attachments");
                              formData.append("workspaceId", workspace.id);

                              const res = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });
                              const uploadData = await res.json();

                              if (uploadData.success) {
                                const fileUrl = uploadData.fileUrl || uploadData.url;
                                const { uploadFilesAction } = await import("@/lib/files/actions");
                                await uploadFilesAction([
                                  {
                                    workspaceId: workspace.id,
                                    name: file.name,
                                    fileType: file.type.startsWith("image/") ? "image" : "document",
                                    fileSize: file.size,
                                    fileUrl,
                                    projectId: project.id,
                                  },
                                ]);

                                const newFile: ProjectFileItem = {
                                  id: `pf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                  name: file.name,
                                  file_url: fileUrl,
                                  file_size: file.size,
                                  file_type: file.type.startsWith("image/") ? "image" : "document",
                                  extension: file.name.split(".").pop() || "",
                                  created_at: new Date().toISOString(),
                                };
                                setProjectFiles((prev) => [newFile, ...prev]);
                              }
                            }
                            router.refresh();
                          } catch (err) {
                            console.error("Error uploading project file:", err);
                          } finally {
                            setIsUploadingFile(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#10251F] hover:bg-[#18342C] text-[#C7F34A] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingFile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Files</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Empty State vs Files Grid */}
                  {projectFiles.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50 transition-all cursor-pointer space-y-3"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-500">
                        <Upload className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">
                          Click to upload or drag and drop files here
                        </p>
                        <p className="text-[11px] text-slate-500">
                          SVG, PNG, JPG, PDF, ZIP, or document files up to 50MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {projectFiles.map((f) => {
                        const isImg =
                          f.file_type === "image" ||
                          ["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(
                            f.extension?.toLowerCase() || ""
                          ) ||
                          Boolean(f.name.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i));
                        const formattedSize =
                          f.file_size > 1024 * 1024
                            ? `${(f.file_size / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.round(f.file_size / 1024)} KB`;

                        return (
                          <div
                            key={f.id}
                            className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
                          >
                            {/* Visual Preview / Thumbnail Area */}
                            <div className="relative h-36 bg-[#F8FAFC] border-b border-slate-100 flex items-center justify-center p-3 overflow-hidden">
                              {isImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={f.file_url}
                                  alt={f.name}
                                  className="max-h-full max-w-full object-contain drop-shadow-sm rounded transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                                  <FileText className="w-6 h-6 text-slate-500" />
                                </div>
                              )}

                              {/* Hover Action Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                <a
                                  href={f.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-white/90 text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                  title="View Full File"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                <a
                                  href={f.file_url}
                                  download={f.name}
                                  className="p-2 rounded-lg bg-white/90 text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>

                            {/* Details Row */}
                            <div className="p-3.5 flex flex-col justify-between flex-1">
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-900 truncate" title={f.name}>
                                  {f.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                  <span className="uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {f.extension || (isImg ? "IMAGE" : "FILE")}
                                  </span>
                                  <span>•</span>
                                  <span>{formattedSize}</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <a
                                  href={f.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View Asset</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </a>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(f.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ACTIVITY TAB */}
              {activeTab === "activity" && (
                <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 space-y-2 bg-slate-50/50">
                  <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-900">Project Activity Timeline</p>
                  <p className="text-[11px] text-slate-500">
                    Created on {createdOnText} by {activeLead?.full_name || "Tashin Khan"}
                  </p>
                </div>
              )}

      {/* ── MODALS (OPENED ON DEMAND) ────────────────────────────────────── */}
      {/* 1. TASK DETAIL MODAL: OPENS WHEN A TASK UNDER THE PAGE IS CLICKED! */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        workspace={workspace}
        people={people}
        projects={[project]}
        departments={departments}
        onTaskUpdated={(updated) => {
          setLocalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
      />

      {/* 2. EDIT PROJECT MODAL */}
      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />

      {/* 3. DELETE PROJECT DIALOG */}
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