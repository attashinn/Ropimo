"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  ChevronRight,
  Calendar,
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  X,
  ExternalLink,
  Plus,
  Building2,
  Check,
  Star,
  Copy,
  Trash2,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  UserCheck,
  Mail,
  RotateCcw,
} from "lucide-react";
import { Candidate, CandidateStage, JobOpening } from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import {
  updateCandidateStageAction,
  updateCandidateRatingAction,
  updateCandidateTagsAction,
  bulkUpdateCandidatesStageAction,
  bulkRejectCandidatesAction,
  bulkTagCandidatesAction,
} from "@/lib/recruitment/actions";
import {
  HIRING_STAGES,
  STAGE_DEFINITIONS,
  HiringStage,
  isAllowedStageTransition,
} from "@/lib/hiring/stages";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import { CreateOfferModal } from "./create-offer-modal";
import { CandidateProfileDrawer } from "./candidate-profile-drawer";
import { RejectCandidateModal } from "./reject-candidate-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CandidatesViewProps {
  workspaceId: string;
  userRole: string;
  candidates: Candidate[];
  jobOpenings?: JobOpening[];
  departments: Department[];
  teamMembers: WorkspacePerson[];
  onNavigateToJobs?: () => void;
}

// ─── KANBAN COLUMN COMPONENT ──────────────────────────────────────────────────

