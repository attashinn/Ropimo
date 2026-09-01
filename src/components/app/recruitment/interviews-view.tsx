"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Interview, InterviewStatus } from "@/types/recruitment";
import { WorkspacePerson } from "@/types/people";
import { SearchIcon } from "@/components/app/nav-icons";
import { SubmitFeedbackModal } from "./submit-feedback-modal";
import { RescheduleInterviewModal } from "./reschedule-interview-modal";
import { InterviewDetailModal } from "./interview-detail-modal";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";

export interface InterviewsViewProps {
  workspaceId: string;
  userRole: string;
  interviews: Interview[];
  teamMembers?: WorkspacePerson[];
}

export function InterviewsView({
  workspaceId,
  userRole,
  interviews,
  teamMembers = [],
}: InterviewsViewProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = React.useState<string>("all");
  const [selectedInterviewerId, setSelectedInterviewerId] = React.useState<string>("all");

  // Modals
  const [feedbackInterview, setFeedbackInterview] = React.useState<Interview | null>(null);
  const [rescheduleInterview, setRescheduleInterview] = React.useState<Interview | null>(null);
  const [detailInterview, setDetailInterview] = React.useState<Interview | null>(null);

  // Dynamic Stats Calculations
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
      if (iv.status === "Completed") {
        completed++;
        if (!iv.feedback || iv.feedback.length === 0) {
          needsFeedback++;
        }
      } else if (iv.status === "Scheduled" || iv.status === "Rescheduled") {
        if (time >= todayStart && time < todayEnd) {
          today++;
        }
        if (time >= now.getTime()) {
          upcoming++;
        }
      }
    });

    return { upcoming, today, completed, needsFeedback };
  }, [interviews, todayStart, todayEnd, now]);

  // Filtered Interviews
  const filteredInterviews = React.useMemo(() => {
    return interviews.filter((iv) => {
      const q = searchQuery.toLowerCase().trim();
      const candidateName = iv.candidate?.full_name?.toLowerCase() || "";
      const jobTitle = iv.job_opening?.title?.toLowerCase() || "";
      const roundName = iv.round_name?.toLowerCase() || "";
      const interviewerName = (iv.interviewer_names?.join(" ") || iv.interviewer_name || "").toLowerCase();

      const matchesSearch =
        !q ||
        candidateName.includes(q) ||
        jobTitle.includes(q) ||
        roundName.includes(q) ||
        interviewerName.includes(q);

      const matchesStatus =
        selectedStatus === "all"
          ? true
          : selectedStatus === "needs_feedback"
          ? iv.status === "Completed" && (!iv.feedback || iv.feedback.length === 0)
          : iv.status === selectedStatus;

      const time = new Date(iv.scheduled_at).getTime();
      let matchesDate = true;
      if (selectedDateFilter === "today") {
        matchesDate = time >= todayStart && time < todayEnd;
      } else if (selectedDateFilter === "upcoming") {
        matchesDate = time >= now.getTime();
      } else if (selectedDateFilter === "past") {
        matchesDate = time < now.getTime();
      }

      const matchesInterviewer =
        selectedInterviewerId === "all" ||
        iv.interviewer_id === selectedInterviewerId ||
        iv.interviewer_ids?.includes(selectedInterviewerId);

      return matchesSearch && matchesStatus && matchesDate && matchesInterviewer;
    });
  }, [
    interviews,
    searchQuery,
    selectedStatus,
    selectedDateFilter,
    selectedInterviewerId,
    todayStart,
    todayEnd,
    now,
  ]);

  return (
    <div className="space-y-6 text-[#18221E]">
      {/* 1. HEADER & INTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#18221E]">Interviews</h2>
          <p className="text-xs text-[#65706A]">
            Manage upcoming interviews, interviewers, and candidate evaluations.
          </p>
        </div>
      </div>

      {/* 2. DYNAMIC STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Upcoming
          </span>
          <p className="mt-1 text-2xl font-extrabold text-[#18221E]">{stats.upcoming}</p>
          <span className="text-[10px] text-[#65706A]">Scheduled rounds</span>
        </div>

        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Today
          </span>
          <p className="mt-1 text-2xl font-extrabold text-[#246244]">{stats.today}</p>
          <span className="text-[10px] text-[#65706A]">Interviews today</span>
        </div>

        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Completed
          </span>
          <p className="mt-1 text-2xl font-extrabold text-[#18221E]">{stats.completed}</p>
          <span className="text-[10px] text-[#65706A]">Evaluated rounds</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === "needs_feedback" ? "all" : "needs_feedback")}
          className={`rounded-[12px] border p-4 shadow-2xs cursor-pointer transition-all ${
            stats.needsFeedback > 0
              ? "border-amber-300 bg-amber-50/50 hover:bg-amber-50"
              : "border-[#D8DDD4] bg-white"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Needs Feedback
          </span>
          <p
            className={`mt-1 text-2xl font-extrabold ${
              stats.needsFeedback > 0 ? "text-amber-700" : "text-[#18221E]"
            }`}
          >
            {stats.needsFeedback}
          </p>
          <span className="text-[10px] text-[#65706A]">
            {stats.needsFeedback > 0 ? "Pending evaluation" : "All up to date"}
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#65706A]">
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate, position, round, or interviewer..."
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-3.5 py-1.5 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:outline-none transition-colors shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <RopimoSelect
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Scheduled", label: "Scheduled" },
              { value: "Completed", label: "Completed" },
              { value: "needs_feedback", label: `Needs Feedback (${stats.needsFeedback})` },
              { value: "Rescheduled", label: "Rescheduled" },
              { value: "Cancelled", label: "Cancelled" },
              { value: "No-show", label: "No-show" },
            ]}
          />

          {/* Date Filter */}
          <RopimoSelect
            value={selectedDateFilter}
            onChange={(val) => setSelectedDateFilter(val)}
            options={[
              { value: "all", label: "All Dates" },
              { value: "today", label: "Today" },
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ]}
          />

          {/* Interviewer Filter */}
          {teamMembers.length > 0 && (
            <RopimoSelect
              value={selectedInterviewerId}
              onChange={(val) => setSelectedInterviewerId(val)}
              options={[
                { value: "all", label: "All Interviewers" },
                ...teamMembers.map((m) => ({
                  value: m.user_id || m.id,
                  label: m.full_name || m.email,
                })),
              ]}
            />
          )}
        </div>
      </div>

      {/* 4. INTERVIEW LIST / CARDS */}
      <div className="space-y-3">
        {filteredInterviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredInterviews.map((iv) => {
              const isNeedsFeedback =
                iv.status === "Completed" && (!iv.feedback || iv.feedback.length === 0);

              const formattedDate = new Date(iv.scheduled_at).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const formattedTime = new Date(iv.scheduled_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div
                  key={iv.id}
                  onClick={() => setDetailInterview(iv)}
                  className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs space-y-3 hover:border-[#10251F] hover:shadow-xs transition-all cursor-pointer group"
                >
                  {/* Top Bar: Candidate & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                        {iv.candidate?.full_name || "Candidate"}
                      </h3>
                      <p className="text-xs text-[#65706A] truncate">
                        {iv.job_opening?.title || "Role Application"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isNeedsFeedback && (
                        <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          Needs Feedback
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          iv.status === "Completed"
                            ? "bg-[#EAF4E2] text-[#246244] border-[#246244]/20"
                            : iv.status === "Cancelled"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {iv.status}
                      </span>
                    </div>
                  </div>

                  {/* Round & Interview Type */}
                  <div className="rounded-[8px] bg-[#FAF9F5] p-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#18221E]">{iv.round_name}</span>
                    <span className="text-[#65706A]">{iv.interview_type || "Video Interview"}</span>
                  </div>

                  {/* Schedule & Interviewer Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#65706A]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Date & Time
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {formattedDate} • {formattedTime}
                      </p>
                      <p className="text-[10px] text-[#65706A]">{iv.duration_minutes} min</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Interviewer(s)
                      </span>
                      <p className="font-semibold text-[#18221E] truncate mt-0.5">
                        {iv.interviewer_names?.join(", ") || iv.interviewer_name || "Assigned Team"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div
                    className="pt-2 border-t border-[#D8DDD4]/60 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailInterview(iv)}
                      className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                    >
                      View Details
                    </button>

                    <div className="flex items-center gap-1.5">
                      {iv.meeting_url && (
                        <a
                          href={iv.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                        >
                          Join ↗
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setFeedbackInterview(iv)}
                        className="rounded-[6px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] transition-colors"
                      >
                        {iv.feedback && iv.feedback.length > 0 ? "Feedback" : "+ Feedback"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-12 text-center text-xs text-[#8C9489] space-y-2 shadow-2xs">
            <p className="font-bold text-sm text-[#18221E]">No interviews matching filter</p>
            <p>Interviews scheduled for candidates will be listed here.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {detailInterview && (
        <InterviewDetailModal
          isOpen={Boolean(detailInterview)}
          onClose={() => setDetailInterview(null)}
          workspaceId={workspaceId}
          interview={detailInterview}
          userRole={userRole}
          onReschedule={(iv) => {
            setDetailInterview(null);
            setRescheduleInterview(iv);
          }}
          onSubmitFeedback={(iv) => {
            setDetailInterview(null);
            setFeedbackInterview(iv);
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {rescheduleInterview && (
        <RescheduleInterviewModal
          isOpen={Boolean(rescheduleInterview)}
          onClose={() => setRescheduleInterview(null)}
          workspaceId={workspaceId}
          interview={rescheduleInterview}
          onSuccess={() => router.refresh()}
        />
      )}

      {feedbackInterview && (
        <SubmitFeedbackModal
          isOpen={Boolean(feedbackInterview)}
          onClose={() => setFeedbackInterview(null)}
          workspaceId={workspaceId}
          interview={feedbackInterview}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
