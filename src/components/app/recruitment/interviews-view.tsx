"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Interview, Candidate } from "@/types/recruitment";
import { WorkspacePerson } from "@/types/people";
import { SubmitFeedbackModal } from "./submit-feedback-modal";
import { RescheduleInterviewModal } from "./reschedule-interview-modal";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { cancelInterviewAction } from "@/lib/recruitment/actions";
import {
  Search,
  Plus,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface InterviewsViewProps {
  workspaceId: string;
  userRole: string;
  interviews: Interview[];
  candidates?: Candidate[];
  teamMembers?: WorkspacePerson[];
}

export function InterviewsView({
  workspaceId,
  userRole,
  interviews = [],
  candidates = [],
  teamMembers = [],
}: InterviewsViewProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "upcoming" | "today" | "completed" | "needs_feedback" | "cancelled" | "no-show"
  >("all");
  const [selectedInterviewerId, setSelectedInterviewerId] = React.useState<string>("all");

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [feedbackInterview, setFeedbackInterview] = React.useState<Interview | null>(null);
  const [rescheduleInterview, setRescheduleInterview] = React.useState<Interview | null>(null);

  // Top summary metrics calculation
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const stats = React.useMemo(() => {
    let upcoming = 0;
    let today = 0;
    let completed = 0;
    let needsFeedback = 0;

    interviews.forEach((iv) => {
      const time = new Date(iv.scheduled_at).getTime();
      const status = (iv.status || "scheduled").toLowerCase();

      if (status === "completed") {
        completed++;
      } else if (status === "scheduled") {
        if (time < now.getTime()) {
          needsFeedback++;
        } else {
          upcoming++;
          if (time >= todayStart && time < todayEnd) {
            today++;
          }
        }
      }
    });

    return { upcoming, today, completed, needsFeedback };
  }, [interviews, todayStart, todayEnd, now]);

  // Cancel interview handler
  const handleCancelInterview = async (interviewId: string) => {
    const reason = prompt("Reason for cancelling this interview (will be emailed with updated .ics):", "Schedule conflict");
    if (reason === null) return;

    const res = await cancelInterviewAction({
      workspaceId,
      interviewId,
      reason: reason || "Cancelled by hiring team",
    });

    if (res.success) {
      toast.success("Interview cancelled. Cancellation notice & updated .ics calendar dispatched.");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to cancel interview.");
    }
  };

  // Filtered interviews list
  const filteredInterviews = React.useMemo(() => {
    return interviews.filter((iv) => {
      const q = searchQuery.toLowerCase().trim();
      const candidateName = (iv.candidate?.full_name || "").toLowerCase();
      const jobTitle = (iv.job_opening?.title || "").toLowerCase();
      const roundName = (iv.round_name || "").toLowerCase();
      const interviewerName = (
        iv.interviewer_names?.join(" ") ||
        iv.interviewer_name ||
        ""
      ).toLowerCase();

      const matchesSearch =
        !q ||
        candidateName.includes(q) ||
        jobTitle.includes(q) ||
        roundName.includes(q) ||
        interviewerName.includes(q);

      const time = new Date(iv.scheduled_at).getTime();
      const status = (iv.status || "scheduled").toLowerCase();

      let matchesFilter = true;
      if (selectedFilter === "upcoming") {
        matchesFilter = status === "scheduled" && time >= now.getTime();
      } else if (selectedFilter === "today") {
        matchesFilter = status === "scheduled" && time >= todayStart && time < todayEnd;
      } else if (selectedFilter === "completed") {
        matchesFilter = status === "completed";
      } else if (selectedFilter === "needs_feedback") {
        matchesFilter = status === "scheduled" && time < now.getTime();
      } else if (selectedFilter === "cancelled") {
        matchesFilter = status === "cancelled";
      } else if (selectedFilter === "no-show") {
        matchesFilter = status === "no-show";
      }

      const matchesInterviewer =
        selectedInterviewerId === "all" ||
        iv.interviewer_id === selectedInterviewerId ||
        (iv.interviewer_ids && iv.interviewer_ids.includes(selectedInterviewerId));

      return matchesSearch && matchesFilter && matchesInterviewer;
    });
  }, [
    interviews,
    searchQuery,
    selectedFilter,
    selectedInterviewerId,
    now,
    todayStart,
    todayEnd,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY: PLAIN NUMBERS, NO ICON TILES, NO UPPERCASE LABELS, CLICKABLE AS FILTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "upcoming", label: "Upcoming", count: stats.upcoming },
          { key: "today", label: "Today", count: stats.today },
          { key: "completed", label: "Completed", count: stats.completed },
          { key: "needs_feedback", label: "Needs feedback", count: stats.needsFeedback },
        ].map((item) => {
          const isSelected = selectedFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setSelectedFilter(isSelected ? "all" : (item.key as any))
              }
              className={cn(
                "rounded-[12px] border p-4 text-left transition-all cursor-pointer shadow-2xs",
                isSelected
                  ? "border-[#10251F] bg-[#FAF9F5] ring-1 ring-[#10251F]"
                  : "border-[#D8DDD4] bg-white hover:border-[#10251F]/40"
              )}
            >
              <div className="text-2xl font-bold tracking-tight text-[#18221E]">
                {item.count}
              </div>
              <div className="mt-1 text-xs font-medium text-[#65706A]">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. TOOLBAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interviews by candidate, round, interviewer..."
            className="w-full h-9 rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-8 text-xs text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#65706A] hover:text-[#18221E]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filters & Schedule Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <RopimoSelect
            value={selectedFilter}
            onChange={(val) => setSelectedFilter(val as any)}
            prefix="Status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "upcoming", label: "Upcoming" },
              { value: "today", label: "Today" },
              { value: "needs_feedback", label: "Needs feedback" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "no-show", label: "No-show" },
            ]}
          />

          {/* Interviewer Filter */}
          {teamMembers.length > 0 && (
            <RopimoSelect
              value={selectedInterviewerId}
              onChange={(val) => setSelectedInterviewerId(val)}
              prefix="Interviewer"
              options={[
                { value: "all", label: "All Interviewers" },
                ...teamMembers.map((m) => ({
                  value: m.user_id,
                  label: m.full_name,
                })),
              ]}
            />
          )}

          {/* Clear Filter */}
          {(selectedFilter !== "all" || selectedInterviewerId !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedFilter("all");
                setSelectedInterviewerId("all");
                setSearchQuery("");
              }}
              className="h-9 inline-flex items-center gap-1 rounded-[10px] border border-[#D8DDD4] bg-white px-2.5 text-xs font-medium text-[#65706A] hover:text-[#D9383A] hover:bg-[#FAF9F5] transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Schedule Interview Button */}
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-[10px] bg-[#10251F] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#18342C] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[#C7F34A]" />
            <span>Schedule interview</span>
          </button>
        </div>
      </div>

      {/* 3. INTERVIEWS LIST */}
      {filteredInterviews.length === 0 ? (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-12 text-center shadow-2xs space-y-3">
          <Calendar className="h-8 w-8 text-[#65706A] mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-[#18221E]">No interviews found</h3>
          <p className="text-xs text-[#65706A] max-w-sm mx-auto">
            {interviews.length === 0
              ? "Schedule interviews from a candidate's profile or directly here using the Schedule interview button."
              : "No interviews match the currently active filters. Clear your filters to see all scheduled rounds."}
          </p>
          {interviews.length === 0 ? (
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule first interview</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedFilter("all");
                setSelectedInterviewerId("all");
                setSearchQuery("");
              }}
              className="mt-2 rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((iv) => {
            const time = new Date(iv.scheduled_at).getTime();
            const isPast = time < now.getTime();
            const status = (iv.status || "scheduled").toLowerCase();
            const isNeedsFeedback = status === "scheduled" && isPast;

            // Dual timezone display
            const tzCompany = iv.timezone || "Asia/Dhaka";
            const tzCandidate = iv.candidate_timezone || "Asia/Dhaka";

            return (
              <div
                key={iv.id}
                className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs hover:border-[#10251F]/40 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#18221E]">
                        {iv.round_name}
                      </h4>
                      {isNeedsFeedback ? (
                        <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Needs feedback
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize",
                            status === "completed" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                            status === "scheduled" && "bg-sky-50 text-sky-800 border-sky-200",
                            status === "cancelled" && "bg-stone-100 text-stone-600 border-stone-200",
                            status === "no-show" && "bg-red-50 text-red-800 border-red-200"
                          )}
                        >
                          {status}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#65706A]">
                      Candidate:{" "}
                      <span className="font-semibold text-[#18221E]">
                        {iv.candidate?.full_name || "Applicant"}
                      </span>{" "}
                      ({iv.candidate?.email}) •{" "}
                      <span>{iv.job_opening?.title || "Role"}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Submit Scorecard */}
                    {status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => setFeedbackInterview(iv)}
                        className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                      >
                        Submit scorecard
                      </button>
                    )}

                    {/* Reschedule */}
                    {status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => setRescheduleInterview(iv)}
                        className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                      >
                        Reschedule
                      </button>
                    )}

                    {/* Cancel */}
                    {status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleCancelInterview(iv.id)}
                        className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Footer: Dual timezones, location, interviewers */}
                <div className="pt-3 border-t border-[#E7EADF] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#65706A]">
                  {/* Timezones */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
                      Date & Time (Dual Timezone)
                    </span>
                    <p className="font-semibold text-[#18221E] mt-0.5">
                      {new Date(iv.scheduled_at).toLocaleString("en-US", {
                        timeZone: tzCompany,
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      ({tzCompany})
                    </p>
                    {tzCandidate !== tzCompany && (
                      <p className="text-[11px] text-[#65706A]">
                        {new Date(iv.scheduled_at).toLocaleString("en-US", {
                          timeZone: tzCandidate,
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        ({tzCandidate})
                      </p>
                    )}
                  </div>

                  {/* Interviewers */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
                      Interviewers
                    </span>
                    <p className="font-semibold text-[#18221E] mt-0.5 truncate">
                      {iv.interviewer_names?.join(", ") || iv.interviewer_name || "Assigned Team"}
                    </p>
                  </div>

                  {/* Meeting link / location */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
                      Type & Meeting Link
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="capitalize font-semibold text-[#18221E]">
                        {iv.interview_type || "video"}
                      </span>
                      {iv.location_or_link && (
                        <>
                          <span>•</span>
                          <a
                            href={iv.location_or_link}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#246244] hover:underline truncate max-w-[150px]"
                          >
                            {iv.location_or_link}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODALS */}
      {scheduleModalOpen && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          workspaceId={workspaceId}
          candidates={candidates}
          teamMembers={teamMembers}
          onSuccess={() => {
            setScheduleModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {feedbackInterview && (
        <SubmitFeedbackModal
          isOpen={Boolean(feedbackInterview)}
          onClose={() => setFeedbackInterview(null)}
          workspaceId={workspaceId}
          interview={feedbackInterview}
          onSuccess={() => {
            setFeedbackInterview(null);
            router.refresh();
          }}
        />
      )}

      {rescheduleInterview && (
        <RescheduleInterviewModal
          isOpen={Boolean(rescheduleInterview)}
          onClose={() => setRescheduleInterview(null)}
          workspaceId={workspaceId}
          interview={rescheduleInterview}
          onSuccess={() => {
            setRescheduleInterview(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
