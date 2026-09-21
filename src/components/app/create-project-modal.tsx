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
  X,
  ChevronDown,
  TrendingUp,
  Users,
  Maximize2,
  Minimize2,
  Sparkles,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { ProjectStatus, ProjectPriority, Project } from "@/types/project";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { createProjectAction } from "@/lib/project/actions";
import {
  StatusMenu,
  PriorityMenu,
  STATUS_LIST,
  PRIORITY_OPTIONS,
  ClickUpStatus,
  ClickUpPriority,
} from "./clickup-property-dropdowns";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { BrainQuickCreator } from "./ai/brain-quick-creator";
import { cn } from "@/lib/utils";

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  defaultDepartmentId?: string;
  departments?: Department[];
  people?: WorkspacePerson[];
  onSuccess?: () => void;
  onProjectCreated?: (project: Project) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  workspaceId,
  defaultDepartmentId,
  departments = [],
  people = [],
  onSuccess,
  onProjectCreated,
}: CreateProjectModalProps) {
  const router = useRouter();

  const [creationMode, setCreationMode] = React.useState<"manual" | "ai">("manual");

  // Form Fields
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(defaultDepartmentId || "");
  const [leadId, setLeadId] = React.useState("");
  const [status, setStatus] = React.useState<ClickUpStatus>("planning");
  const [priority, setPriority] = React.useState<ClickUpPriority>("normal");
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [budget, setBudget] = React.useState("");

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Status & Priority Popovers
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);

  const statusRef = React.useRef<HTMLDivElement>(null);
  const priorityRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setPriorityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Esc
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !statusOpen && !priorityOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, statusOpen, priorityOpen, onClose]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setDepartmentId(defaultDepartmentId || (departments[0]?.id ?? ""));
      setLeadId(people[0]?.user_id || "");
      setStatus("planning");
      setPriority("normal");
      setStartDate(new Date().toISOString().split("T")[0]);
      setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
      setClientName("");
      setBudget("");
      setErrorMsg(null);
    }
  }, [isOpen, defaultDepartmentId, departments, people]);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;

  const availableDepts = React.useMemo(() => {
    const list = [...departments];
    if (defaultDepartmentId && !list.some((d) => d.id === defaultDepartmentId)) {
      list.unshift({
        id: defaultDepartmentId,
        name: "Current Department",
        slug: "current-department",
        workspace_id: workspaceId,
        color: "#10251F",
        icon: "folder",
        created_at: "",
        updated_at: "",
      });
    }
    return list;
  }, [departments, defaultDepartmentId, workspaceId]);

  const activeDepartment = availableDepts.find((d) => d.id === departmentId);
  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

  // Options for CustomSelects
  const departmentOptions = React.useMemo(() => {
    return availableDepts.map((d) => ({
      value: d.id,
      label: d.name,
      dotColor: d.color || "#10251F",
      icon: <Building2 className="w-3.5 h-3.5" />,
    }));
  }, [availableDepts]);

  const leadOptions = React.useMemo(() => {
    return people.map((p) => {
      const nameStr = p.full_name || p.email || "Workspace Member";
      const initials = nameStr
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      return {
        value: p.user_id,
        label: nameStr,
        avatarUrl: p.avatar_url || null,
        initials,
        sublabel: p.job_title || p.email,
      };
    });
  }, [people]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    // Map ClickUpStatus to DB ProjectStatus
    let dbStatus: ProjectStatus = "planning";
    if (status === "in_progress" || status === "at_risk" || status === "update_required") dbStatus = "active";
    if (status === "on_hold") dbStatus = "on_hold";
    if (status === "complete") dbStatus = "completed";
    if (status === "cancelled") dbStatus = "cancelled";

    let dbPriority: ProjectPriority = "medium";
    if (priority === "urgent") dbPriority = "urgent";
    else if (priority === "high") dbPriority = "high";
    else if (priority === "normal") dbPriority = "medium";
    else if (priority === "low") dbPriority = "low";

    try {
      const res = await createProjectAction({
        workspaceId,
        departmentId: departmentId || undefined,
        name: trimmedName,
        description: description.trim() || undefined,
        status: dbStatus,
        priority: dbPriority,
        leadId: leadId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        color: activeDepartment?.color || "#10251F",
        icon: trimmedName ? trimmedName[0].toUpperCase() : "P",
        clientName: clientName.trim() || undefined,
        budget: budget.trim() || undefined,
      });

      if (!res.success || !res.project) {
        setErrorMsg(res.error || "Failed to create project.");
        setLoading(false);
        return;
      }

      if (onProjectCreated) {
        onProjectCreated(res.project);
      }

      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden bg-black/40 backdrop-blur-[3px]">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className={`relative z-10 flex flex-col bg-white border border-[#D8DDD4] shadow-2xl rounded-[20px] overflow-hidden text-[#18221E] font-sans antialiased transition-all ${
            isFullscreen
              ? "fixed inset-2 sm:inset-3 max-w-none h-[calc(100vh-1.5rem)]"
              : "w-[94vw] max-w-[780px] max-h-[90vh]"
          }`}
        >
          {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7EADF] bg-[#FAF9F5]/70 shrink-0 text-xs select-none">
            <div className="flex items-center gap-2 text-[#65706A]">
              <span className="flex items-center gap-1.5 font-semibold text-[#18221E] px-2 py-1 rounded-[7px] bg-white border border-[#D8DDD4]">
                <Folder className="w-3.5 h-3.5 text-[#10251F]" />
                <span>{activeDepartment ? activeDepartment.name : "Client Projects"}</span>
              </span>
              <span className="text-[#8A958F]">/</span>
              <span className="text-[#65706A] font-medium">New Project</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#65706A]">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-white rounded-[7px] border border-transparent hover:border-[#D8DDD4] text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-white rounded-[7px] border border-transparent hover:border-[#D8DDD4] text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Creation Mode Switcher: Manual vs ClickUp Brain */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-[#FAF9F5] border-b border-[#E7EADF] shrink-0 select-none">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F0EFEA] border border-[#E2E1DC]">
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  creationMode === "manual"
                    ? "bg-white text-[#18221E] shadow-xs"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <span>📁</span>
                <span>Create Manually</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("ai")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  creationMode === "ai"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs font-bold"
                    : "text-[#65706A] hover:text-emerald-700"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create with AI (Brain)</span>
              </button>
            </div>
            <span className="text-[11px] text-[#8A958F] hidden sm:inline">
              {creationMode === "ai" ? "ClickUp Brain AI • Type project goals, mention @lead, attach brief" : "Manual field customization"}
            </span>
          </div>

          {/* ── CONDITIONAL BODY ────────────────────────────────────────── */}
          {creationMode === "ai" ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <BrainQuickCreator
                type="project"
                workspaceId={workspaceId}
                people={people}
                defaultDepartmentId={departmentId}
                onSuccess={(createdItem) => {
                  onClose();
                  router.refresh();
                  if (onProjectCreated && createdItem.project) onProjectCreated(createdItem.project);
                  if (onSuccess) onSuccess();
                }}
                onCancel={onClose}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-7 space-y-6 flex-1">
              {/* Project Title Input (Linear / Notion borderless style) */}
              <div className="space-y-1">
                <input
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name..."
                  className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-[#18221E] placeholder:text-[#8A958F] bg-transparent border-0 focus:outline-none focus:ring-0 px-0 py-1 transition-all"
                />
                <p className="text-[11px] text-[#8A958F]">
                  Give your project a clear, descriptive title.
                </p>
              </div>

              {/* Project Description / Scope */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Description & Scope
                </label>
                <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-3 focus-within:border-[#10251F] focus-within:ring-1 focus-within:ring-[#10251F]/10 transition-all">
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Outline key deliverables, milestones, and objectives for this project..."
                    className="w-full text-xs text-[#18221E] placeholder:text-[#8A958F] bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* ── PROPERTIES GRID ────────────────────────────────────────── */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Project Properties
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-[14px] bg-[#FAF9F5] border border-[#D8DDD4]">
                  {/* 1. Department (CustomSelect) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Department</span>
                    </span>
                    <CustomSelect
                      value={departmentId}
                      onChange={setDepartmentId}
                      options={departmentOptions}
                      placeholder="Select department..."
                      fullWidth
                      buttonClassName="h-9 bg-white"
                    />
                  </div>

                  {/* 2. Project Lead (CustomSelect) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Project Lead</span>
                    </span>
                    <CustomSelect
                      value={leadId}
                      onChange={setLeadId}
                      options={leadOptions}
                      placeholder="Assign lead..."
                      fullWidth
                      searchable={leadOptions.length > 5}
                      buttonClassName="h-9 bg-white"
                    />
                  </div>

                  {/* 3. Status Menu */}
                  <div ref={statusRef} className="relative space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <CircleDot className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Status</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStatusOpen(!statusOpen)}
                      className="flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#10251F] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentStatusObj.icon}
                        <span>{currentStatusObj.label}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[#8A958F]" />
                    </button>

                    {statusOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-50">
                        <StatusMenu
                          currentStatus={status}
                          onSelect={(newSt) => {
                            setStatus(newSt);
                            setStatusOpen(false);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. Priority Menu */}
                  <div ref={priorityRef} className="relative space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Priority</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPriorityOpen(!priorityOpen)}
                      className="flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#10251F] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {currentPriorityObj.icon}
                        <span className={currentPriorityObj.color}>{currentPriorityObj.label}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[#8A958F]" />
                    </button>

                    {priorityOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-50">
                        <PriorityMenu
                          currentPriority={priority}
                          onSelect={(newPr) => {
                            setPriority(newPr);
                            setPriorityOpen(false);
                          }}
                          people={people}
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. Start Date (Custom DatePicker) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Start Date</span>
                    </span>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                      buttonClassName="h-9 bg-white"
                    />
                  </div>

                  {/* 6. Due Date (Custom DatePicker) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Due Date</span>
                    </span>
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="Select due date"
                      buttonClassName="h-9 bg-white"
                    />
                  </div>

                  {/* 7. Client Name (Optional) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Client Name (Optional)</span>
                    </span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="flex h-9 w-full items-center rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-medium text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-all"
                    />
                  </div>

                  {/* 8. Budget (Optional) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#65706A] flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#8A958F]" />
                      <span>Budget (Optional)</span>
                    </span>
                    <input
                      type="text"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. $25,000"
                      className="flex h-9 w-full items-center rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-medium text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER ACTIONS ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-7 py-4 border-t border-[#E7EADF] bg-[#FAF9F5]/70 shrink-0">
              <span className="text-[11px] text-[#8A958F]">
                Press <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#D8DDD4] text-[#65706A]">Esc</kbd> to dismiss
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-[10px] border border-[#D8DDD4] bg-white text-xs font-semibold text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[10px] bg-[#10251F] hover:bg-[#18342C] text-[#F4F3EE] text-xs font-semibold shadow-xs transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{loading ? "Creating..." : "Create Project"}</span>
                </button>
              </div>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
