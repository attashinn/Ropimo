"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate } from "@/types/recruitment";
import { rejectCandidateApplicationAction } from "@/lib/recruitment/actions";

export interface RejectCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate: Candidate;
  onSuccess?: () => void;
}

const REJECTION_REASONS = [
  "Not qualified",
  "Salary mismatch",
  "Experience mismatch",
  "Position filled",
  "Culture fit mismatch",
  "Candidate withdrew",
  "Other",
];

export function RejectCandidateModal({
  isOpen,
  onClose,
  workspaceId,
  candidate,
  onSuccess,
}: RejectCandidateModalProps) {
  const router = useRouter();

  const [reason, setReason] = React.useState(REJECTION_REASONS[0]);
  const [details, setDetails] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const fullReason = details.trim() ? `${reason} — ${details.trim()}` : reason;

    try {
      const res = await rejectCandidateApplicationAction({
        workspaceId,
        candidateId: candidate.id,
        applicationId: candidate.latest_application_id,
        reason: fullReason,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to reject candidate.");
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
                <h2 className="text-base font-bold text-red-600">Reject Application</h2>
                <p className="text-xs text-[#65706A]">
                  Candidate: <span className="font-semibold text-[#18221E]">{candidate.full_name}</span>
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
                <label className="mb-1 block font-semibold text-[#18221E]">
                  Rejection Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">
                  Private Internal Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Additional context for internal records..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-[#65706A] bg-[#FAF9F5] p-2.5 rounded-[8px] border border-[#D8DDD4]">
                ℹ️ The candidate will be moved to <strong>Rejected</strong> stage. Application history remains preserved internally.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[8px] bg-red-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-red-700 transition-colors shadow-2xs"
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