function KanbanColumn({
  stage,
  label,
  candidates,
  onCandidateClick,
  onRatingChange,
}: {
  stage: string;
  label: string;
  candidates: Candidate[];
  onCandidateClick: (c: Candidate) => void;
  onRatingChange: (c: Candidate, r: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col flex-1 min-w-[280px] max-w-[340px] rounded-[14px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 transition-colors",
        isOver && "border-[#10251F] bg-[#F0EFEA]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1 border-b border-[#E7EADF]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#10251F]" />
          <h3 className="text-xs font-bold text-[#18221E]">{label}</h3>
        </div>
        <span className="rounded-full bg-white border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-bold text-[#65706A]">
          {candidates.length}
        </span>
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-2.5 pt-3 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[140px]">
        {candidates.length === 0 ? (
          <div className="h-24 flex items-center justify-center rounded-[10px] border border-dashed border-[#D8DDD4] text-[11px] text-[#8A958F] italic">
            Drop candidate here
          </div>
        ) : (
          candidates.map((c) => (
            <SortableCandidateCard
              key={c.id}
              candidate={c}
              onClick={() => onCandidateClick(c)}
              onRatingChange={(r) => onRatingChange(c, r)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── SORTABLE CANDIDATE CARD ──────────────────────────────────────────────────

function SortableCandidateCard({
  candidate,
  onClick,
  onRatingChange,
}: {
  candidate: Candidate;
  onClick: () => void;
  onRatingChange: (r: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: { candidate },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs hover:border-[#10251F] hover:shadow-xs transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 ring-2 ring-[#10251F]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-[#18221E] truncate group-hover:text-[#246244] transition-colors">
            {candidate.full_name}
          </h4>
          <p className="text-[11px] text-[#65706A] truncate mt-0.5">
            {candidate.latest_job_title || "General Application"}
          </p>
        </div>
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className="p-0.5 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  star <= (candidate.rating || 0)
                    ? "text-amber-500 fill-amber-500"
                    : "text-[#D8DDD4]"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A] pt-2 border-t border-[#F0EFEA]">
        <span className="truncate max-w-[130px]">{candidate.source || "Careers"}</span>
        <span>
          {new Date(candidate.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {candidate.tags && candidate.tags.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {candidate.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.5 text-[9px] font-semibold text-[#18221E]"
            >
              {t}
            </span>
          ))}
          {candidate.tags.length > 2 && (
            <span className="text-[9px] text-[#8A958F]">
              +{candidate.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN CANDIDATES VIEW ─────────────────────────────────────────────────────

export function CandidatesView({
  workspaceId,
  userRole,
  candidates: initialCandidates = [],
  jobOpenings = [],
  departments = [],
  teamMembers = [],
  onNavigateToJobs,
}: CandidatesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state initialization
  const urlJob = searchParams.get("job") || "all";
  const urlStage = searchParams.get("stage") || "all";
  const urlSource = searchParams.get("source") || "all";
  const urlRating = searchParams.get("rating") || "all";
  const urlSearch = searchParams.get("search") || "";
  const urlView = (searchParams.get("view") as "table" | "pipeline") || "pipeline";

  const [localCandidates, setLocalCandidates] = React.useState<Candidate[]>(initialCandidates);
  const [searchQuery, setSearchQuery] = React.useState(urlSearch);
  const [selectedStage, setSelectedStage] = React.useState(urlStage);
  const [selectedJobId, setSelectedJobId] = React.useState(urlJob);
  const [selectedSource, setSelectedSource] = React.useState(urlSource);
  const [selectedRating, setSelectedRating] = React.useState(urlRating);
  const [viewMode, setViewMode] = React.useState<"table" | "pipeline">(urlView);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 12;

  // Bulk actions selection
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<Set<string>>(new Set());
  const [bulkMoveStage, setBulkMoveStage] = React.useState<string>("screening");
  const [bulkTagInput, setBulkTagInput] = React.useState("");

  // Slide-over drawer and Modals
  const [drawerCandidate, setDrawerCandidate] = React.useState<Candidate | null>(null);
  const [scheduleModalCandidate, setScheduleModalCandidate] = React.useState<Candidate | null>(null);
  const [rejectModalCandidate, setRejectModalCandidate] = React.useState<Candidate | null>(null);
  const [offerModalCandidate, setOfferModalCandidate] = React.useState<Candidate | null>(null);

  // Drag and drop overlay
  const [activeDragCandidate, setActiveDragCandidate] = React.useState<Candidate | null>(null);

  // Sync state if initialCandidates changes
  React.useEffect(() => {
    setLocalCandidates(initialCandidates);
  }, [initialCandidates]);

  // Update URL helper
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "candidates");

      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Handlers for filters
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlParams({ search: val || null });
  };

  const handleStageChange = (val: string) => {
    setSelectedStage(val);
    setCurrentPage(1);
    updateUrlParams({ stage: val });
  };

  const handleJobChange = (val: string) => {
    setSelectedJobId(val);
    setCurrentPage(1);
    updateUrlParams({ job: val });
  };

  const handleSourceChange = (val: string) => {
    setSelectedSource(val);
    setCurrentPage(1);
    updateUrlParams({ source: val });
  };

  const handleRatingChange = (val: string) => {
    setSelectedRating(val);
    setCurrentPage(1);
    updateUrlParams({ rating: val });
  };

  const handleViewModeChange = (mode: "table" | "pipeline") => {
    setViewMode(mode);
    updateUrlParams({ view: mode === "pipeline" ? null : mode });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStage("all");
    setSelectedJobId("all");
    setSelectedSource("all");
    setSelectedRating("all");
    setCurrentPage(1);
    updateUrlParams({ search: null, stage: null, job: null, source: null, rating: null });
  };

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Filtered Candidates
  const filteredCandidates = React.useMemo(() => {
    return localCandidates.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.skills && c.skills.some((s) => s.toLowerCase().includes(q))) ||
        (c.latest_job_title && c.latest_job_title.toLowerCase().includes(q));

      const candStage = (c.latest_stage || "applied").toLowerCase();
      const matchesStage = selectedStage === "all" || candStage === selectedStage.toLowerCase();

      const matchesJob = selectedJobId === "all" || c.latest_job_id === selectedJobId;

      const matchesSource =
        selectedSource === "all" || (c.source || "").toLowerCase() === selectedSource.toLowerCase();

      const matchesRating =
        selectedRating === "all" || c.rating === Number(selectedRating);

      return matchesSearch && matchesStage && matchesJob && matchesSource && matchesRating;
    });
  }, [localCandidates, searchQuery, selectedStage, selectedJobId, selectedSource, selectedRating]);

  // Paginated candidates for table view
  const paginatedCandidates = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCandidates.length / pageSize);

  // Drag and Drop handlers (Optimistic with rollback)
  const handleDragStart = (event: DragStartEvent) => {
    const candidateId = event.active.id as string;
    const found = localCandidates.find((c) => c.id === candidateId);
    if (found) setActiveDragCandidate(found);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCandidate(null);

    if (!over) return;

    const candidateId = active.id as string;
    const targetStage = (over.id as string).toLowerCase();

    const candidate = localCandidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    const currentStage = (candidate.latest_stage || "applied").toLowerCase();
    if (currentStage === targetStage) return;

    // Check transition validity
    const transitionCheck = isAllowedStageTransition(currentStage as HiringStage, targetStage as HiringStage);
    if (!transitionCheck.allowed) {
      toast.error(transitionCheck.reason || "Stage transition not allowed.");
      return;
    }

    // 1. Optimistic Update
    const previousCandidates = [...localCandidates];
    setLocalCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, latest_stage: targetStage as any } : c))
    );

    // 2. Server Action
    try {
      const res = await updateCandidateStageAction({
        workspaceId,
        candidateId,
        toStage: targetStage,
      });

      if (!res.success) {
        // Rollback
        setLocalCandidates(previousCandidates);
        toast.error(res.error || "Failed to update stage. Rolled back.");
        return;
      }

      toast.success(
        `Moved ${candidate.full_name} to ${STAGE_DEFINITIONS[targetStage as HiringStage]?.label || targetStage}`
      );
      router.refresh();
    } catch {
      // Rollback on network/fatal error
      setLocalCandidates(previousCandidates);
      toast.error("Network error. Stage move rolled back.");
    }
  };

  // Card rating update
  const handleQuickRating = async (cand: Candidate, star: number) => {
    const prev = cand.rating;
    setLocalCandidates((list) =>
      list.map((c) => (c.id === cand.id ? { ...c, rating: star } : c))
    );

    const res = await updateCandidateRatingAction({
      workspaceId,
      candidateId: cand.id,
      rating: star,
    });

    if (!res.success) {
      setLocalCandidates((list) =>
        list.map((c) => (c.id === cand.id ? { ...c, rating: prev } : c))
      );
      toast.error(res.error || "Failed to save rating.");
    } else {
      toast.success(`Rated ${star}/5 stars`);
    }
  };

  // Bulk actions handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCandidateIds(new Set(paginatedCandidates.map((c) => c.id)));
    } else {
      setSelectedCandidateIds(new Set());
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMove = async () => {
    const ids = Array.from(selectedCandidateIds);
    if (ids.length === 0) return;

    const res = await bulkUpdateCandidatesStageAction({
      workspaceId,
      candidateIds: ids,
      toStage: bulkMoveStage,
    });

    if (res.success) {
      toast.success(`Moved ${ids.length} candidates to ${bulkMoveStage}.`);
      setSelectedCandidateIds(new Set());
      router.refresh();
    } else {
      toast.error(res.error || "Bulk move failed.");
    }
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedCandidateIds);
    if (ids.length === 0) return;

    if (!confirm(`Reject ${ids.length} selected candidates?`)) return;

    const res = await bulkRejectCandidatesAction({
      workspaceId,
      candidateIds: ids,
      reason: "Bulk rejected by hiring team",
    });

    if (res.success) {
      toast.success(`Rejected ${ids.length} candidates.`);
      setSelectedCandidateIds(new Set());
      router.refresh();
    } else {
      toast.error(res.error || "Bulk reject failed.");
    }
  };

  const handleBulkTag = async () => {
    const ids = Array.from(selectedCandidateIds);
    const tag = bulkTagInput.trim();
    if (ids.length === 0 || !tag) return;

    const res = await bulkTagCandidatesAction({
      workspaceId,
      candidateIds: ids,
      tags: [tag],
    });

    if (res.success) {
      toast.success(`Tagged ${ids.length} candidates with "${tag}".`);
      setBulkTagInput("");
      setSelectedCandidateIds(new Set());
      router.refresh();
    } else {
      toast.error(res.error || "Bulk tagging failed.");
    }
  };

  const handleCopyCareersLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/jobs`;
      navigator.clipboard.writeText(link);
      toast.success("Job portal link copied to clipboard!");
    }
  };

  // Distinct sources for filter dropdown
  const availableSources = React.useMemo(() => {
    const set = new Set<string>();
    localCandidates.forEach((c) => {
      if (c.source) set.add(c.source);
    });
    return Array.from(set);
  }, [localCandidates]);

  // Active filters count
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedStage !== "all" ||
    selectedJobId !== "all" ||
    selectedSource !== "all" ||
    selectedRating !== "all";

  return (
    <div className="space-y-4">
      {/* 1. TOP TOOLBAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search candidates by name, email, skills..."
            className="w-full h-9 rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-8 text-xs text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#65706A] hover:text-[#18221E]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filters & View Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Job Filter */}
          <RopimoSelect
            value={selectedJobId}
            onChange={handleJobChange}
            prefix="Job"
            options={[
              { value: "all", label: "All Jobs" },
              ...jobOpenings.map((j) => ({ value: j.id, label: j.title })),
            ]}
          />

          {/* Stage Filter */}
          <RopimoSelect
            value={selectedStage}
            onChange={handleStageChange}
            prefix="Stage"
            options={[
              { value: "all", label: "All Stages" },
              ...HIRING_STAGES.map((s) => ({
                value: s,
                label: STAGE_DEFINITIONS[s].label,
              })),
            ]}
          />

          {/* Rating Filter */}
          <RopimoSelect
            value={selectedRating}
            onChange={handleRatingChange}
            prefix="Rating"
            options={[
              { value: "all", label: "All Ratings" },
              { value: "5", label: "5 Stars" },
              { value: "4", label: "4 Stars" },
              { value: "3", label: "3 Stars" },
              { value: "2", label: "2 Stars" },
              { value: "1", label: "1 Star" },
            ]}
          />

          {/* Source Filter */}
          {availableSources.length > 0 && (
            <RopimoSelect
              value={selectedSource}
              onChange={handleSourceChange}
              prefix="Source"
              options={[
                { value: "all", label: "All Sources" },
                ...availableSources.map((s) => ({ value: s, label: s })),
              ]}
            />
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-9 inline-flex items-center gap-1 rounded-[10px] border border-[#D8DDD4] bg-white px-2.5 text-xs font-medium text-[#65706A] hover:text-[#D9383A] hover:bg-[#FAF9F5] transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}

          {/* View Mode Switcher (Pipeline vs List) */}
          <div className="flex items-center rounded-[10px] border border-[#D8DDD4] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("pipeline")}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "pipeline"
                  ? "bg-[#10251F] text-white shadow-2xs font-bold"
                  : "text-[#65706A] hover:text-[#18221E]"
              )}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "table"
                  ? "bg-[#10251F] text-white shadow-2xs font-bold"
                  : "text-[#65706A] hover:text-[#18221E]"
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* 2. BULK ACTIONS BAR (When items selected in list view) */}
      {selectedCandidateIds.size > 0 && (
        <div className="flex items-center justify-between rounded-[12px] border border-[#10251F] bg-[#10251F] p-3 text-white shadow-md text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold">{selectedCandidateIds.size} candidates selected</span>
            <button
              type="button"
              onClick={() => setSelectedCandidateIds(new Set())}
              className="text-stone-300 hover:text-white underline text-[11px]"
            >
              Deselect all
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Move stage dropdown */}
            <div className="flex items-center gap-1.5 bg-white/10 rounded-[8px] px-2 py-1">
              <span className="text-[11px] text-stone-300">Move to:</span>
              <select
                value={bulkMoveStage}
                onChange={(e) => setBulkMoveStage(e.target.value)}
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                {HIRING_STAGES.map((s) => (
                  <option key={s} value={s} className="text-[#18221E]">
                    {STAGE_DEFINITIONS[s].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkMove}
                className="rounded bg-white text-[#10251F] px-2 py-0.5 font-bold hover:bg-stone-100 transition-colors"
              >
                Apply
              </button>
            </div>

            {/* Tag */}
            <div className="flex items-center gap-1 bg-white/10 rounded-[8px] px-2 py-1">
              <input
                type="text"
                placeholder="Tag name..."
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBulkTag();
                  }
                }}
                className="bg-transparent text-xs text-white placeholder:text-stone-400 focus:outline-none w-24"
              />
              <button
                type="button"
                onClick={handleBulkTag}
                className="rounded bg-white text-[#10251F] px-2 py-0.5 font-bold hover:bg-stone-100 transition-colors"
              >
                Tag
              </button>
            </div>

            {/* Reject */}
            <button
              type="button"
              onClick={handleBulkReject}
              className="rounded-[8px] bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* 3. TWO EMPTY STATES SPECIFIED IN REQUIREMENTS */}
      {/* State 1: Nothing exists in database */}
      {localCandidates.length === 0 && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-12 text-center shadow-2xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4]">
            <UserCheck className="h-6 w-6 text-[#246244]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#18221E]">No candidates yet. Copy your job link</h3>
            <p className="text-xs text-[#65706A] max-w-md mx-auto mt-1">
              Publish job openings and share your public careers link to start receiving applicant resumes and candidate profiles.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyCareersLink}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#18342C] transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-[#C7F34A]" />
              <span>Copy Job Link</span>
            </button>
            {onNavigateToJobs && (
              <button
                type="button"
                onClick={onNavigateToJobs}
                className="rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
              >
                View Job Openings
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 2: Candidates exist, but filters hide everything */}
      {localCandidates.length > 0 && filteredCandidates.length === 0 && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-12 text-center shadow-2xs space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4]">
            <Search className="h-5 w-5 text-[#65706A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#18221E]">No candidates match these filters. Clear filters</h3>
            <p className="text-xs text-[#65706A] max-w-sm mx-auto mt-1">
              Try adjusting or resetting your search keywords, stage, job, source, or star rating filters.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#18342C] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        </div>
      )}

      {/* 4. PIPELINE KANBAN VIEW (with dnd-kit drag and drop, optimistic with rollback) */}
      {localCandidates.length > 0 && filteredCandidates.length > 0 && viewMode === "pipeline" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
            {HIRING_STAGES.filter((s) => s !== "withdrawn").map((stageKey) => {
              const stageCandidates = filteredCandidates.filter(
                (c) => (c.latest_stage || "applied").toLowerCase() === stageKey
              );
              return (
                <KanbanColumn
                  key={stageKey}
                  stage={stageKey}
                  label={STAGE_DEFINITIONS[stageKey].label}
                  candidates={stageCandidates}
                  onCandidateClick={(c) => setDrawerCandidate(c)}
                  onRatingChange={handleQuickRating}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeDragCandidate ? (
              <div className="w-[300px] rounded-[10px] border border-[#10251F] bg-white p-3.5 shadow-xl ring-2 ring-[#10251F] opacity-95">
                <h4 className="text-xs font-bold text-[#18221E]">
                  {activeDragCandidate.full_name}
                </h4>
                <p className="text-[11px] text-[#65706A] mt-0.5">
                  {activeDragCandidate.latest_job_title}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 5. LIST / TABLE VIEW WITH PAGINATION */}
      {localCandidates.length > 0 && filteredCandidates.length > 0 && viewMode === "table" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedCandidates.length > 0 &&
                        paginatedCandidates.every((c) => selectedCandidateIds.has(c.id))
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-[#D8DDD4] text-[#10251F] focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Role / Job</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EADF]">
                {paginatedCandidates.map((cand) => {
                  const isSelected = selectedCandidateIds.has(cand.id);
                  const candStage = (cand.latest_stage || "applied").toLowerCase() as HiringStage;
                  return (
                    <tr
                      key={cand.id}
                      onClick={() => setDrawerCandidate(cand)}
                      className={cn(
                        "hover:bg-[#FAF9F5] transition-colors cursor-pointer",
                        isSelected && "bg-[#FAF9F5]"
                      )}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCandidate(cand.id)}
                          className="rounded border-[#D8DDD4] text-[#10251F] focus:ring-0"
                        />
                      </td>

                      {/* Candidate Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-white shadow-2xs">
                            {cand.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#18221E] block truncate max-w-[180px]">
                              {cand.full_name}
                            </span>
                            <span className="text-[11px] text-[#8A958F] block truncate max-w-[180px]">
                              {cand.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#18221E]">
                          {cand.latest_job_title || "General Application"}
                        </span>
                      </td>

                      {/* Stage Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#18221E]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#10251F]" />
                          <span>{STAGE_DEFINITIONS[candStage]?.label || cand.latest_stage}</span>
                        </span>
                      </td>

                      {/* 1-5 Rating */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleQuickRating(cand, star)}
                              className="p-0.5 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={cn(
                                  "h-3.5 w-3.5",
                                  star <= (cand.rating || 0)
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-[#D8DDD4]"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-[#65706A]">
                        {cand.source || "Careers Portal"}
                      </td>

                      {/* Applied Date */}
                      <td className="py-3 px-4 text-[#65706A]">
                        {new Date(cand.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/app/people/candidates/${cand.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#246244] hover:underline"
                          >
                            <span>Profile</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setRejectModalCandidate(cand)}
                            className="text-[11px] font-semibold text-[#D9383A] hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E7EADF] bg-[#FAF9F5] text-xs">
              <span className="text-[#65706A]">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. SLIDE-OVER CANDIDATE PEEK PANEL (480px) */}
      <CandidateProfileDrawer
        isOpen={Boolean(drawerCandidate)}
        onClose={() => setDrawerCandidate(null)}
        candidate={drawerCandidate}
        workspaceId={workspaceId}
        userRole={userRole}
        departments={departments}
        teamMembers={teamMembers}
        onScheduleInterview={(c) => {
          setScheduleModalCandidate(c);
          setDrawerCandidate(null);
        }}
        onCreateOffer={(c) => {
          setOfferModalCandidate(c);
          setDrawerCandidate(null);
        }}
        onConvertToEmployee={() => {}}
        onStageUpdated={() => router.refresh()}
      />

      {/* 7. REJECT CANDIDATE MODAL */}
      {rejectModalCandidate && (
        <RejectCandidateModal
          isOpen={Boolean(rejectModalCandidate)}
          onClose={() => setRejectModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={rejectModalCandidate}
          onSuccess={() => {
            setRejectModalCandidate(null);
            router.refresh();
          }}
        />
      )}

      {/* 8. SCHEDULE INTERVIEW MODAL */}
      {scheduleModalCandidate && (
        <ScheduleInterviewModal
          isOpen={Boolean(scheduleModalCandidate)}
          onClose={() => setScheduleModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={scheduleModalCandidate}
          teamMembers={teamMembers}
          onSuccess={() => {
            setScheduleModalCandidate(null);
            router.refresh();
          }}
        />
      )}

      {/* 9. CREATE OFFER MODAL */}
      {offerModalCandidate && (
        <CreateOfferModal
          isOpen={Boolean(offerModalCandidate)}
          onClose={() => setOfferModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={offerModalCandidate}
          departments={departments}
          teamMembers={teamMembers}
          onSuccess={() => {
            setOfferModalCandidate(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
