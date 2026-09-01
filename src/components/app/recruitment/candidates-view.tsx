"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Calendar,
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ArrowRight,
  X,
  ExternalLink,
  Plus,
  Building2,
  Check,
} from "lucide-react";
import { Candidate, CandidateStage, JobOpening } from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { updateApplicationStageAction } from "@/lib/recruitment/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import { CreateOfferModal } from "./create-offer-modal";
import { ConvertToEmployeeModal } from "./convert-to-employee-modal";
import { CandidateProfileDrawer } from "./candidate-profile-drawer";
import { ApplyJobModal } from "./apply-job-modal";
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

const STAGES: { stage: CandidateStage; label: string; dotColor: string; badgeColor: string }[] = [
  { stage: "Applied", label: "Applied", dotColor: "bg-sky-500", badgeColor: "bg-sky-50 text-sky-700 border-sky-200" },
  { stage: "Screening", label: "Screening", dotColor: "bg-indigo-500", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { stage: "Shortlisted", label: "Shortlisted", dotColor: "bg-purple-500", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { stage: "Interview", label: "Interview", dotColor: "bg-amber-500", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { stage: "Feedback", label: "Feedback", dotColor: "bg-teal-500", badgeColor: "bg-teal-50 text-teal-700 border-teal-200" },
  { stage: "Offer", label: "Offer", dotColor: "bg-emerald-500", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { stage: "Hired", label: "Hired", dotColor: "bg-[#246244]", badgeColor: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]" },
  { stage: "Rejected", label: "Rejected", dotColor: "bg-stone-400", badgeColor: "bg-stone-100 text-stone-600 border-stone-200" },
];

export function CandidatesView({
  workspaceId,
  userRole,
  candidates = [],
  jobOpenings = [],
  departments = [],
  teamMembers = [],
  onNavigateToJobs,
}: CandidatesViewProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStage, setSelectedStage] = React.useState<string>("all");
  const [selectedJobId, setSelectedJobId] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("recent");
  const [viewMode, setViewMode] = React.useState<"table" | "pipeline">("table");

  // Selected candidate for slide-over drawer
  const [drawerCandidate, setDrawerCandidate] = React.useState<Candidate | null>(null);

  // Modals state
  const [scheduleModalCandidate, setScheduleModalCandidate] = React.useState<Candidate | null>(null);
  const [offerModalCandidate, setOfferModalCandidate] = React.useState<Candidate | null>(null);
  const [convertModalCandidate, setConvertModalCandidate] = React.useState<Candidate | null>(null);
  const [addCandidateOpen, setAddCandidateOpen] = React.useState(false);
  const [actionMenuCandidateId, setActionMenuCandidateId] = React.useState<string | null>(null);

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  // Close action menus on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-candidate-menu]")) {
        setActionMenuCandidateId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredCandidates = React.useMemo(() => {
    let result = candidates.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.latest_job_title && c.latest_job_title.toLowerCase().includes(q)) ||
        c.skills.some((s) => s.toLowerCase().includes(q));

      const matchesStage = selectedStage === "all" || c.latest_stage === selectedStage;
      const matchesJob = selectedJobId === "all" || c.latest_job_id === selectedJobId;

      return matchesSearch && matchesStage && matchesJob;
    });

    if (sortBy === "name-asc") {
      result = [...result].sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === "exp-desc") {
      result = [...result].sort(
        (a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0)
      );
    } else if (sortBy === "recent") {
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [candidates, searchQuery, selectedStage, selectedJobId, sortBy]);

  const handleAdvanceStage = async (cand: Candidate, nextStage: CandidateStage) => {
    await updateApplicationStageAction({
      workspaceId,
      applicationId: cand.latest_application_id || cand.id,
      candidateId: cand.id,
      toStage: nextStage,
    });
    router.refresh();
  };

  const getStageConfig = (stage?: CandidateStage) => {
    const found = STAGES.find((s) => s.stage === stage);
    return (
      found || {
        stage: "Applied" as CandidateStage,
        label: "Applied",
        dotColor: "bg-sky-500",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      }
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 1. COMPACT TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, email, or skills..."
            className="w-full h-9 rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-8 text-xs text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#65706A] hover:text-[#18221E]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Job Filter */}
          {jobOpenings.length > 0 && (
            <RopimoSelect
              value={selectedJobId}
              onChange={(val) => setSelectedJobId(val)}
              options={[
                { value: "all", label: "All Job Openings" },
                ...jobOpenings.map((j) => ({ value: j.id, label: j.title })),
              ]}
            />
          )}

          {/* Stage Filter */}
          <RopimoSelect
            value={selectedStage}
            onChange={(val) => setSelectedStage(val)}
            options={[
              { value: "all", label: "All Stages" },
              ...STAGES.map((s) => ({ value: s.stage, label: s.label })),
            ]}
          />

          {/* Sort Selector */}
          <RopimoSelect
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            prefix="Sort"
            options={[
              { value: "recent", label: "Recently Applied" },
              { value: "name-asc", label: "Name (A-Z)" },
              { value: "exp-desc", label: "Experience (Highest)" },
            ]}
          />

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-[10px] border border-[#D8DDD4] bg-white p-0.5 shadow-2xs h-9">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs font-bold"
                  : "text-[#65706A] hover:text-[#18221E]"
              )}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pipeline")}
              className={cn(
                "rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
                viewMode === "pipeline"
                  ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs font-bold"
                  : "text-[#65706A] hover:text-[#18221E]"
              )}
            >
              Pipeline
            </button>
          </div>

          {/* Add Candidate Button */}
          {canManage && jobOpenings.length > 0 && (
            <button
              type="button"
              onClick={() => setAddCandidateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#10251F] text-[#F4F3EE] px-3 text-xs font-semibold hover:bg-[#18342C] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#C7F34A]" />
              <span>Add Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. VIEW MODE 1: LIST / TABLE (DEFAULT) */}
      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                  <th className="py-3 px-4 font-bold">CANDIDATE</th>
                  <th className="py-3 px-4 font-bold">APPLIED POSITION</th>
                  <th className="py-3 px-4 font-bold">STAGE</th>
                  <th className="py-3 px-4 font-bold">EXPERIENCE</th>
                  <th className="py-3 px-4 font-bold">APPLIED DATE</th>
                  <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EADF]">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#65706A]">
                      No candidates match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((cand) => {
                    const stageConfig = getStageConfig(cand.latest_stage);
                    const isHired = cand.latest_stage === "Hired";

                    return (
                      <tr
                        key={cand.id}
                        onClick={() => setDrawerCandidate(cand)}
                        className="group hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                      >
                        {/* Candidate Name & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <RopimoUserAvatar name={cand.full_name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-bold text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                                {cand.full_name}
                              </p>
                              <p className="text-[11px] text-[#65706A] truncate">
                                {cand.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Applied Position */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#18221E] truncate max-w-[180px]">
                            {cand.latest_job_title || "General Application"}
                          </p>
                          {cand.skills && cand.skills.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {cand.skills.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="rounded bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.2 text-[9px] font-medium text-[#65706A]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Stage */}
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                              stageConfig.badgeColor
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", stageConfig.dotColor)} />
                            {stageConfig.label}
                          </span>
                        </td>

                        {/* Experience */}
                        <td className="py-3 px-4 text-[#65706A] font-medium text-[11px]">
                          {cand.years_of_experience ? `${cand.years_of_experience} yrs exp` : "Not set"}
                        </td>

                        {/* Applied Date */}
                        <td className="py-3 px-4 text-[#65706A] font-medium text-[11px] whitespace-nowrap">
                          {formatDate(cand.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2" data-candidate-menu>
                            <button
                              type="button"
                              onClick={() => setDrawerCandidate(cand)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#246244] hover:underline"
                            >
                              <span>Profile</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>

                            {canManage && !isHired && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentIdx = STAGES.findIndex((s) => s.stage === cand.latest_stage);
                                  if (currentIdx >= 0 && currentIdx < STAGES.length - 2) {
                                    handleAdvanceStage(cand, STAGES[currentIdx + 1].stage);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-[6px] border border-[#D8DDD4] bg-white px-2 py-1 text-[10px] font-bold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                              >
                                <span>Advance</span>
                                <ArrowRight className="h-2.5 w-2.5 text-[#246244]" />
                              </button>
                            )}

                            {isHired && (
                              <span className="rounded-full bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-bold">
                                Hired
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 3. VIEW MODE 2: REFINED PIPELINE BOARD */
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {STAGES.filter((s) => !["Rejected"].includes(s.stage)).map(({ stage: stageName, label, dotColor }) => {
            const stageCandidates = filteredCandidates.filter(
              (c) => (c.latest_stage || "Applied") === stageName
            );

            return (
              <div
                key={stageName}
                className="w-72 min-w-[288px] shrink-0 rounded-[14px] border border-[#D8DDD4] bg-[#FAF9F5] flex flex-col shadow-2xs overflow-hidden"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[#D8DDD4] bg-white px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", dotColor)} />
                    <span className="font-bold text-xs text-[#18221E]">{label}</span>
                  </div>
                  <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-bold text-[#65706A]">
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="p-2.5 space-y-2.5 flex-1 min-h-[300px]">
                  {stageCandidates.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-[#8A958F]">
                      No candidates
                    </div>
                  ) : (
                    stageCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => setDrawerCandidate(cand)}
                        className="rounded-[10px] border border-[#D8DDD4] bg-white p-3 shadow-2xs hover:border-[#10251F] hover:shadow-xs transition-all cursor-pointer group space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                              {cand.full_name}
                            </p>
                            <p className="text-[11px] text-[#65706A] truncate">
                              {cand.latest_job_title || "General Application"}
                            </p>
                          </div>

                          <RopimoUserAvatar name={cand.full_name} size="sm" />
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#E7EADF] text-[10px] text-[#8A958F]">
                          <span>{cand.years_of_experience ? `${cand.years_of_experience} yrs exp` : "Entry"}</span>
                          <span className="font-semibold text-[#246244] group-hover:underline">
                            View details →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODALS & DRAWERS */}
      {drawerCandidate && (
        <CandidateProfileDrawer
          isOpen={true}
          candidate={drawerCandidate}
          workspaceId={workspaceId}
          userRole={userRole}
          departments={departments}
          teamMembers={teamMembers}
          onClose={() => setDrawerCandidate(null)}
          onScheduleInterview={() => {
            setScheduleModalCandidate(drawerCandidate);
          }}
          onCreateOffer={() => {
            setOfferModalCandidate(drawerCandidate);
          }}
          onConvertToEmployee={() => {
            setConvertModalCandidate(drawerCandidate);
          }}
        />
      )}

      {scheduleModalCandidate && (
        <ScheduleInterviewModal
          isOpen={true}
          onClose={() => setScheduleModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={scheduleModalCandidate}
          application={{
            id: scheduleModalCandidate.latest_application_id || scheduleModalCandidate.id,
            candidate_id: scheduleModalCandidate.id,
            job_opening_id: scheduleModalCandidate.latest_job_id || "",
            stage: scheduleModalCandidate.latest_stage || "Applied",
            workspace_id: workspaceId,
            source: "Direct",
            created_at: scheduleModalCandidate.created_at,
            updated_at: scheduleModalCandidate.created_at,
          }}
          teamMembers={teamMembers}
        />
      )}

      {offerModalCandidate && (
        <CreateOfferModal
          isOpen={true}
          onClose={() => setOfferModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={offerModalCandidate}
          application={{
            id: offerModalCandidate.latest_application_id || offerModalCandidate.id,
            candidate_id: offerModalCandidate.id,
            job_opening_id: offerModalCandidate.latest_job_id || "",
            stage: offerModalCandidate.latest_stage || "Offer",
            workspace_id: workspaceId,
            source: "Direct",
            created_at: offerModalCandidate.created_at,
            updated_at: offerModalCandidate.created_at,
          }}
          departments={departments}
        />
      )}

      {convertModalCandidate && (
        <ConvertToEmployeeModal
          isOpen={true}
          onClose={() => setConvertModalCandidate(null)}
          workspaceId={workspaceId}
          candidate={convertModalCandidate}
          departments={departments}
        />
      )}

      {addCandidateOpen && jobOpenings.length > 0 && (
        <ApplyJobModal
          isOpen={true}
          onClose={() => setAddCandidateOpen(false)}
          workspaceId={workspaceId}
          jobOpening={jobOpenings[0]}
        />
      )}
    </div>
  );
}
