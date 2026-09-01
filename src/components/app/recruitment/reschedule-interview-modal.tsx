"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Interview } from "@/types/recruitment";
import { rescheduleInterviewAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface RescheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  interview: Interview;
  onSuccess?: () => void;
}

export function RescheduleInterviewModal({
  isOpen,
  onClose,
  workspaceId,
  interview,
  onSuccess,
}: RescheduleInterviewModalProps) {
  const router = useRouter();

  const [scheduledAt, setScheduledAt] = React.useState(
    interview.scheduled_at ? new Date(interview.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [durationMinutes, setDurationMinutes] = React.useState(interview.duration_minutes || 45);
  const [notes, setNotes] = React.useState(interview.notes || "");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await rescheduleInterviewAction({
        workspaceId,
        interviewId: interview.id,
        scheduledAt,
        durationMinutes,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to reschedule interview.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

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
            className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Reschedule Interview</h2>
                <p className="text-xs text-[#65706A]">
                  {interview.round_name} • {interview.candidate?.full_name || "Candidate"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Duration (Minutes) *</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Reschedule Reason / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for rescheduling..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <PrimaryButton
                  type="submit"
                  disabled={!scheduledAt || loading}
                  className="rounded-[8px] px-4 py-1.5 text-xs"
                >
                  {loading ? "Rescheduling..." : "Save Reschedule"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
