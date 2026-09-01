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
} from "lucide-react";
import {
  TaskStatus,
  TaskPriority,
  DeliverableType,
  AttachmentInput,
} from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { createTaskAction } from "@/lib/task/actions";
import {
  StatusMenu,
  PriorityMenu,
  AssigneesMenu,
  STATUS_LIST,
  PRIORITY_OPTIONS,
  ClickUpStatus,
  ClickUpPriority,
} from "./clickup-property-dropdowns";

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
  defaultProjectId?: string;
  defaultDepartmentId?: string;
  defaultAssigneeId?: string;
  onSuccess?: () => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  workspaceId,
  people = [],
  projects = [],
  departments = [],
  defaultProjectId,
  defaultDepartmentId,
  defaultAssigneeId,
  onSuccess,
}: CreateTaskModalProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(defaultDepartmentId || "");
  const [projectId, setProjectId] = React.useState(defaultProjectId || "");
  const [assigneeId, setAssigneeId] = React.useState(defaultAssigneeId || "");
  const [status, setStatus] = React.useState<ClickUpStatus>("todo");
  const [priority, setPriority] = React.useState<ClickUpPriority>("urgent");
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

  // Tags
  const [tags, setTags] = React.useState<string[]>(["Design", "Homepage"]);
  const [isEditingTags, setIsEditingTags] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState("");

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

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Dropdown menu
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

  // Reset form when opened
  React.useEffect(() => {
    if (isOpen) {
      setTitle("Document Project Overview");
      setDescription(
        "Define the single source of truth for the engagement.\n\n" +
        "Document the product summary, business context, current phase, target users, primary journeys, project goals, key deliverables, success measures, assumptions, stakeholders, and open questions."
      );
      setDepartmentId(defaultDepartmentId || (departments[0]?.id ?? ""));
      setProjectId(defaultProjectId || (projects[0]?.id ?? ""));
      setAssigneeId(defaultAssigneeId || (people[0]?.user_id ?? ""));
      setStatus("todo");
      setPriority("urgent");
      setErrorMsg(null);
    }
  }, [isOpen, defaultDepartmentId, defaultProjectId, defaultAssigneeId, departments, projects, people]);

  const trimmedTitle = title.trim();
  const isValid = trimmedTitle.length >= 2;
  const activeDepartment = departments.find((d) => d.id === departmentId);
  const activeProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = people.find((p) => p.user_id === assigneeId);

  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

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
        user: selectedAssignee?.full_name || "Tashin Khan",
        role: selectedAssignee?.job_title || "Workspace Member",
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

  const handleSubmit = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    // Map ClickUpStatus to DB TaskStatus
    let dbStatus: TaskStatus = "todo";
    if (status === "in_progress" || status === "at_risk" || status === "update_required") dbStatus = "in_progress";
    if (status === "on_hold") dbStatus = "blocked";
    if (status === "complete") dbStatus = "completed";
    if (status === "cancelled") dbStatus = "completed";

    let dbPriority: TaskPriority = "urgent";
    if (priority === "urgent") dbPriority = "urgent";
    else if (priority === "high") dbPriority = "high";
    else if (priority === "normal") dbPriority = "medium";
    else if (priority === "low") dbPriority = "low";

    try {
      const res = await createTaskAction({
        workspaceId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        status: dbStatus,
        priority: dbPriority,
        departmentId: departmentId || undefined,
        projectId: projectId || undefined,
        assigneeIds: assigneeId ? [assigneeId] : [],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create task.");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const formatHoursMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const progressPercent = Math.min(100, Math.round((loggedMinutes / estimatedMinutes) * 100));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden bg-black/45 backdrop-blur-[3px]">
        {/* Large Modal Container */}
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
                {activeDepartment ? activeDepartment.name : "Client Projects"}
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="hover:text-[#0F172A] cursor-pointer font-normal">
                Tasks
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="font-semibold text-[#0F172A] truncate max-w-[280px]">
                {trimmedTitle || "New Task"}
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
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document Project Overview"
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
                          onSelect={(newSt) => {
                            setStatus(newSt);
                            setOpenDropdown(null);
                          }}
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
                          onSelect={(newPr) => {
                            setPriority(newPr);
                            setOpenDropdown(null);
                          }}
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
                          }}
                          people={people}
                        />
                      </div>
                    )}
                  </div>

                  {/* Due Date Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] text-[#475569] font-medium text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Sep 4, 2026</span>
                    <span className="text-[#94A3B8] text-[11px] bg-white px-1.5 py-0.2 rounded font-normal">
                      3 days left
                    </span>
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
                  onClick={handleSubmit}
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-[#10251F] hover:bg-[#18342C] text-[#F4F3EE] text-xs font-semibold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? "Creating..." : "Mark as done"}</span>
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
                    layoutId="taskModalActiveTab"
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
                    layoutId="taskModalActiveTab"
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
                    layoutId="taskModalActiveTab"
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
                    layoutId="taskModalActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F172A]"
                  />
                )}
              </button>
            </div>

            {/* ── 2-COLUMN GRID BODY ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* ── LEFT COLUMN (Description, Criteria, Comments) ───────── */}
              <div className="lg:col-span-8 space-y-8">
                {/* Description */}
                <div className="space-y-3">
                  <h2 className="text-[14px] font-bold text-[#0F172A]">Description</h2>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Define the single source of truth for the engagement..."
                    className="w-full text-[13.5px] leading-relaxed text-[#334155] placeholder:text-[#94A3B8] bg-transparent border-0 focus:outline-none resize-none"
                  />

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1 pt-1 text-[#64748B]">
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

                          {/* Figma Attachment Card */}
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
                          TK
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
                        <span>{activeDepartment ? activeDepartment.name : "Design"}</span>
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
                        <span>Jesmin Sikder</span>
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
