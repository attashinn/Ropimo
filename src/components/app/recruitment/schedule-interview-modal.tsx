"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate, CandidateApplication } from "@/types/recruitment";
import { WorkspacePerson } from "@/types/people";
import {
  scheduleInterviewAction,
  checkInterviewConflictsAction,
} from "@/lib/recruitment/actions";
import { X, Calendar, Clock, AlertTriangle, Video, Phone, MapPin, Users, Globe } from "lucide-react";
import { toast } from "sonner";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate?: Candidate | null;
  candidates?: Candidate[];
  application?: CandidateApplication;
  teamMembers: WorkspacePerson[];
  onSuccess?: () => void;
}

const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone Screen", icon: Phone },
  { value: "video", label: "Video Call (Google Meet / Zoom)", icon: Video },
  { value: "onsite", label: "Onsite Interview", icon: MapPin },
] as const;

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  workspaceId,
  candidate: initialCandidate,
  candidates = [],
  application,
  teamMembers,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const router = useRouter();

  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string>(
    initialCandidate?.id || candidates[0]?.id || ""
  );
  const [roundName, setRoundName] = React.useState("Round 1 — Initial Screen");
  const [interviewType, setInterviewType] = React.useState<"phone" | "video" | "onsite">("video");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = React.useState<string[]>(
    teamMembers[0]?.user_id ? [teamMembers[0].user_id] : []
  );

  // Time and Timezone
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka");
  const [candidateTimezone, setCandidateTimezone] = React.useState("Asia/Dhaka");
  const [durationMinutes, setDurationMinutes] = React.useState(45);

  const [meetingUrl, setMeetingUrl] = React.useState("https://meet.google.com/");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Conflict warning state
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const activeCandidate = initialCandidate || candidates.find((c) => c.id === selectedCandidateId);

  // Check for interviewer schedule conflicts
  React.useEffect(() => {
    async function checkConflict() {
      if (!scheduledAt || selectedInterviewerIds.length === 0) {
        setConflictWarning(null);
        return;
      }

      setCheckingConflict(true);
      try {
        const res = await checkInterviewConflictsAction({
          workspaceId,
          interviewerIds: selectedInterviewerIds,
          scheduledAt,
          durationMinutes,
        });

        if (res.hasConflict && res.conflicts.length > 0) {
          const names = res.conflicts.map((c) => c.title).join(", ");
          setConflictWarning(`Conflict detected: Interviewer already has an event: ${names}`);
        } else {
          setConflictWarning(null);
        }
      } catch {
        // Ignored
      } finally {
        setCheckingConflict(false);
      }
    }

    const timer = setTimeout(checkConflict, 400);
    return () => clearTimeout(timer);
  }, [workspaceId, scheduledAt, durationMinutes, selectedInterviewerIds]);

  const handleInterviewerToggle = (userId: string) => {
    if (selectedInterviewerIds.includes(userId)) {
      if (selectedInterviewerIds.length > 1) {
        setSelectedInterviewerIds(selectedInterviewerIds.filter((id) => id !== userId));
      }
    } else {
      setSelectedInterviewerIds([...selectedInterviewerIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidate || !scheduledAt || loading) return;

    setLoading(true);
    setErrorMsg(null);

    const interviewerNames = selectedInterviewerIds.map(
      (id) => teamMembers.find((m) => m.user_id === id)?.full_name || "Interviewer"
    );

    try {
      const res = await scheduleInterviewAction({
        workspaceId,
        candidateId: activeCandidate.id,
        applicationId: application?.id || "",
        jobOpeningId: application?.job_opening_id || (activeCandidate as any).latest_job_opening_id || "",
        roundName: roundName.trim(),
        interviewType,
        interviewerIds: selectedInterviewerIds,
        interviewerNames,
        scheduledAt,
        timezone,
        candidateTimezone,
        durationMinutes,
        meetingUrl: interviewType === "video" ? meetingUrl.trim() : undefined,
        location: interviewType === "onsite" ? location.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to schedule interview.");
        setLoading(false);
        return;
      }

      toast.success("Interview scheduled! Invitation & .ics calendar file sent via Resend.");
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
            className="relative w-full max-w-xl rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Schedule Interview</h2>
                <p className="text-xs text-[#65706A]">
                  Default timezone: <span className="font-semibold text-[#18221E]">Asia/Dhaka</span>
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
              <div className="rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            {conflictWarning && (
              <div className="flex items-center gap-2 rounded-[8px] border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{conflictWarning}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Candidate Selection (if scheduling from tab) */}
              {!initialCandidate && candidates.length > 0 && (
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Select Candidate *</label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                    required
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.email}) — {c.latest_job_title || "Candidate"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Round Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Round Name *</label>
                  <input
                    type="text"
                    required
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    placeholder="e.g. Technical System Design"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Interview Type *</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as any)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  >
                    {INTERVIEW_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Time & Timezones */}
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-[#18221E]">Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[#18221E]">Duration *</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8DDD4]/60">
                  <div>
                    <label className="mb-1 block font-medium text-[#65706A]">
                      Company Timezone (Default: Asia/Dhaka)
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-xs text-[#18221E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-[#65706A]">
                      Candidate Timezone
                    </label>
                    <input
                      type="text"
                      value={candidateTimezone}
                      onChange={(e) => setCandidateTimezone(e.target.value)}
                      className="w-full rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1.5 text-xs text-[#18221E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Interviewers Multi-Select */}
              <div>
                <label className="mb-1.5 block font-semibold text-[#18221E]">
                  Assign Interviewers *
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-[8px] border border-[#D8DDD4] bg-white">
                  {teamMembers.map((m) => {
                    const isSelected = selectedInterviewerIds.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => handleInterviewerToggle(m.user_id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? "bg-[#10251F] text-white border-[#10251F]"
                            : "bg-[#FAF9F5] text-[#18221E] border-[#D8DDD4] hover:bg-white"
                        }`}
                      >
                        {m.full_name} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meeting Link or Location */}
              {interviewType === "video" && (
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Meeting URL</label>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              )}

              {interviewType === "onsite" && (
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Office Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Floor 4, Meeting Room B"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Preparation Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for interviewers and candidate..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs focus:border-[#10251F] focus:outline-none"
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
                  disabled={loading || !scheduledAt}
                  className="rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-bold text-white hover:bg-[#18342C] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {loading ? "Scheduling..." : "Schedule & Send .ICS"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
