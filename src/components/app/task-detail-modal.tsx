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
  Trash2,
  UploadCloud,
  FileText,
} from "lucide-react";
import { RichDescriptionEditor } from "@/components/app/rich-description-editor";
import {
  Task,
  TaskStatus,
  TaskPriority,
} from "@/types/task";
import { Workspace } from "@/types/workspace";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import {
  updateTaskAction,
  addTaskCommentAction,
  deleteTaskAction,
  toggleTaskCompletionAction,
} from "@/lib/task/actions";
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

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  workspace: Workspace;
  people?: WorkspacePerson[];
  projects?: Project[];
  departments?: Department[];
  onTaskUpdated?: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  workspace,
  people = [],
  projects = [],
  departments = [],
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<ClickUpStatus>("todo");
  const [priority, setPriority] = React.useState<ClickUpPriority>("normal");
  const [departmentId, setDepartmentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"details" | "attachments">("details");
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // File Attachments State
  const [attachments, setAttachments] = React.useState<{
    id: string;
    name: string;
    size: string;
    type: string;
    uploadedAt: string;
    url?: string;
  }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Dropdown menus
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync state when task prop changes
  React.useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      
      let initialStatus: ClickUpStatus = "todo";
      if (task.status === "in_progress") initialStatus = "in_progress";
      else if (task.status === "in_review") initialStatus = "update_required";
      else if (task.status === "blocked") initialStatus = "on_hold";
      else if (task.status === "completed") initialStatus = "complete";
      setStatus(initialStatus);

      let initialPriority: ClickUpPriority = "normal";
      if (task.priority === "urgent") initialPriority = "urgent";
      else if (task.priority === "high") initialPriority = "high";
      else if (task.priority === "medium") initialPriority = "normal";
      else if (task.priority === "low") initialPriority = "low";
      setPriority(initialPriority);

      setDepartmentId(task.department_id || "");
      setProjectId(task.project_id || "");
      setAssigneeId(task.assignees?.[0]?.user_id || "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");

      // Initial criteria
      if ((task as any).acceptance_criteria && Array.isArray((task as any).acceptance_criteria)) {
        setCriteria((task as any).acceptance_criteria);
      } else {
        setCriteria([]);
      }

      setLoggedMinutes((task as any).logged_minutes || 0);
      setEstimatedMinutes((task as any).estimated_minutes || 0);
      setTags((task as any).tags || []);
      setReviewerId((task as any).reviewer_id || "");

      // Initial attachments
      if (task.attachments && task.attachments.length > 0) {
        setAttachments(
          task.attachments.map((a) => ({
            id: a.id,
            name: a.file_name,
            size: a.file_size ? `${(a.file_size / 1024).toFixed(1)} KB` : "File",
            type: a.file_type || "Document",
            uploadedAt: new Date(a.created_at).toLocaleDateString(),
            url: a.file_url,
          }))
        );
      } else {
        setAttachments([]);
      }

      // Initial comments
      if (task.comments && task.comments.length > 0) {
        setComments(
          task.comments.map((cm) => ({
            id: cm.id,
            user: (cm as any).author_name || (cm as any).author?.name || "Member",
            role: "Team Member",
            avatarBg: "bg-[#1E1B4B]",
            text: cm.content,
            time: new Date(cm.created_at).toLocaleDateString(),
          }))
        );
      } else {
        setComments([]);
      }
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const activeDepartment = departments.find((d) => d.id === departmentId);
  const activeProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = people.find((p) => p.user_id === assigneeId) || task.assignees?.[0];

  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

  const currentOwner = people.find((p) => p.role === "owner") || people[0];
  const creatorName =
    (task as any).creator_name ||
    (task as any).creator?.full_name ||
    currentOwner?.full_name ||
    "Tashin Khan";

  const createdOnText = task.created_at
    ? new Date(task.created_at).toLocaleDateString("en-US", {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => {
      const sizeInMb = (f.size / (1024 * 1024)).toFixed(1);
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: `${sizeInMb} MB`,
        type: f.type || "Document",
        uploadedAt: "Just now",
      };
    });
    setAttachments((prev) => [...newItems, ...prev]);
    e.target.value = "";
  };

  const handleDeleteAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateField = async (fields: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    departmentId?: string;
    projectId?: string;
    assigneeIds?: string[];
    dueDate?: string;
  }) => {
    try {
      await updateTaskAction({
        taskId: task.id,
        workspaceId: workspace.id,
        ...fields,
      });
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          ...(fields.title ? { title: fields.title } : {}),
          ...(fields.description ? { description: fields.description } : {}),
          ...(fields.status ? { status: fields.status } : {}),
          ...(fields.priority ? { priority: fields.priority } : {}),
        });
      }
      router.refresh();
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (newStatus: ClickUpStatus) => {
    setStatus(newStatus);
    setOpenDropdown(null);

    let dbStatus: TaskStatus = "todo";
    if (newStatus === "in_progress" || newStatus === "at_risk" || newStatus === "update_required") dbStatus = "in_progress";
    if (newStatus === "on_hold") dbStatus = "blocked";
    if (newStatus === "complete" || newStatus === "cancelled") dbStatus = "completed";

    await handleUpdateField({ status: dbStatus });
  };

  const handlePriorityChange = async (newPriority: ClickUpPriority) => {
    setPriority(newPriority);
    setOpenDropdown(null);

    let dbPriority: TaskPriority = "medium";
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

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const text = newComment.trim();
    setNewComment("");

    setComments([
      ...comments,
      {
        id: `cm-${Date.now()}`,
        user: "Tashin Khan",
        role: "Workspace Member",
        avatarBg: "bg-[#0F172A]",
        text,
        time: "Just now",
      },
    ]);

    try {
      await addTaskCommentAction(task.id, workspace.id, text);
    } catch {}
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
                Tasks
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="font-semibold text-[#0F172A] truncate max-w-[280px]">
                {title || task.title}
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

          {/* Error Alert */}
          {errorMsg && (
            <div className="px-7 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── SCROLLABLE BODY ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-8 pt-7 pb-8">
            {/* ── TITLE & PRIMARY ACTIONS ROW ────────────────────────────── */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="space-y-3 flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleUpdateField({ title })}
                  placeholder="Task title..."
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
                        {selectedAssignee?.full_name ? selectedAssignee.full_name[0] : "TK"}
                      </div>
                      <span>{selectedAssignee?.full_name || "Tashin khan"}</span>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </button>

                    {openDropdown === "assignee" && (
                      <div className="absolute left-0 top-full mt-1 z-50">
                        <AssigneesMenu
                          selectedId={assigneeId}
                          onSelect={(userId) => {
                            setAssigneeId(userId);
                            setOpenDropdown(null);
                            handleUpdateField({ assigneeIds: [userId] });
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
                      onChange={(newDate) => {
                        setDueDate(newDate);
                        handleUpdateField({ dueDate: newDate ? new Date(newDate).toISOString() : undefined });
                      }}
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

            {/* ── HORIZONTAL TABS (Specifically Task Details & Attachments) ── */}
            <div className="flex items-center gap-8 border-b border-[#F1F5F9] mb-7 text-[13.5px]">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`pb-3 font-semibold transition-all relative cursor-pointer ${
                  activeTab === "details"
                    ? "text-[#0F172A]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>Details</span>
                {activeTab === "details" && (
                  <motion.div
                    layoutId="taskPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={`pb-3 flex items-center gap-2 font-medium transition-all relative cursor-pointer ${
                  activeTab === "attachments"
                    ? "text-[#0F172A] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments</span>
                </div>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                  {attachments.length}
                </span>
                {activeTab === "attachments" && (
                  <motion.div
                    layoutId="taskPopupActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>
            </div>

            {/* ── 2-COLUMN GRID BODY ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
              <div className="lg:col-span-8 space-y-8">
                {activeTab === "details" ? (
                  <>
                    {/* Description */}
                    <div className="space-y-3">
                      <h2 className="text-[14px] font-bold text-[#0F172A]">Description</h2>
                      <RichDescriptionEditor
                        value={description}
                        onChange={(val) => setDescription(val)}
                        onBlur={(val) => handleUpdateField({ description: val })}
                        placeholder="Add detailed task description, notes, and guidelines..."
                      />
                    </div>

                    {/* Acceptance Criteria */}
                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[14px] font-bold text-[#0F172A]">Acceptance criteria</h2>
                        <button
                          type="button"
                          onClick={() => setShowAddCriteria(!showAddCriteria)}
                          className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add criteria</span>
                        </button>
                      </div>

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

                      {showAddCriteria && (
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
                        </form>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="space-y-6 pt-4 border-t border-[#F1F5F9]">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[14px] font-bold text-[#0F172A]">
                          Comments <span className="text-neutral-400 font-normal ml-1">({comments.length})</span>
                        </h2>
                      </div>

                      {/* Comment Input */}
                      <form
                        onSubmit={handleAddCommentSubmit}
                        className="rounded-xl border border-[#E2E8F0] p-4 space-y-4 focus-within:border-[#0F172A] transition-all bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            TK
                          </div>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows={2}
                            className="w-full resize-none border-none outline-none text-xs text-[#0F172A] placeholder:text-[#94A3B8] p-0"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-[#64748B]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                              title="Attach file"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors"
                            >
                              <AtSign className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Send
                          </button>
                        </div>
                      </form>

                      {/* Comments List */}
                      <div className="space-y-4">
                        {comments.map((cm) => (
                          <div key={cm.id} className="flex items-start gap-3.5 group">
                            <div
                              className={`w-8 h-8 rounded-full ${cm.avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                            >
                              {cm.user
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#0F172A]">{cm.user}</span>
                                <span className="text-[11px] text-[#94A3B8]">{cm.role}</span>
                              </div>
                              <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#F8FAFC] border border-[#F1F5F9] text-xs text-[#334155] leading-relaxed space-y-3">
                                <p>{cm.text}</p>
                              </div>

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
                  </>
                ) : (
                  /* ── ATTACHMENTS TAB CONTENT ───────────────────────────── */
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-[15px] font-bold text-[#0F172A]">Files & Attachments</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Upload briefs, assets, and project files specifically for this task.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-semibold hover:bg-[#19362e] transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Attach File</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {/* Drag & Drop Upload Zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-[#10251F] hover:bg-slate-50/60 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#10251F] group-hover:text-[#C7F34A] transition-all">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                          Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          PDF, DOCX, PNG, JPG, ZIP (up to 50MB per file)
                        </p>
                      </div>
                    </div>

                    {/* Attachments List */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Attached Deliverables & Files ({attachments.length})
                        </h3>
                      </div>

                      {attachments.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          No files attached to this task yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                                    {att.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {att.size} • Uploaded {att.uploadedAt}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href="#"
                                  download={att.name}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    alert(`Downloading ${att.name}`);
                                  }}
                                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#0F172A] transition-colors cursor-pointer"
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Remove file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN (Task Details, Time Tracking, Tags) ─────── */}
              <div className="lg:col-span-4 space-y-6">
                {/* Card 1: Task Details */}
                <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs space-y-4 text-[13px]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A]">Task details</h3>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2.5 py-1 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      Edit
                    </button>
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
                          {selectedAssignee?.full_name ? selectedAssignee.full_name[0] : "TK"}
                        </div>
                        <span>{selectedAssignee?.full_name || "Tashin Khan"}</span>
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
                        <span>{activeProject ? activeProject.name : "Development"}</span>
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
                        onChange={(newDate) => {
                          setDueDate(newDate);
                          handleUpdateField({ dueDate: newDate ? new Date(newDate).toISOString() : undefined });
                        }}
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
