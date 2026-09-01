"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  User,
  Building2,
  Folder,
  Flag,
  CheckCircle2,
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
  Edit2,
  FileText,
  MessageSquare,
  ListTodo,
  Layers,
  History,
  Trash2,
  Copy,
  ExternalLink,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
} from "lucide-react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  DeliverableType,
} from "@/types/task";
import { Workspace } from "@/types/workspace";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import {
  updateTaskAction,
  addTaskCommentAction,
  addTaskAttachmentAction,
  deleteTaskAction,
  duplicateTaskAction,
} from "@/lib/task/actions";

export interface TaskDetailViewProps {
  task: Task;
  workspace: Workspace;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  todo: {
    label: "To do",
    bg: "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]",
    text: "text-[#065F46]",
    dot: "bg-[#10B981]",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]",
    text: "text-[#1E40AF]",
    dot: "bg-[#3B82F6]",
  },
  in_review: {
    label: "In Review",
    bg: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
    text: "text-[#92400E]",
    dot: "bg-[#F59E0B]",
  },
  changes_requested: {
    label: "Changes Requested",
    bg: "bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]",
    text: "text-[#9A3412]",
    dot: "bg-[#F97316]",
  },
  blocked: {
    label: "Blocked",
    bg: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]",
    text: "text-[#991B1B]",
    dot: "bg-[#EF4444]",
  },
  completed: {
    label: "Done",
    bg: "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]",
    text: "text-[#166534]",
    dot: "bg-[#22C55E]",
  },
};

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; bg: string; text: string; dot: string; flagColor: string }
> = {
  urgent: {
    label: "Urgent",
    bg: "bg-[#FEF2F2] text-[#991B1B]",
    text: "text-[#991B1B]",
    dot: "bg-[#EF4444]",
    flagColor: "#EF4444",
  },
  high: {
    label: "High",
    bg: "bg-[#FFF7ED] text-[#9A3412]",
    text: "text-[#9A3412]",
    dot: "bg-[#F97316]",
    flagColor: "#F97316",
  },
  medium: {
    label: "Medium",
    bg: "bg-[#FEF3C7] text-[#92400E]",
    text: "text-[#92400E]",
    dot: "bg-[#F59E0B]",
    flagColor: "#F59E0B",
  },
  low: {
    label: "Low",
    bg: "bg-[#F3F4F6] text-[#4B5563]",
    text: "text-[#4B5563]",
    dot: "bg-[#9CA3AF]",
    flagColor: "#9CA3AF",
  },
};

