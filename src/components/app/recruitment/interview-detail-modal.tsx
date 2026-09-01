"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Interview } from "@/types/recruitment";
import { cancelInterviewAction, completeInterviewAction } from "@/lib/recruitment/actions";

export interface InterviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  interview: Interview;
  userRole: string;
  onReschedule: (interview: Interview) => void;
  onSubmitFeedback: (interview: Interview) => void;
  onSuccess?: () => void;
}

export function InterviewDetailModal({
  isOpen,
  onClose,
  workspaceId,
  interview,
  userRole,
  onReschedule,
  onSubmitFeedback,
  onSuccess,
}: InterviewDetailModalProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this interview?")) return;
    setLoading(true);
    await cancelInterviewAction({
      workspaceId,
      interviewId: interview.id,
      reason: "Cancelled by interviewer/recruiter",
    });
    setLoading(false);
    onClose();
    router.refresh();
    if (onSuccess) onSuccess();
  };

  const handleComplete = async () => {
    setLoading(true);
    await completeInterviewAction({
      workspaceId,
      interviewId: interview.id,
    });
    setLoading(false);
    onClose();
    router.refresh();
    if (onSuccess) onSuccess();
  };

  const feedbackList = interview.feedback || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  {interview.interview_type || "Interview Round"}
                </span>
                <h2 className="text-lg font-bold text-[#18221E]">{interview.round_name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            {/* Candidate & Position Banner */}
            <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-[#18221E]">
                  {interview.candidate?.full_name || "Candidate"}
                </p>
                <p className="text-[11px] text-[#65706A]">
                  Position: {interview.job_opening?.title || "Role Application"}
                </p>
              </div>

              {interview.candidate?.id && (
                <Link
                  href={`/app/people/candidates/${interview.candidate.id}`}
                  className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  View Candidate ↗
                </Link>
              )}
            </div>

            {/* Schedule & Meeting Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-[8px] border border-[#D8DDD4] p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Date & Time
                </span>
                <p className="font-semibold text-[#18221E]">
                  {new Date(interview.scheduled_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-[11px] text-[#65706A]">{interview.duration_minutes} minutes</p>
              </div>

              <div className="rounded-[8px] border border-[#D8DDD4] p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">Status</span>
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    interview.status === "Completed"
                      ? "bg-[#EAF4E2] text-[#246244] border-[#246244]/20"
                      : interview.status === "Cancelled"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {interview.status}
                </span>
              </div>
            </div>

            {/* Interviewer(s) */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                Assigned Interviewer(s)
              </span>
              <p className="font-semibold text-[#18221E] bg-[#FAF9F5] p-2.5 rounded-[8px] border border-[#D8DDD4]">
                {interview.interviewer_names?.join(", ") || interview.interviewer_name || "Assigned Team"}
              </p>
            </div>

            {/* Meeting Link / Location */}
            {(interview.meeting_url || interview.location_or_link || interview.location) && (
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Meeting Link / Location
                </span>
                <div className="flex items-center justify-between bg-[#FAF9F5] p-2.5 rounded-[8px] border border-[#D8DDD4]">
                  <span className="text-[#18221E] font-medium truncate">
                    {interview.meeting_url || interview.location_or_link || interview.location}
                  </span>
                  {interview.meeting_url && (
                    <a
                      href={interview.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-[#10251F] text-white px-2.5 py-1 text-xs font-bold hover:bg-[#18342C] shrink-0 ml-2"
                    >
                      Join Meeting ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Internal Notes */}
            {interview.notes && (
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Internal Instructions / Notes
                </span>
                <p className="text-[#18221E] bg-[#FAF9F5] p-2.5 rounded-[8px] border border-[#D8DDD4] whitespace-pre-wrap">
                  {interview.notes}
                </p>
              </div>
            )}

            {/* Feedback History */}
            {feedbackList.length > 0 && (
              <div className="space-y-2 text-xs pt-2 border-t border-[#D8DDD4]/60">
                <span className="font-bold text-xs text-[#18221E] block">
                  Submitted Evaluation Feedback
                </span>
                {feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18221E]">{fb.interviewer_name || "Interviewer"}</span>
                      <span className="rounded bg-[#10251F] text-white px-2 py-0.5 text-[10px] font-bold">
                        {fb.recommendation} ({fb.overall_rating}/5)
                      </span>
                    </div>
                    {fb.strengths && (
                      <p className="text-[#246244] text-[11px]">
                        <strong>Strengths:</strong> {fb.strengths}
                      </p>
                    )}
                    {fb.concerns && (
                      <p className="text-red-700 text-[11px]">
                        <strong>Concerns:</strong> {fb.concerns}
                      </p>
                    )}
                    {fb.private_notes && (
                      <p className="text-[#65706A] text-[11px] italic">
                        <strong>Private Notes:</strong> {fb.private_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#D8DDD4]/60 flex-wrap">
              <div className="flex items-center gap-2">
                {canManage && interview.status !== "Completed" && interview.status !== "Cancelled" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onReschedule(interview);
                      }}
                      className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                    >
                      Reschedule
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManage && interview.status !== "Completed" && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={loading}
                    className="rounded-[8px] border border-[#10251F] bg-white px-3 py-1.5 text-xs font-bold text-[#10251F] hover:bg-[#FAF9F5]"
                  >
                    Mark Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSubmitFeedback(interview);
                  }}
                  className="rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                >
                  {feedbackList.length > 0 ? "Edit Feedback" : "Submit Feedback"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
