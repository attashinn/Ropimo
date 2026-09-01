"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate, CandidateApplication, InterviewType } from "@/types/recruitment";
import { WorkspacePerson } from "@/types/people";
import { scheduleInterviewAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate: Candidate;
  application: CandidateApplication;
  teamMembers: WorkspacePerson[];
  onSuccess?: () => void;
}

const INTERVIEW_TYPES: InterviewType[] = [
  "Phone Screen",
  "Video Interview",
  "Technical Interview",
  "HR Interview",
  "Final Interview",
  "Other",
];

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  workspaceId,
  candidate,
  application,
  teamMembers,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const router = useRouter();

  const [roundName, setRoundName] = React.useState("Round 1 — Initial Screen");
  const [interviewType, setInterviewType] = React.useState<InterviewType>("Video Interview");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = React.useState<string[]>(
    teamMembers[0]?.user_id ? [teamMembers[0].user_id] : []
  );
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(45);
  const [meetingUrl, setMeetingUrl] = React.useState("https://meet.google.com/");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const isValid = roundName.trim().length > 1 && Boolean(scheduledAt);

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
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    const interviewerNames = selectedInterviewerIds.map(
      (id) => teamMembers.find((m) => m.user_id === id)?.full_name || "Recruiter"
    );

    try {
      const res = await scheduleInterviewAction({
        workspaceId,
        applicationId: application.id,
        candidateId: candidate.id,
        jobOpeningId: application.job_opening_id,
        roundName: roundName.trim(),
        interviewType,
        interviewerIds: selectedInterviewerIds,
        interviewerNames,
        scheduledAt,
        durationMinutes,
        meetingUrl: meetingUrl.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to schedule interview.");
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
                <h2 className="text-base font-bold text-[#18221E]">Schedule Interview</h2>
                <p className="text-xs text-[#65706A]">
                  Candidate: <span className="font-semibold text-[#18221E]">{candidate.full_name}</span> •{" "}
                  Position: <span className="font-semibold text-[#18221E]">{candidate.latest_job_title || "Role"}</span>
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
              {/* Round Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Round Name *</label>
                  <input
                    type="text"
                    required
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    placeholder="e.g. Technical Interview"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Interview Type *</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  >
                    {INTERVIEW_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Date & Time *</label>
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
                    <option value={60}>60 minutes (1 hour)</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>
              </div>

              {/* Interviewer(s) Multi-Select */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">
                  Interviewer(s) (Workspace Members) *
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] max-h-32 overflow-y-auto">
                  {teamMembers.map((m) => {
                    const isSelected = selectedInterviewerIds.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => handleInterviewerToggle(m.user_id)}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[#10251F] text-white shadow-2xs"
                            : "border border-[#D8DDD4] bg-white text-[#65706A] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <span>{isSelected ? "✓" : "+"}</span>
                        <span>{m.full_name}</span>
                        <span className="text-[10px] opacity-70">({m.role})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meeting Link & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Meeting Link / URL</label>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#18221E]">Location / Room</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Conference Room A / Remote"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block font-semibold text-[#18221E]">Internal Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics to evaluate, resume notes, or questions..."
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
                  disabled={!isValid || loading}
                  className="rounded-[8px] px-4 py-1.5 text-xs"
                >
                  {loading ? "Scheduling..." : "Schedule Interview"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
