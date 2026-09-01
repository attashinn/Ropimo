"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Interview, InterviewRecommendation } from "@/types/recruitment";
import { submitInterviewFeedbackAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface SubmitFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  interview: Interview;
  onSuccess?: () => void;
}

const RECOMMENDATIONS: { value: InterviewRecommendation; label: string; desc: string }[] = [
  { value: "Strong Hire", label: "Strong Hire", desc: "Exceeds bar; exceptional fit" },
  { value: "Hire", label: "Hire", desc: "Meets high bar; recommended" },
  { value: "Maybe", label: "Maybe", desc: "Borderline; mixed signals" },
  { value: "No Hire", label: "No Hire", desc: "Does not meet requirements" },
];

export function SubmitFeedbackModal({
  isOpen,
  onClose,
  workspaceId,
  interview,
  onSuccess,
}: SubmitFeedbackModalProps) {
  const router = useRouter();

  const [overallRating, setOverallRating] = React.useState(4);
  const [recommendation, setRecommendation] = React.useState<InterviewRecommendation>("Hire");
  const [strengths, setStrengths] = React.useState("");
  const [concerns, setConcerns] = React.useState("");
  const [privateNotes, setPrivateNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await submitInterviewFeedbackAction({
        workspaceId,
        interviewId: interview.id,
        applicationId: interview.application_id,
        candidateId: interview.candidate_id,
        overallRating,
        recommendation,
        strengths: strengths.trim() || undefined,
        concerns: concerns.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit feedback.");
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
            className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Submit Interview Feedback</h2>
                <p className="text-xs text-[#65706A]">
                  Interview: <span className="font-semibold text-[#18221E]">{interview.round_name}</span> (
                  {interview.interview_type || "Interview"})
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Overall Rating 1-5 */}
              <div className="flex items-center justify-between p-3 rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5]">
                <div>
                  <span className="font-bold text-xs text-[#18221E] block">Overall Rating</span>
                  <span className="text-[11px] text-[#65706A]">Rate the candidate from 1 to 5</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      className={`h-8 w-8 rounded-[8px] text-xs font-bold transition-all ${
                        star <= overallRating
                          ? "bg-[#10251F] text-white shadow-2xs"
                          : "border border-[#D8DDD4] bg-white text-[#65706A] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="mb-1.5 block font-bold text-xs text-[#18221E]">
                  Hiring Recommendation *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RECOMMENDATIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRecommendation(r.value)}
                      className={`p-2.5 rounded-[10px] text-left border transition-all ${
                        recommendation === r.value
                          ? "border-[#10251F] bg-[#10251F] text-white shadow-2xs"
                          : "border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      <p className="font-bold text-xs">{r.label}</p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          recommendation === r.value ? "text-stone-300" : "text-[#65706A]"
                        }`}
                      >
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Key Strengths</label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="What stood out? (e.g. system design depth, communication, problem solving)..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Concerns */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Concerns or Red Flags</label>
                <textarea
                  rows={2}
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="Any skill gaps, mismatch in expectations, or areas for follow-up..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Private Notes */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">
                  Private Evaluation Notes (Recruitment Team Only)
                </label>
                <textarea
                  rows={2}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Private notes for the hiring team and committee..."
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
                  disabled={loading}
                  className="rounded-[8px] px-4 py-1.5 text-xs"
                >
                  {loading ? "Submitting..." : "Submit Feedback"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
