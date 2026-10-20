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
  ListTodo,
  Users,
  Sparkles,
  UploadCloud,
  FileText,
  Trash2,
  History,
} from "lucide-react";
import { BrainQuickCreator } from "./ai/brain-quick-creator";
import { RichDescriptionEditor } from "@/components/app/rich-description-editor";
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
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { STRUCTURED_PROJECT_PHASES } from "@/lib/project/phases";

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
  defaultPhaseId?: string;
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
  defaultPhaseId,
  onSuccess,
}: CreateTaskModalProps) {
  const router = useRouter();

  const [creationMode, setCreationMode] = React.useState<"manual" | "ai">("manual");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(defaultDepartmentId || "");
  const [projectId, setProjectId] = React.useState(defaultProjectId || "");
  const [phaseId, setPhaseId] = React.useState(defaultPhaseId || "01");
  const [collaborativeDeptIds, setCollaborativeDeptIds] = React.useState<string[]>(
    defaultDepartmentId ? [defaultDepartmentId] : []
  );
  const [assigneeId, setAssigneeId] = React.useState(defaultAssigneeId || "");

  const [prevDefaultPhaseId, setPrevDefaultPhaseId] = React.useState(defaultPhaseId);
  if (defaultPhaseId !== prevDefaultPhaseId) {
    setPrevDefaultPhaseId(defaultPhaseId);
    if (defaultPhaseId) {
      setPhaseId(defaultPhaseId);
    }
  }

  const [prevDefaultDepartmentId, setPrevDefaultDepartmentId] = React.useState(defaultDepartmentId);
  if (defaultDepartmentId !== prevDefaultDepartmentId) {
    setPrevDefaultDepartmentId(defaultDepartmentId);
    if (defaultDepartmentId) {
      setDepartmentId(defaultDepartmentId);
      setCollaborativeDeptIds((prev) =>
        prev.includes(defaultDepartmentId) ? prev : [...prev, defaultDepartmentId]
      );
    }
  }

  const handlePrimaryDeptChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    if (newDeptId && !collaborativeDeptIds.includes(newDeptId)) {
      setCollaborativeDeptIds((prev) => [...prev, newDeptId]);
    }
  };
  const [status, setStatus] = React.useState<ClickUpStatus>("todo");
  const [priority, setPriority] = React.useState<ClickUpPriority>("urgent");
  const [activeTab, setActiveTab] = React.useState<"details" | "subtasks" | "attachments" | "activity">("details");
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  // Criteria State
  const [criteria, setCriteria] = React.useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newCriteriaInput, setNewCriteriaInput] = React.useState("");
  const [showAddCriteria, setShowAddCriteria] = React.useState(false);

  // Subtasks State
  const [subtasks, setSubtasks] = React.useState<
    { id: string; title: string; done: boolean }[]
  >([
    { id: "st-1", title: "Review requirements and architectural plan", done: false },
    { id: "st-2", title: "Implement core business logic & edge validations", done: false },
  ]);
  const [newSubtaskInput, setNewSubtaskInput] = React.useState("");

  // Attachments State
  const [attachments, setAttachments] = React.useState<
    { id: string; name: string; size: string; type: string }[]
  >([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Time Tracking
  const [loggedMinutes, setLoggedMinutes] = React.useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(0);
  const [isLoggingTime, setIsLoggingTime] = React.useState(false);
  const [logTimeInput, setLogTimeInput] = React.useState("");

  // Tags
  const [tags, setTags] = React.useState<string[]>([]);
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
  >([]);
  const [newComment, setNewComment] = React.useState("");
  // Due date State (defaults to 7 days from now)
  const [dueDate, setDueDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const [reviewerId, setReviewerId] = React.useState("");

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
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTitle("");
      setDescription("");
      const chosenProjId = defaultProjectId || (projects[0]?.id ?? "");
      const targetProj = projects.find((p) => p.id === chosenProjId);
      setProjectId(chosenProjId);
      setDepartmentId(
        defaultDepartmentId || targetProj?.department_id || (departments[0]?.id ?? "")
      );
      setAssigneeId(defaultAssigneeId || (people[0]?.user_id ?? ""));
      setStatus("todo");
      setPriority("normal");
      setErrorMsg(null);
    }
  }

  const trimmedTitle = title.trim();
  const isValid = trimmedTitle.length >= 2;
  const activeDepartment = departments.find((d) => d.id === departmentId);
  const activeProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = people.find((p) => p.user_id === assigneeId);

  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

  const currentOwner = people.find((p) => p.role === "owner") || people[0];
  const currentUserName = currentOwner?.full_name || "Tashin Khan";
  const createdOnText = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const daysLeft = React.useMemo(() => {
    if (!dueDate) return null;
    const target = new Date(dueDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "Due today";
    return `${diff}d left`;
  }, [dueDate]);

  const projectSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "No Project", icon: <Folder className="w-3.5 h-3.5" /> },
      ...projects.map((p) => ({
        value: p.id,
        label: p.name,
        dotColor: p.color || "#10251F",
      })),
    ];
  }, [projects]);

  const departmentSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "No Department", icon: <Building2 className="w-3.5 h-3.5" /> },
      ...departments.map((d) => ({
        value: d.id,
        label: d.name,
        dotColor: d.color || "#10251F",
      })),
    ];
  }, [departments]);

  const assigneeSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "Unassigned", icon: <User className="w-3.5 h-3.5" /> },
      ...people.map((p) => ({
        value: p.user_id,
        label: p.full_name || p.email,
        initials: (p.full_name || p.email).slice(0, 2).toUpperCase(),
      })),
    ];
  }, [people]);

  const phaseSelectOptions = React.useMemo(() => {
    return STRUCTURED_PROJECT_PHASES.map((p) => ({
      value: p.id,
      label: p.name,
      icon: <ListTodo className="w-3.5 h-3.5 text-[#738079]" />,
    }));
  }, []);

  const formattedDueDate = React.useMemo(() => {
    if (!dueDate) return "No due date";
    const [y, m, d] = dueDate.split("-");
    if (!y || !m || !d) return dueDate;
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [dueDate]);

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

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskInput.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `st-${Date.now()}`, title: newSubtaskInput.trim(), done: false },
    ]);
    setNewSubtaskInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => {
      const sizeKB = (f.size / 1024).toFixed(1);
      const sizeStr = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKB} KB`;
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: sizeStr,
        type: f.type || "file",
      };
    });
    setAttachments((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const activityItems = React.useMemo(() => {
    const items = [
      {
        id: "act-init",
        user: currentUserName,
        action: "created task draft",
        time: "Just now",
      },
    ];
    if (assigneeId && selectedAssignee) {
      items.push({
        id: "act-assign",
        user: currentUserName,
        action: `assigned to ${selectedAssignee.full_name}`,
        time: "Just now",
      });
    }
    if (status !== "todo") {
      items.push({
        id: "act-status",
        user: currentUserName,
        action: `set status to ${currentStatusObj.label}`,
        time: "Just now",
      });
    }
    comments.forEach((c) => {
      items.push({
        id: c.id,
        user: c.user,
        action: `commented: "${c.text.slice(0, 40)}${c.text.length > 40 ? "..." : ""}"`,
        time: c.time,
      });
    });
    return items;
  }, [currentUserName, assigneeId, selectedAssignee, status, currentStatusObj, comments]);

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

    const deptNames = collaborativeDeptIds
      .map((id) => departments.find((d) => d.id === id)?.name || id)
      .filter(Boolean)
      .join(", ");

    const selectedPhase = STRUCTURED_PROJECT_PHASES.find((p) => p.id === phaseId);

    try {
      const res = await createTaskAction({
        workspaceId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        status: dbStatus,
        priority: dbPriority,
        departmentId: departmentId || collaborativeDeptIds[0] || undefined,
        projectId: projectId || undefined,
        deliverableType: selectedPhase?.name || undefined,
        expectedOutcome: deptNames || undefined,
        assigneeIds: assigneeId ? [assigneeId] : [],
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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

  const progressPercent = estimatedMinutes > 0
    ? Math.min(100, Math.round((loggedMinutes / estimatedMinutes) * 100))
    : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 md:p-8 overflow-hidden bg-black/45 backdrop-blur-[3px]">
        {/* Large Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          ref={dropdownRef}
          className={`relative z-10 flex flex-col bg-white border-0 sm:border border-[#D8DDD4] shadow-2xl rounded-none sm:rounded-2xl overflow-hidden text-[#18221E] font-sans antialiased transition-all ${
            isFullscreen
              ? "fixed inset-0 sm:inset-3 max-w-none h-full sm:h-[calc(100vh-1.5rem)]"
              : "w-full sm:w-[94vw] max-w-none sm:max-w-[1220px] h-full sm:h-[90vh] max-h-none sm:max-h-[880px]"
          }`}
        >
          {/* ── TOP BREADCRUMB & HEADER BAR ──────────────────────────────── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#D8DDD4] bg-white shrink-0 text-xs select-none">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-semibold text-[#18221E] px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#D8DDD4] truncate max-w-[100px] sm:max-w-none">
                {activeDepartment ? activeDepartment.name : "Workspace"}
              </span>
              <span className="text-[#65706A]">/</span>
              <span className="text-[#65706A] hidden xs:inline">Tasks</span>
              <span className="text-[#65706A] hidden xs:inline">/</span>
              <span className="font-semibold text-[#18221E] truncate max-w-[130px] sm:max-w-[280px]">
                {trimmedTitle || "New Task"}
              </span>
            </div>

            {/* Right Controls: Fullscreen & Close */}
            <div className="flex items-center gap-1.5 text-[#65706A] shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hidden sm:inline-flex p-1.5 hover:bg-[#FAF9F5] rounded-lg text-[#65706A] hover:text-[#18221E] transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-[#FAF9F5] rounded-lg text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="px-4 sm:px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Creation Mode Switcher: Manual vs AI */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 bg-[#FAF9F5] border-b border-[#D8DDD4] shrink-0 select-none">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#EAECE6] border border-[#D8DDD4]">
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  creationMode === "manual"
                    ? "bg-white text-[#18221E] shadow-2xs font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <span>Manual Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("ai")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  creationMode === "ai"
                    ? "bg-[#18221E] text-white shadow-2xs font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Generator</span>
              </button>
            </div>
            <span className="text-[11px] text-[#65706A] hidden sm:inline">
              {creationMode === "ai"
                ? "Describe task in natural language • AI drafts description, criteria & properties"
                : "Configure task properties, deliverables, acceptance criteria & assignees"}
            </span>
          </div>

          {/* ── CONDITIONAL BODY ────────────────────────────────────────── */}
          {creationMode === "ai" ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              <BrainQuickCreator
                type="task"
                workspaceId={workspaceId}
                people={people}
                defaultDepartmentId={departmentId}
                defaultProjectId={projectId}
                onSuccess={() => {
                  onClose();
                  router.refresh();
                  if (onSuccess) onSuccess();
                }}
                onCancel={onClose}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-8">
            {/* ── TITLE & PRIMARY ACTIONS ROW ────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-6 mb-4 sm:mb-6">
              <div className="space-y-3 flex-1 min-w-0">
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-xl sm:text-2xl font-semibold text-[#18221E] placeholder:text-[#65706A]/40 bg-transparent border-0 focus:outline-none tracking-tight"
                />

                {/* Quick Badges Row */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Status Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#18221E] shadow-2xs transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentStatusObj.icon}
                        <span>{currentStatusObj.label}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-[#65706A]" />
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

                  {/* Priority Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#18221E] shadow-2xs transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentPriorityObj.icon}
                        <span className={currentPriorityObj.color}>{currentPriorityObj.label}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-[#65706A]" />
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

                  {/* Assignee Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#18221E] shadow-2xs transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#18221E] text-white flex items-center justify-center text-[8px] font-bold">
                        {selectedAssignee?.full_name ? selectedAssignee.full_name[0] : "TK"}
                      </div>
                      <span className="truncate max-w-[120px]">{selectedAssignee?.full_name || "Assignee"}</span>
                      <ChevronDown className="w-3 h-3 text-[#65706A]" />
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
                  <div className="relative">
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="Due date"
                      buttonClassName="h-7 px-2.5 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-[#18221E] shadow-2xs text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  className="p-2 rounded-lg border border-[#D8DDD4] bg-white hover:bg-[#FAF9F5] text-[#65706A] hover:text-[#18221E] transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`p-2 rounded-lg border border-[#D8DDD4] bg-white hover:bg-[#FAF9F5] transition-colors ${
                    isBookmarked ? "text-amber-500 bg-amber-50/50" : "text-[#65706A]"
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#18221E] hover:bg-[#25322C] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loading ? "Creating..." : "Create Task"}</span>
                </button>
              </div>
            </div>

            {/* ── HORIZONTAL TABS ────────────────────────────────────────── */}
            <div className="flex items-center gap-4 sm:gap-6 border-b border-[#D8DDD4] mb-4 sm:mb-6 text-xs overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`pb-2.5 font-medium transition-all relative cursor-pointer ${
                  activeTab === "details"
                    ? "text-[#18221E] font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                <span>Details</span>
                {activeTab === "details" && (
                  <motion.div
                    layoutId="taskModalActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#18221E]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("subtasks")}
                className={`pb-2.5 flex items-center gap-1.5 font-medium transition-all relative cursor-pointer ${
                  activeTab === "subtasks"
                    ? "text-[#18221E] font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                <span>Subtasks</span>
                {subtasks.length > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]">
                    {subtasks.length}
                  </span>
                )}
                {activeTab === "subtasks" && (
                  <motion.div
                    layoutId="taskModalActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#18221E]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={`pb-2.5 flex items-center gap-1.5 font-medium transition-all relative cursor-pointer ${
                  activeTab === "attachments"
                    ? "text-[#18221E] font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                <span>Attachments</span>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]">
                    {attachments.length}
                  </span>
                )}
                {activeTab === "attachments" && (
                  <motion.div
                    layoutId="taskModalActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#18221E]"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("activity")}
                className={`pb-2.5 font-medium transition-all relative cursor-pointer ${
                  activeTab === "activity"
                    ? "text-[#18221E] font-semibold"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                <span>Activity</span>
                {activeTab === "activity" && (
                  <motion.div
                    layoutId="taskModalActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#18221E]"
                  />
                )}
              </button>
            </div>

            {/* ── 2-COLUMN GRID BODY ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* ── LEFT COLUMN (Tab Views: Details, Subtasks, Attachments, Activity) ── */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. DETAILS TAB */}
                {activeTab === "details" && (
                  <motion.div
                    key="details-view"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Description */}
                    <div className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                        Description
                      </h2>
                      <RichDescriptionEditor
                        value={description}
                        onChange={(val) => setDescription(val)}
                        placeholder="Add detailed description, context, or guidelines..."
                      />
                    </div>

                    {/* Acceptance Criteria */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                          Acceptance criteria
                        </h2>
                        {criteria.length > 0 && (
                          <span className="text-[11px] text-[#65706A]">
                            {criteria.filter((c) => c.done).length} of {criteria.length} done
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {criteria.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs transition-colors group"
                          >
                            <div
                              onClick={() =>
                                setCriteria(
                                  criteria.map((item) =>
                                    item.id === c.id ? { ...item, done: !item.done } : item
                                  )
                                )
                              }
                              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none"
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center transition-all",
                                  c.done
                                    ? "bg-emerald-600 text-white"
                                    : "border border-[#D8DDD4] bg-white group-hover:border-[#18221E]/40"
                                )}
                              >
                                {c.done && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span
                                className={cn(
                                  "truncate",
                                  c.done ? "line-through text-[#65706A]" : "text-[#18221E] font-medium"
                                )}
                              >
                                {c.text}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCriteria(criteria.filter((item) => item.id !== c.id))}
                              className="opacity-0 group-hover:opacity-100 text-[#65706A] hover:text-rose-600 p-1 rounded transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {showAddCriteria ? (
                        <form onSubmit={handleAddCriteriaSubmit} className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            autoFocus
                            value={newCriteriaInput}
                            onChange={(e) => setNewCriteriaInput(e.target.value)}
                            placeholder="Add acceptance criteria..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#18221E] transition-colors"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-[#18221E] text-white text-xs font-semibold hover:bg-[#25322C] transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddCriteria(false)}
                            className="px-2.5 py-1.5 text-xs text-[#65706A] hover:text-[#18221E] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddCriteria(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add criteria</span>
                        </button>
                      )}
                    </div>

                    {/* Comments Thread */}
                    <div className="space-y-3 pt-3 border-t border-[#D8DDD4]">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                          Comments & Notes
                        </h2>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF9F5] text-[#65706A] border border-[#D8DDD4]">
                          {comments.length}
                        </span>
                      </div>

                      {/* Comment Input */}
                      <form
                        onSubmit={handleAddCommentSubmit}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] focus-within:bg-white focus-within:border-[#18221E] shadow-2xs transition-all"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#18221E] text-white flex items-center justify-center text-[9px] font-bold shrink-0 ml-1">
                          TK
                        </div>
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment or note..."
                          className="flex-1 text-xs bg-transparent text-[#18221E] placeholder:text-[#65706A] focus:outline-none"
                        />
                        <div className="flex items-center gap-1 text-[#65706A] mr-1">
                          <button type="button" className="p-1 hover:text-[#18221E]">
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" className="p-1 hover:text-[#18221E]">
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" className="p-1 hover:text-[#18221E]">
                            <AtSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="p-1.5 rounded-lg bg-[#18221E] text-white disabled:opacity-20 hover:bg-[#25322C] transition-colors ml-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* 2. SUBTASKS TAB */}
                {activeTab === "subtasks" && (
                  <motion.div
                    key="subtasks-view"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                          Subtasks Breakdown
                        </h2>
                        <p className="text-[11px] text-[#65706A] mt-0.5">
                          Break down this task into bite-sized actionable items.
                        </p>
                      </div>
                      {subtasks.length > 0 && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {subtasks.filter((s) => s.done).length} / {subtasks.length} completed
                        </span>
                      )}
                    </div>

                    {/* Subtasks Progress Bar */}
                    {subtasks.length > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-[#E7EADF] overflow-hidden">
                        <div
                          style={{
                            width: `${Math.round(
                              (subtasks.filter((s) => s.done).length / subtasks.length) * 100
                            )}%`,
                          }}
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        />
                      </div>
                    )}

                    {/* Subtasks List */}
                    <div className="space-y-2">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs transition-colors group"
                        >
                          <div
                            onClick={() =>
                              setSubtasks((prev) =>
                                prev.map((item) =>
                                  item.id === st.id ? { ...item, done: !item.done } : item
                                )
                              )
                            }
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none"
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center transition-all",
                                st.done
                                  ? "bg-emerald-600 text-white"
                                  : "border border-[#D8DDD4] bg-white group-hover:border-[#18221E]/40"
                              )}
                            >
                              {st.done && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span
                              className={cn(
                                "truncate",
                                st.done ? "line-through text-[#65706A]" : "text-[#18221E] font-medium"
                              )}
                            >
                              {st.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                            className="opacity-0 group-hover:opacity-100 text-[#65706A] hover:text-rose-600 p-1 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Subtask Form */}
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newSubtaskInput}
                        onChange={(e) => setNewSubtaskInput(e.target.value)}
                        placeholder="Add a new subtask (press Enter)..."
                        className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#18221E] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!newSubtaskInput.trim()}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#18221E] text-white text-xs font-semibold hover:bg-[#25322C] disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add subtask</span>
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* 3. ATTACHMENTS TAB */}
                {activeTab === "attachments" && (
                  <motion.div
                    key="attachments-view"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                        Attachments & Files
                      </h2>
                      <p className="text-[11px] text-[#65706A] mt-0.5">
                        Upload assets, specifications, design files, or spreadsheets.
                      </p>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                    />

                    {/* Drag and Drop Zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-[#D8DDD4] hover:border-[#18221E]/40 bg-[#FAF9F5] hover:bg-white rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-[#D8DDD4] group-hover:scale-105 flex items-center justify-center text-[#65706A] group-hover:text-[#18221E] transition-all shadow-2xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#18221E]">
                          Click to upload or drag & drop files
                        </p>
                        <p className="text-[11px] text-[#65706A] mt-0.5">
                          PNG, JPG, PDF, SVG, DOCX or ZIP up to 50MB
                        </p>
                      </div>
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-7 h-7 rounded-lg bg-white border border-[#D8DDD4] flex items-center justify-center text-[#18221E] shrink-0">
                                <FileText className="w-3.5 h-3.5 text-[#65706A]" />
                              </div>
                              <div className="truncate">
                                <p className="font-medium text-[#18221E] truncate">{att.name}</p>
                                <p className="text-[10px] text-[#65706A]">{att.size}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                              className="text-[#65706A] hover:text-rose-600 p-1.5 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] text-center text-xs text-[#65706A]">
                        No attachments uploaded for this task yet.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 4. ACTIVITY TAB */}
                {activeTab === "activity" && (
                  <motion.div
                    key="activity-view"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
                        Activity Timeline
                      </h2>
                      <p className="text-[11px] text-[#65706A] mt-0.5">
                        Audit trail and changes recorded for this task draft.
                      </p>
                    </div>

                    <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D8DDD4]">
                      {activityItems.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 relative pl-1">
                          <div className="w-5 h-5 rounded-full bg-[#18221E] text-white flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 z-10 shadow-2xs">
                            {act.user.slice(0, 1)}
                          </div>
                          <div className="flex-1 bg-[#FAF9F5] border border-[#D8DDD4] rounded-xl p-2.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#18221E]">{act.user}</span>
                              <span className="text-[10px] text-[#65706A]">{act.time}</span>
                            </div>
                            <p className="text-[#65706A] mt-0.5 text-xs">{act.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ── RIGHT COLUMN (Task Details, Time Tracking, Tags) ─────── */}
              <div className="lg:col-span-4 space-y-4">
                {/* Card 1: Task Details */}
                <div className="p-4 rounded-xl border border-[#D8DDD4] bg-white shadow-2xs space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]">
                    <h3 className="font-semibold text-[#18221E] text-xs">Task details</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Assignee */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#65706A] flex items-center gap-2 shrink-0">
                        <User className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Assignee</span>
                      </span>
                      <CustomSelect
                        value={assigneeId}
                        onChange={setAssigneeId}
                        options={assigneeSelectOptions}
                        placeholder="Unassigned"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px]"
                        align="right"
                      />
                    </div>

                    {/* Project */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#65706A] flex items-center gap-2 shrink-0">
                        <Folder className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Project</span>
                      </span>
                      <CustomSelect
                        value={projectId}
                        onChange={(newProjId) => {
                          setProjectId(newProjId);
                          const chosenProj = projects.find((p) => p.id === newProjId);
                          if (chosenProj?.department_id) {
                            handlePrimaryDeptChange(chosenProj.department_id);
                          }
                        }}
                        options={projectSelectOptions}
                        placeholder="No Project"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px]"
                        align="right"
                      />
                    </div>

                    {/* Workstream Phase */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#65706A] flex items-center gap-2 shrink-0">
                        <ListTodo className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Phase</span>
                      </span>
                      <CustomSelect
                        value={phaseId}
                        onChange={setPhaseId}
                        options={phaseSelectOptions}
                        placeholder="Select Phase"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px]"
                        align="right"
                      />
                    </div>

                    {/* Primary Department */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#65706A] flex items-center gap-2 shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Department</span>
                      </span>
                      <CustomSelect
                        value={departmentId}
                        onChange={handlePrimaryDeptChange}
                        options={departmentSelectOptions}
                        placeholder="No Department"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px]"
                        align="right"
                      />
                    </div>

                    {/* Collaborative Multi-Department Badges */}
                    {departments.length > 0 && (
                      <div className="pt-2 border-t border-[#D8DDD4] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#65706A] flex items-center gap-1.5 font-medium">
                            <Users className="w-3.5 h-3.5 text-[#65706A]" />
                            <span>Collaborative Teams</span>
                          </span>
                          <span className="text-[10px] text-[#65706A] font-medium">
                            {collaborativeDeptIds.length} assigned
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {departments.map((dept) => {
                            const isSelected = collaborativeDeptIds.includes(dept.id);
                            return (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (collaborativeDeptIds.length > 1) {
                                      setCollaborativeDeptIds((prev) =>
                                        prev.filter((id) => id !== dept.id)
                                      );
                                    }
                                  } else {
                                    setCollaborativeDeptIds((prev) => [...prev, dept.id]);
                                  }
                                }}
                                className={cn(
                                  "text-[10.5px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1",
                                  isSelected
                                    ? "bg-[#18221E] text-white border-[#18221E] font-medium"
                                    : "bg-[#FAF9F5] text-[#65706A] border-[#D8DDD4] hover:border-[#18221E]/30"
                                )}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dept.color || "#18221E" }}
                                />
                                <span>{dept.name}</span>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Priority (Clickable and workable) */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A] flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Priority</span>
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "priority-sidebar" ? null : "priority-sidebar")}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#18221E] transition-colors"
                        >
                          {currentPriorityObj.icon}
                          <span className={currentPriorityObj.color}>{currentPriorityObj.label}</span>
                          <ChevronDown className="w-3 h-3 text-[#65706A]" />
                        </button>
                        {openDropdown === "priority-sidebar" && (
                          <div className="absolute right-0 top-full mt-1 z-50">
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
                    </div>

                    {/* Status (Clickable and workable) */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A] flex items-center gap-2">
                        <CircleDot className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Status</span>
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "status-sidebar" ? null : "status-sidebar")}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-xs font-medium text-[#18221E] transition-colors"
                        >
                          {currentStatusObj.icon}
                          <span>{currentStatusObj.label}</span>
                          <ChevronDown className="w-3 h-3 text-[#65706A]" />
                        </button>
                        {openDropdown === "status-sidebar" && (
                          <div className="absolute right-0 top-full mt-1 z-50">
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
                    </div>

                    {/* Due date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#65706A] flex items-center gap-2 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Due date</span>
                      </span>
                      <DatePicker
                        value={dueDate}
                        onChange={setDueDate}
                        placeholder="No due date"
                        buttonClassName="h-7 px-2 py-0.5 max-w-[170px] border-[#D8DDD4] shadow-none rounded-lg"
                        align="right"
                      />
                    </div>

                    {/* Created by */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A] flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Created by</span>
                      </span>
                      <span className="font-medium text-[#18221E]">{currentUserName}</span>
                    </div>

                    {/* Created on */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Created on</span>
                      </span>
                      <span className="text-[#65706A] text-xs">{createdOnText}</span>
                    </div>

                    {/* Reviewer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A] flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Reviewer</span>
                      </span>
                      <select
                        value={reviewerId}
                        onChange={(e) => setReviewerId(e.target.value)}
                        className="text-xs font-medium text-[#18221E] bg-[#FAF9F5] border border-[#D8DDD4] hover:border-[#18221E]/30 focus:border-[#18221E] rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[150px] truncate"
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
                <div className="p-4 rounded-xl border border-[#D8DDD4] bg-white shadow-2xs space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#D8DDD4]">
                    <h3 className="font-semibold text-[#18221E] text-xs">Time tracking</h3>
                    <span className="text-[11px] font-medium text-emerald-700 tabular-nums">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#65706A] block text-[11px]">Logged</span>
                        <span className="font-semibold text-[#18221E] text-xs tabular-nums">
                          {formatHoursMins(loggedMinutes)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#65706A] block text-[11px]">Estimate</span>
                        <span className="font-semibold text-[#18221E] text-xs tabular-nums">
                          {formatHoursMins(estimatedMinutes)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-[#E7EADF] overflow-hidden">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      />
                    </div>

                    {/* Quick estimate buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-[#65706A]">Estimate:</span>
                      {[1, 2, 4, 8].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setEstimatedMinutes(hrs * 60)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer",
                            estimatedMinutes === hrs * 60
                              ? "bg-[#18221E] text-white border-[#18221E]"
                              : "bg-[#FAF9F5] text-[#65706A] border-[#D8DDD4] hover:text-[#18221E] hover:bg-white"
                          )}
                        >
                          {hrs}h
                        </button>
                      ))}
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
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:border-[#18221E]"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-[#18221E] text-white text-xs font-semibold hover:bg-[#25322C] transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLoggingTime(false)}
                          className="text-xs text-[#65706A] hover:text-[#18221E]"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsLoggingTime(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#D8DDD4] hover:bg-[#FAF9F5] text-xs font-medium text-[#18221E] transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#65706A]" />
                        <span>Log time</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 3: Tags */}
                <div className="p-4 rounded-xl border border-[#D8DDD4] bg-white shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#D8DDD4]">
                    <h3 className="font-semibold text-[#18221E] text-xs">Tags</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingTags(!isEditingTags)}
                      className="text-[11px] font-medium text-[#65706A] hover:text-[#18221E] transition-colors"
                    >
                      {isEditingTags ? "Done" : "+ Add"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tags.length === 0 && !isEditingTags && (
                      <span className="text-[11px] text-[#65706A] italic">No tags added</span>
                    )}
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#D8DDD4] text-[#18221E] font-medium text-[11px] flex items-center gap-1"
                      >
                        <span>{t}</span>
                        {isEditingTags && (
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((x) => x !== t))}
                            className="text-[#65706A] hover:text-rose-600"
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
                        className="w-16 px-1.5 py-0.5 text-xs border-b border-[#18221E] bg-transparent focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
