"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { X, Star, AlertCircle } from "lucide-react";
import { Interview } from "@/types/recruitment";
import { submitInterviewScorecardAction } from "@/lib/recruitment/actions";
import { toast } from "sonner";

export interface SubmitFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  interview: Interview;
  onSuccess?: () => void;
}

const RECOMMENDATIONS = [
  { value: "strong_yes", label: "Strong Yes", desc: "Exceeds standard; exceptional candidate", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { value: "yes", label: "Yes", desc: "Meets high bar; recommended for hire", color: "bg-green-50 text-green-800 border-green-300" },
  { value: "no", label: "No", desc: "Does not meet team requirements", color: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "strong_no", label: "Strong No", desc: "Significant gaps; not recommended", color: "bg-red-50 text-red-800 border-red-300" },
] as const;

export function SubmitFeedbackModal({
  isOpen,
  onClose,
  workspaceId,
  interview,
  onSuccess,
}: SubmitFeedbackModalProps) {
  const router = useRouter();

  const [skillsRating, setSkillsRating] = React.useState(4);
  const [communicationRating, setCommunicationRating] = React.useState(4);
  const [cultureRating, setCultureRating] = React.useState(4);
  const [recommendation, setRecommendation] = React.useState<"strong_yes" | "yes" | "no" | "strong_no">("yes");
  const [comments, setComments] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await submitInterviewScorecardAction({
        workspaceId,
        interviewId: interview.id,
        candidateId: interview.candidate_id,
        skillsRating,
        communicationRating,
        cultureRating,
        recommendation,
        comments: comments.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit scorecard.");
        setLoading(false);
        return;
      }

      toast.success("Scorecard submitted successfully!");
      setLoading(false);
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const renderStarInput = (val: number, setVal: (n: number) => void, label: string) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-[#18221E]">{label}</label>
        <span className="text-xs font-bold text-[#246244]">{val}/5</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setVal(star)}
            className="p-1 rounded-[4px] hover:bg-[#FAF9F5] transition-colors"
          >
            <Star
              className={`h-5 w-5 ${
                star <= val ? "text-amber-500 fill-amber-500" : "text-[#D8DDD4]"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

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
                <h2 className="text-base font-bold text-[#18221E]">Submit Interview Scorecard</h2>
                <p className="text-xs text-[#65706A]">
                  Round: <span className="font-semibold text-[#18221E]">{interview.round_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-[6px] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Ratings */}
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 space-y-3">
                {renderStarInput(skillsRating, setSkillsRating, "Technical & Role Skills")}
                {renderStarInput(communicationRating, setCommunicationRating, "Communication & Clarity")}
                {renderStarInput(cultureRating, setCultureRating, "Culture & Team Fit")}
              </div>

              {/* Recommendation */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-2">
                  Overall Recommendation <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RECOMMENDATIONS.map((rec) => {
                    const isSelected = recommendation === rec.value;
                    return (
                      <button
                        key={rec.value}
                        type="button"
                        onClick={() => setRecommendation(rec.value)}
                        className={`text-left p-2.5 rounded-[8px] border text-xs transition-all ${
                          isSelected
                            ? `${rec.color} border-current ring-1 ring-current font-bold`
                            : "border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <p className="font-bold">{rec.label}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">{rec.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Comments & Observations
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Summarize candidate's performance, key answers, and overall suitability..."
                  rows={4}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-bold text-white hover:bg-[#18342C] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {loading ? "Submitting..." : "Submit Scorecard"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