export function TaskDetailView({
  task,
  workspace,
  people,
  projects,
  departments,
}: TaskDetailViewProps) {
  const router = useRouter();

  // Task States
  const [status, setStatus] = React.useState<TaskStatus>(task.status);
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority);
  const [activeTab, setActiveTab] = React.useState<"details" | "subtasks" | "attachments" | "activity">("details");
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // Criteria State
  const [criteria, setCriteria] = React.useState<{ id: string; text: string; done: boolean }[]>([
    { id: "c1", text: "New hero section with headline and subtext", done: true },
    { id: "c2", text: "Highlight 3 core features with icons", done: false },
    { id: "c3", text: "Improve mobile responsiveness", done: false },
    { id: "c4", text: "Review and optimize performance", done: false },
  ]);
  const [newCriteriaInput, setNewCriteriaInput] = React.useState("");
  const [showAddCriteria, setShowAddCriteria] = React.useState(false);

  // Time Tracking
  const [loggedMinutes, setLoggedMinutes] = React.useState(204); // 03h 24m
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(480); // 08h 00m
  const [isLoggingTime, setIsLoggingTime] = React.useState(false);
  const [logTimeInput, setLogTimeInput] = React.useState("");

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
  >([
    {
      id: "cm-1",
      user: "Jesmin Sikder",
      role: "HR Manager",
      avatarBg: "bg-[#1E1B4B]",
      text: "Please share the Figma file when you're done with the new hero section.",
      time: "2 hours ago",
    },
    {
      id: "cm-2",
      user: "Morgan Sterling",
      role: "Product Designer",
      avatarBg: "bg-[#1E1B4B]",
      text: "Here's the updated hero section for review.",
      time: "1 hour ago",
      attachment: {
        name: "Homepage_Hero_v2.fig",
        type: "Figma file",
        size: "2.4 MB",
      },
    },
  ]);
  const [newComment, setNewComment] = React.useState("");

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

  const department = departments.find((d) => d.id === task.department_id);
  const project = projects.find((p) => p.id === task.project_id);
  const assignee = people.find((p) => task.assignees.some((a) => a.user_id === p.user_id));
  const reviewer = people.find((p) => p.user_id === task.approver_id) || people[1] || people[0];

  const handleStatusUpdate = async (newStatus: TaskStatus) => {
    setStatus(newStatus);
    setOpenDropdown(null);
    await updateTaskAction({
      taskId: task.id,
      workspaceId: workspace.id,
      status: newStatus,
    });
    router.refresh();
  };

  const handlePriorityUpdate = async (newPriority: TaskPriority) => {
    setPriority(newPriority);
    setOpenDropdown(null);
    await updateTaskAction({
      taskId: task.id,
      workspaceId: workspace.id,
      priority: newPriority,
    });
    router.refresh();
  };

  const toggleDone = async () => {
    const nextStatus: TaskStatus = status === "completed" ? "todo" : "completed";
    await handleStatusUpdate(nextStatus);
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

    const added = {
      id: `cm-${Date.now()}`,
      user: assignee?.full_name || "Tashin Khan",
      role: assignee?.job_title || "Workspace Member",
      avatarBg: "bg-[#0F172A]",
      text: newComment.trim(),
      time: "Just now",
    };

    setComments([...comments, added]);
    setNewComment("");

    try {
      await addTaskCommentAction(task.id, workspace.id, newComment.trim());
    } catch {
      // Handled locally
    }
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

  const formatHoursMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const progressPercent = Math.min(100, Math.round((loggedMinutes / estimatedMinutes) * 100));

  return (
    <div ref={dropdownRef} className="min-h-screen bg-[#FFFFFF] text-[#111827] font-sans antialiased pb-16">
      {/* ── TOP BREADCRUMB & SEARCH BAR ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-3.5 border-b border-[#F1F5F9] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
          <Link
            href={`/app/departments/${department?.id || ""}`}
            className="hover:text-[#0F172A] transition-colors font-normal"
          >
            {department ? department.name : "Development"}
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <Link
            href="/app/my-tasks"
            className="hover:text-[#0F172A] transition-colors font-normal"
          >
            Tasks
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="font-semibold text-[#0F172A] truncate max-w-[280px]">
            {task.title || "Redesign homepage"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search anything... ⌘K"
              className="w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all"
            />
          </div>

          <button
            type="button"
            className="relative p-2 rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-bold">
            TK
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────── */}
      <div className="max-w-[1360px] mx-auto px-8 pt-8">
        {/* ── HEADER: TITLE & PRIMARY ACTIONS ────────────────────────────── */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="space-y-3">
            <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
              {task.title || "Redesign homepage"}
            </h1>

            {/* Quick Metadata Row */}
            <div className="flex items-center gap-2.5 flex-wrap text-[12.5px]">
              {/* Status Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all ${
                    STATUS_CONFIG[status]?.bg
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status]?.dot}`} />
                  <span>{STATUS_CONFIG[status]?.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {openDropdown === "status" && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl z-30">
                    {(["todo", "in_progress", "in_review", "completed"] as TaskStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusUpdate(st)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] text-left text-xs font-medium text-[#334155]"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[st]?.dot}`} />
                          <span>{STATUS_CONFIG[st]?.label}</span>
                        </span>
                        {status === st && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all ${
                    PRIORITY_CONFIG[priority]?.bg
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[priority]?.dot}`} />
                  <span>{PRIORITY_CONFIG[priority]?.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {openDropdown === "priority" && (
                  <div className="absolute left-0 top-full mt-1.5 w-36 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl z-30">
                    {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => handlePriorityUpdate(pr)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] text-left text-xs font-medium text-[#334155]"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[pr]?.dot}`} />
                          <span>{PRIORITY_CONFIG[pr]?.label}</span>
                        </span>
                        {priority === pr && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] text-[#475569] font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Sep 4, 2026</span>
                <span className="text-[#94A3B8] text-[11px] bg-white px-1.5 py-0.2 rounded font-normal">
                  3 days left
                </span>
              </div>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors ${
                isBookmarked ? "text-amber-500 bg-amber-50/50" : "text-[#64748B]"
              }`}
              title="Bookmark task"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
            </button>

            <button
              type="button"
              onClick={toggleDone}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                status === "completed"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-[#10251F] hover:bg-[#18342C] text-[#F4F3EE]"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{status === "completed" ? "Completed" : "Mark as done"}</span>
            </button>
          </div>
        </div>

        {/* ── HORIZONTAL TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-8 border-b border-[#F1F5F9] mb-8 text-[13.5px]">
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
                layoutId="activeTabIndicator"
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
            <span>Subtasks</span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569]">
              4
            </span>
            {activeTab === "subtasks" && (
              <motion.div
                layoutId="activeTabIndicator"
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
                layoutId="activeTabIndicator"
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
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
              />
            )}
          </button>
        </div>

        {/* ── 2-COLUMN MAIN BODY ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ── LEFT COLUMN (Description, Criteria, Comments) ───────────── */}
          <div className="lg:col-span-8 space-y-9">
            {/* Description Section */}
            <div className="space-y-3">
              <h2 className="text-[14px] font-bold text-[#0F172A]">Description</h2>
              <p className="text-[13.5px] leading-relaxed text-[#334155]">
                {task.description ||
                  "We need to redesign the homepage to improve clarity, highlight key features, and improve conversion.\nFocus on a clean hero section, clear value proposition, and better mobile responsiveness."}
              </p>

              {/* Rich Text Editor Toolbar */}
              <div className="flex items-center gap-1 pt-2 text-[#64748B]">
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3.5 bg-[#E2E8F0] mx-1" />
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3.5 bg-[#E2E8F0] mx-1" />
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1.5 hover:bg-[#F1F5F9] rounded hover:text-[#0F172A]">
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Acceptance Criteria Section */}
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
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#10B981] hover:text-[#059669] pt-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add criteria</span>
                </button>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-4 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-[#0F172A]">Comments</h2>
                <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569]">
                  {comments.length}
                </span>
              </div>

              {/* Comment Input Box */}
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

              {/* Comments Thread List */}
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

                      {/* Figma / Attachment Card */}
                      {cm.attachment && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] max-w-sm mt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shadow-2xs">
                              {/* Figma logo icon */}
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
                            title="Download file"
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

          {/* ── RIGHT COLUMN (Task details, Time tracking, Tags) ────────── */}
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
                    <div className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[9px] font-bold">
                      TK
                    </div>
                    <span>{assignee?.full_name || "Tashin Khan"}</span>
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
                    <span>{department ? department.name : "Design"}</span>
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
                    <span>{project ? project.name : "Development"}</span>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Flag className="w-4 h-4 text-[#94A3B8]" />
                    <span>Priority</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-medium text-[12px] ${PRIORITY_CONFIG[priority]?.bg}`}>
                    {PRIORITY_CONFIG[priority]?.label}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-[#94A3B8]" />
                    <span>Status</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-medium text-[12px] inline-flex items-center gap-1 ${STATUS_CONFIG[status]?.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status]?.dot}`} />
                    <span>{STATUS_CONFIG[status]?.label}</span>
                  </span>
                </div>

                {/* Due date */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#94A3B8]" />
                    <span>Due date</span>
                  </span>
                  <span className="font-medium text-[#0F172A]">Sep 4, 2026</span>
                </div>

                {/* Created by */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#94A3B8]" />
                    <span>Created by</span>
                  </span>
                  <span className="font-medium text-[#0F172A]">Morgan Sterling</span>
                </div>

                {/* Created on */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#94A3B8]" />
                    <span>Created on</span>
                  </span>
                  <span className="text-[#475569] text-xs">Aug 18, 2026 11:12 AM</span>
                </div>

                {/* Reviewer */}
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#94A3B8]" />
                    <span>Reviewer</span>
                  </span>
                  <div className="flex items-center gap-2 font-medium text-[#0F172A]">
                    <div className="w-5 h-5 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-[9px] font-bold">
                      JS
                    </div>
                    <span>{reviewer?.full_name || "Jesmin Sikder"}</span>
                  </div>
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
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors"
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
                  className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2.5 py-1 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#065F46] font-medium text-xs">
                  Design
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#065F46] font-medium text-xs">
                  Homepage
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
