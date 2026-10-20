"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { X, Mail, Eye, AlertCircle } from "lucide-react";
import { Candidate } from "@/types/recruitment";
import { rejectCandidateWithEmailAction } from "@/lib/recruitment/actions";
import { toast } from "sonner";

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
  const [sendEmail, setSendEmail] = React.useState(true);
  const [showPreview, setShowPreview] = React.useState(false);
  const [emailSubject, setEmailSubject] = React.useState(
    `Update on your application with Zambic`
  );
  const [emailBody, setEmailBody] = React.useState(
    `Dear ${candidate?.full_name || "Applicant"},\n\nThank you for taking the time to speak with us about the position. After careful review, we have decided to move forward with other candidates whose qualifications more closely align with our current needs.\n\nWe appreciate your interest in joining our team and wish you the best in your job search.\n\nSincerely,\nZambic Hiring Team`
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (candidate) {
      setEmailBody(
        `Dear ${candidate.full_name},\n\nThank you for taking the time to speak with us about the position. After careful review, we have decided to move forward with other candidates whose qualifications more closely align with our current needs.\n\nWe appreciate your interest in joining our team and wish you the best in your job search.\n\nSincerely,\nZambic Hiring Team`
      );
    }
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const fullReason = details.trim() ? `${reason} — ${details.trim()}` : reason;

    try {
      const res = await rejectCandidateWithEmailAction({
        workspaceId,
        candidateId: candidate.id,
        reason: fullReason,
        sendEmailNotification: sendEmail,
        emailSubject,
        emailBody,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to reject candidate.");
        setLoading(false);
        return;
      }

      toast.success(
        sendEmail
          ? "Candidate rejected and notification email sent."
          : "Candidate rejected (no email sent)."
      );
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
                <h2 className="text-base font-bold text-[#D9383A]">Reject Candidate</h2>
                <p className="text-xs text-[#65706A]">
                  Candidate: <span className="font-semibold text-[#18221E]">{candidate.full_name}</span> ({candidate.email})
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
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  required
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Internal note (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Additional context visible only to the hiring team..."
                  rows={2}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Email Option Toggle */}
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#246244]" />
                    <span className="font-semibold text-[#18221E]">Send rejection email via Resend</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#D8DDD4] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8DDD4] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#246244]"></div>
                  </label>
                </div>

                {!sendEmail && (
                  <p className="text-[11px] text-[#8A958F] italic">
                    Don&apos;t email candidate: The candidate&apos;s stage will be set to rejected without sending any notification.
                  </p>
                )}

                {sendEmail && (
                  <div className="space-y-2 pt-2 border-t border-[#D8DDD4]/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#65706A]">Email template</span>
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#246244] hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{showPreview ? "Edit template" : "Preview email"}</span>
                      </button>
                    </div>

                    {!showPreview ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-[#65706A] mb-0.5">Subject</label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-xs text-[#18221E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#65706A] mb-0.5">Message</label>
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={4}
                            className="w-full rounded-[6px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:outline-none font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="rounded-[8px] border border-[#D8DDD4] bg-white p-3 space-y-2 shadow-2xs">
                        <div className="text-[11px] text-[#65706A] pb-1 border-b border-[#E7EADF]">
                          <span className="font-semibold text-[#18221E]">To:</span> {candidate.email} | <span className="font-semibold text-[#18221E]">Subject:</span> {emailSubject}
                        </div>
                        <div className="text-xs text-[#18221E] whitespace-pre-line leading-relaxed font-sans">
                          {emailBody}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  className="rounded-[8px] bg-[#D9383A] px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {loading ? "Rejecting..." : sendEmail ? "Reject & Send Email" : "Reject (Don't Email)"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
