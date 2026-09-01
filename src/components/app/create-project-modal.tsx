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
} from "lucide-react";
import { ProjectStatus, ProjectPriority, Project } from "@/types/project";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { createProjectAction } from "@/lib/project/actions";
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

  // Project Fields (NO Task Fields)
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
  const selectedLead = people.find((p) => p.user_id === leadId);

  const currentStatusObj = STATUS_LIST.find((s) => s.id === status) || STATUS_LIST[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[0];

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden bg-black/45 backdrop-blur-[3px]">
        {/* Real Project Creation Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          ref={dropdownRef}
          className={`relative z-10 flex flex-col bg-white border border-[#E2E8F0] shadow-2xl rounded-[18px] overflow-hidden text-[#111827] font-sans antialiased transition-all ${
            isFullscreen
              ? "fixed inset-2 sm:inset-3 max-w-none h-[calc(100vh-1.5rem)]"
              : "w-[94vw] max-w-[800px] max-h-[88vh]"
          }`}
        >
          {/* ── TOP BREADCRUMB BAR ───────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#F1F5F9] bg-white shrink-0 text-[13px] select-none">
            <div className="flex items-center gap-2 text-[#64748B]">
              <span className="flex items-center gap-1.5 text-[#0F172A] font-medium">
                <Folder className="w-4 h-4 text-[#D97706]" />
                <span>{activeDepartment ? activeDepartment.name : "Workspace"}</span>
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="text-[#64748B] font-semibold">
                Create Project
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#64748B]">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg text-[#94A3B8] hover:text-[#0F172A] transition-colors"
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
            <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── FORM CONTENT ─────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-7 space-y-6 flex-1">
              {/* Project Title Input */}
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wider">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website Redesign, Brand Strategy, Mobile App..."
                  className="w-full text-[20px] font-bold text-[#0F172A] placeholder:text-[#94A3B8] px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wider">
                  Project Brief & Objectives
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope, primary deliverables, and goals for this project..."
                  className="w-full text-xs text-[#334155] placeholder:text-[#94A3B8] p-3.5 rounded-xl border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none transition-all resize-none"
                />
              </div>

              {/* 2-Column Properties Table */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Department */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Department</span>
                  </span>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {availableDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Project Lead */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Project Lead</span>
                  </span>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {people.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Status */}
                <div className="relative">
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Status</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A]"
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

                {/* 4. Priority */}
                <div className="relative">
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Priority</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A]"
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

                {/* 5. Start Date */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Start Date</span>
                  </span>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="Select start date"
                  />
                </div>

                {/* 6. Due Date */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Due Date</span>
                  </span>
                  <DatePicker
                    value={dueDate}
                    onChange={(val) => setDueDate(val)}
                    placeholder="Select due date"
                  />
                </div>

                {/* 7. Client Name (Optional) */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Client Name (Optional)</span>
                  </span>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                {/* 8. Budget (Optional) */}
                <div>
                  <span className="text-[#64748B] block mb-1 font-medium flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>Budget (Optional)</span>
                  </span>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. $25,000"
                    className="w-full py-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>
            </div>

            {/* ── FOOTER ACTIONS ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-7 py-4 border-t border-[#F1F5F9] bg-[#FAFAFA] shrink-0">
              <span className="text-xs text-[#94A3B8]">
                Press <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] text-[#64748B]">Esc</kbd> to cancel
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#10251F] hover:bg-[#18342C] text-[#F4F3EE] text-xs font-semibold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  <span>{loading ? "Creating..." : "Create Project"}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
