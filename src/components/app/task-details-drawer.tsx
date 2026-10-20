"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock,
  AlertCircle,
  Calendar,
  User,
  FolderKanban,
  Paperclip,
  Check,
  X,
  Share2,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, TaskAttachment, TaskComment } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import {
  updateTaskAction,
  deleteTaskAction,
  addTaskAttachmentAction,
  addTaskCommentAction,
} from "@/lib/task/actions";
import { cn } from "@/lib/utils";

export interface DisplayTaskItem {
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

export interface TaskDetailsDrawerProps {
  task: DisplayTaskItem | null;
  workspaceId: string;
  currentUserId: string;
  people: WorkspacePerson[];
  projects: Project[];
  onClose: () => void;
  onToggleComplete: (task: DisplayTaskItem) => void;
  onDeleteTask: (task: DisplayTaskItem) => void;
  onTaskUpdated?: (updated: DisplayTaskItem) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateDeterministic(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

export function TaskDetailsDrawer({
  task,
  workspaceId,
  currentUserId,
  people,
  projects,
  onClose,
  onToggleComplete,
  onDeleteTask,
  onTaskUpdated,
}: TaskDetailsDrawerProps) {
  const router = useRouter();
  const [currentTask, setCurrentTask] = React.useState<DisplayTaskItem | null>(task);
  const [taskDetailTab, setTaskDetailTab] = React.useState<"overview" | "attachments" | "activity">("overview");
  const [uploadingAttachment, setUploadingAttachment] = React.useState(false);
  const [newCommentText, setNewCommentText] = React.useState("");
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state when props task changes
  React.useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  // Global Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && task) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [task, onClose]);

  if (!task || !currentTask) {
    return null;
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const isCompleted = newStatus === "completed";
    const updated = { ...currentTask, status: newStatus, completed: isCompleted };
    setCurrentTask(updated);
    onTaskUpdated?.(updated);

    try {
      await updateTaskAction({
        taskId: currentTask.id,
        workspaceId,
        status: newStatus,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    const updated = { ...currentTask, priority: newPriority };
    setCurrentTask(updated);
    onTaskUpdated?.(updated);

    try {
      await updateTaskAction({
        taskId: currentTask.id,
        workspaceId,
        priority: newPriority,
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update priority", err);
      toast.error("Failed to update priority");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      if (!uploadRes.ok || (!uploadData.success && !uploadData.fileUrl && !uploadData.url)) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const fileUrl = uploadData.fileUrl || uploadData.url;
      const res = await addTaskAttachmentAction(
        currentTask.id,
        workspaceId,
        file.name,
        file.size,
        file.type || "application/octet-stream",
        fileUrl
      );

      if (res.success) {
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}`,
          task_id: currentTask.id,
          workspace_id: workspaceId,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          file_type: file.type || "application/octet-stream",
          created_at: new Date().toISOString(),
        };

        const updated: DisplayTaskItem = {
          ...currentTask,
          attachments: [...currentTask.attachments, newAttachment],
        };
        setCurrentTask(updated);
        onTaskUpdated?.(updated);
        toast.success("File attached successfully");
        router.refresh();
      }
    } catch (err) {
      console.error("File upload failed:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || submittingComment) return;
    setSubmittingComment(true);

    try {
      const res = await addTaskCommentAction(
        currentTask.id,
        workspaceId,
        newCommentText.trim()
      );

      if (res.success) {
        const newCommentObj: TaskComment = {
          id: res.commentId || `c-${Date.now()}`,
          task_id: currentTask.id,
          workspace_id: workspaceId,
          user_id: currentUserId,
          author: people.find((p) => (p.user_id || p.id) === currentUserId) || null,
          content: newCommentText.trim(),
          created_at: new Date().toISOString(),
        };

        const currentComments = currentTask.rawTask?.comments || [];
        const updated: DisplayTaskItem = {
          ...currentTask,
          rawTask: {
            ...currentTask.rawTask!,
            comments: [...currentComments, newCommentObj],
          },
        };
        setCurrentTask(updated);
        onTaskUpdated?.(updated);
        setNewCommentText("");
        toast.success("Comment added");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop (Framer Motion fade) */}
        <motion.div
          key="task-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/25 backdrop-blur-xs cursor-pointer"
        />

        {/* Slide-over Drawer Panel (Spring physics like Framer) */}
        <motion.aside
          key="task-drawer-panel"
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
          className="relative z-10 w-full max-w-2xl lg:max-w-3xl xl:max-w-[820px] h-full bg-surface border-l border-hairline shadow-2xl flex flex-col text-ink font-sans overflow-hidden"
        >
          {/* Top Header */}
          <div className="px-6 py-3.5 border-b border-hairline flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                style={{ backgroundColor: currentTask.project.color }}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-2xs shrink-0"
              >
                {currentTask.project.icon}
              </span>
              <span className="font-semibold text-xs text-ink truncate max-w-[140px] sm:max-w-[200px]">
                {currentTask.project.name}
              </span>
              <span className="font-mono text-[11px] text-ink-3 bg-subtle px-1.5 py-0.5 rounded border border-hairline shrink-0">
                RP-{currentTask.id.slice(0, 4).toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Active
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Task link copied");
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-hairline">
            {/* Title & Linear-style Property Cards */}
            <div className="px-6 py-5 space-y-4 bg-surface">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight leading-snug">
                  {currentTask.title}
                </h1>

                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1.5 shrink-0",
                    currentTask.priority === "urgent" || currentTask.priority === "high"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : currentTask.priority === "medium"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      currentTask.priority === "urgent" || currentTask.priority === "high"
                        ? "bg-rose-600"
                        : currentTask.priority === "medium"
                        ? "bg-amber-600"
                        : "bg-emerald-600"
                    )}
                  />
                  <span className="capitalize">{currentTask.priority}</span>
                </span>
              </div>

              {/* Clean Property Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Status */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Clock className="h-3 w-3" />
                    <span>Status</span>
                  </div>
                  <select
                    value={currentTask.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="text-xs font-semibold text-ink capitalize bg-transparent border-0 focus:ring-0 p-0 cursor-pointer w-full"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <AlertCircle className="h-3 w-3" />
                    <span>Priority</span>
                  </div>
                  <select
                    value={currentTask.priority}
                    onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                    className="text-xs font-semibold text-ink capitalize bg-transparent border-0 focus:ring-0 p-0 cursor-pointer w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Calendar className="h-3 w-3" />
                    <span>Due Date</span>
                  </div>
                  <p className="text-xs font-semibold text-ink truncate">
                    {currentTask.dueTimeText || "No due date"}
                  </p>
                </div>

                {/* Assignee */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <User className="h-3 w-3" />
                    <span>Assignee</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">
                      {currentTask.assignee.initial || currentTask.assignee.name[0] || "U"}
                    </div>
                    <span className="text-xs font-semibold text-ink truncate">
                      {currentTask.assignee.name}
                    </span>
                  </div>
                </div>

                {/* Project */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <FolderKanban className="h-3 w-3" />
                    <span>Project</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={{ backgroundColor: currentTask.project.color }}
                      className="flex h-3.5 w-3.5 items-center justify-center rounded text-[8px] font-bold text-white shrink-0"
                    >
                      {currentTask.project.icon}
                    </span>
                    <span className="text-xs font-semibold text-ink truncate">
                      {currentTask.project.name}
                    </span>
                  </div>
                </div>

                {/* Identifier */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    Identifier
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink font-mono">
                      RP-{currentTask.id.slice(0, 8).toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`RP-${currentTask.id.slice(0, 8).toUpperCase()}`);
                        toast.success("Identifier copied");
                      }}
                      className="text-ink-3 hover:text-ink text-[11px] cursor-pointer flex items-center gap-0.5"
                      title="Copy ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Framer-style Tab Navigation Bar */}
            <div className="px-6 border-b border-hairline flex items-center gap-6 text-xs font-medium h-11 shrink-0 bg-surface">
              {[
                { key: "overview", label: "Overview" },
                { key: "attachments", label: "Files & Attachments", count: currentTask.attachments?.length || 0 },
                { key: "activity", label: "Activity" },
              ].map((tab) => {
                const isActive = taskDetailTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTaskDetailTab(tab.key as "overview" | "attachments" | "activity")}
                    className={cn(
                      "h-full relative flex items-center gap-1.5 transition-colors cursor-pointer",
                      isActive ? "text-ink font-semibold" : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[10px] font-medium",
                          isActive ? "bg-ink text-white" : "bg-subtle text-ink-2"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="active-task-tab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Tab Content */}
            <div className="px-6 py-5 bg-surface min-h-[300px]">
              {/* TAB 1: OVERVIEW */}
              {taskDetailTab === "overview" && (
                <div className="space-y-6">
                  {/* Description */}
                  <div className="space-y-1.5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Description
                    </h2>
                    <div className="rounded-lg border border-hairline bg-subtle/30 p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap min-h-[80px]">
                      {cleanDescriptionSnippet(currentTask.description) ? (
                        cleanDescriptionSnippet(currentTask.description)
                      ) : currentTask.description ? (
                        currentTask.description
                      ) : (
                        <span className="text-ink-3/70 italic">No description provided.</span>
                      )}
                    </div>
                  </div>

                  {/* Attachments Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Attachments ({currentTask.attachments?.length || 0})
                      </h2>
                      <button
                        type="button"
                        onClick={() => setTaskDetailTab("attachments")}
                        className="text-xs font-medium text-ink hover:underline cursor-pointer"
                      >
                        View all →
                      </button>
                    </div>
                    {currentTask.attachments && currentTask.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentTask.attachments.map((file) => {
                          const isImage =
                            file.file_type?.startsWith("image/") ||
                            /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name);
                          return (
                            <a
                              key={file.id}
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface hover:bg-hover hover:border-ink/20 transition-all shadow-2xs group cursor-pointer"
                            >
                              {isImage ? (
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="w-10 h-10 rounded object-cover border border-hairline shrink-0 bg-subtle"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-subtle text-ink flex items-center justify-center font-mono text-[10px] uppercase font-bold shrink-0 border border-hairline">
                                  {file.file_name.split(".").pop() || "file"}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-ink truncate group-hover:text-ink">
                                  {file.file_name}
                                </p>
                                <p className="text-[10px] text-ink-3">
                                  {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "Attachment"}
                                </p>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-ink-3 group-hover:text-ink shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-dashed border-hairline text-center text-xs text-ink-3 bg-subtle/30">
                        No files attached.{" "}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-ink font-semibold hover:underline cursor-pointer"
                        >
                          Attach a file
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FILES & ATTACHMENTS */}
              {taskDetailTab === "attachments" && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-hairline rounded-xl p-5 text-center bg-subtle/30 hover:bg-subtle/70 hover:border-ink/30 transition-all cursor-pointer space-y-1.5 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-subtle text-ink mx-auto flex items-center justify-center font-medium text-sm group-hover:scale-105 transition-transform border border-hairline">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold text-ink">
                      {uploadingAttachment ? "Uploading file..." : "Click to upload attachment"}
                    </p>
                    <p className="text-[11px] text-ink-3">
                      Supports PNG, JPG, PDF, SVG, DOCX
                    </p>
                  </div>

                  {currentTask.attachments && currentTask.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentTask.attachments.map((file) => {
                        const isImage =
                          file.file_type?.startsWith("image/") ||
                          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name);
                        return (
                          <div
                            key={file.id}
                            className="group relative rounded-lg border border-hairline bg-surface p-2.5 flex flex-col justify-between hover:border-ink/20 hover:shadow-xs transition-all"
                          >
                            {isImage ? (
                              <div className="h-28 w-full rounded bg-subtle overflow-hidden mb-2 border border-hairline">
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-200"
                                />
                              </div>
                            ) : (
                              <div className="h-28 w-full rounded bg-subtle flex flex-col items-center justify-center gap-1.5 mb-2 border border-hairline">
                                <Paperclip className="h-6 w-6 text-ink-3" />
                                <span className="text-[10px] font-mono uppercase font-bold text-ink-2">
                                  {file.file_name.split(".").pop() || "FILE"}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-ink truncate" title={file.file_name}>
                                {file.file_name}
                              </p>
                              <p className="text-[10px] text-ink-3">
                                {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "File"}
                              </p>
                            </div>
                            <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between">
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-ink hover:underline cursor-pointer"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 3: ACTIVITY */}
              {taskDetailTab === "activity" && (
                <div className="space-y-4 max-w-xl">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Add Comment
                    </h3>
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Write an update on this task..."
                        className="w-full rounded-lg border border-hairline bg-surface p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!newCommentText.trim() || submittingComment}
                          onClick={handleAddComment}
                          className="rounded-md bg-ink text-surface px-3 py-1.5 text-xs font-medium hover:bg-ink/90 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          {submittingComment ? "Posting..." : "Post Comment"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2.5 pt-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Activity
                    </h3>
                    <div className="space-y-2 text-xs">
                      {/* Task Creation event */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-subtle/40 border border-hairline">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white shadow-2xs mt-0.5">
                          {(currentTask.creatorName || "T")[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-ink font-medium">
                              {currentTask.creatorName || "Workspace Member"}
                            </p>
                            <span className="text-[10px] text-ink-3 shrink-0" suppressHydrationWarning>
                              {formatDateDeterministic(currentTask.createdAt)}
                            </span>
                          </div>
                          <p className="text-ink-3 text-[11px] mt-0.5">
                            Created this task in project {currentTask.project.name}
                          </p>
                        </div>
                      </div>

                      {/* Comments */}
                      {currentTask.rawTask?.comments && currentTask.rawTask.comments.length > 0 ? (
                        currentTask.rawTask.comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface border border-hairline">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white shadow-2xs mt-0.5">
                              {c.author?.full_name ? c.author.full_name[0] : "M"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-ink font-medium">
                                  {c.author?.full_name || "Team Member"}
                                </p>
                                <span className="text-[10px] text-ink-3 shrink-0" suppressHydrationWarning>
                                  {formatDateDeterministic(c.created_at)}
                                </span>
                              </div>
                              <p className="text-ink text-xs mt-1 whitespace-pre-wrap">
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

          {/* Sticky Footer */}
          <div className="px-6 py-3 border-t border-hairline bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleComplete(currentTask)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer",
                  currentTask.completed
                    ? "bg-subtle text-ink border border-hairline hover:bg-hover"
                    : "bg-ink text-surface hover:bg-ink/90"
                )}
              >
                <Check className="h-3 w-3 stroke-[3]" />
                <span>{currentTask.completed ? "Mark Incomplete" : "Mark Complete"}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover shadow-2xs transition-colors cursor-pointer"
              >
                Attach File
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDeleteTask(currentTask)}
                className="rounded-md border border-rose-200 bg-surface px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-hairline bg-surface px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-hover shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
