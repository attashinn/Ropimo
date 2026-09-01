"use client";

import * as React from "react";
import Link from "next/link";
import { Candidate, CandidateStage } from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import {
  updateApplicationStageAction,
  assignCandidateRecruiterAction,
  updateCandidateTagsAction,
  addCandidateNoteAction,
  deleteCandidateNoteAction,
  archiveCandidateAction,
} from "@/lib/recruitment/actions";
import { RejectCandidateModal } from "./reject-candidate-modal";
import { AppIcon } from "@/components/ui/app-icon";

export interface CandidateProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  workspaceId: string;
  userRole: string;
  departments: Department[];
  teamMembers: WorkspacePerson[];
  onScheduleInterview: (candidate: Candidate) => void;
  onCreateOffer: (candidate: Candidate) => void;
  onConvertToEmployee: (candidate: Candidate) => void;
  onStageUpdated?: () => void;
}

const STAGES: CandidateStage[] = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview",
  "Feedback",
  "Offer",
  "Hired",
  "Rejected",
  "Archived",
];

const PRESET_TAGS = ["Senior", "Strong Candidate", "Remote", "Urgent", "Needs Review"];

export function CandidateProfileDrawer({
  isOpen,
  onClose,
  candidate,
  workspaceId,
  userRole,
  departments,
  teamMembers,
  onScheduleInterview,
  onCreateOffer,
  onConvertToEmployee,
  onStageUpdated,
}: CandidateProfileDrawerProps) {
  const [currentStage, setCurrentStage] = React.useState<CandidateStage>(
    candidate?.latest_stage || "Applied"
  );
  const [updatingStage, setUpdatingStage] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "notes" | "history">("overview");

  // Notes state
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [submittingNote, setSubmittingNote] = React.useState(false);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);

  // Tags state
  const [tags, setTags] = React.useState<string[]>(candidate?.tags || []);
  const [customTagInput, setCustomTagInput] = React.useState("");

  React.useEffect(() => {
    if (candidate?.latest_stage) {
      setCurrentStage(candidate.latest_stage);
    }
    if (candidate?.tags) {
      setTags(candidate.tags);
    }
  }, [candidate]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !candidate) return null;

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  const initials = candidate.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleStageSelect = async (newStage: CandidateStage) => {
    setCurrentStage(newStage);
    setUpdatingStage(true);
    try {
      await updateApplicationStageAction({
        workspaceId,
        applicationId: candidate.latest_application_id || candidate.id,
        candidateId: candidate.id,
        toStage: newStage,
      });
      if (onStageUpdated) onStageUpdated();
    } catch (err) {
      console.error("Failed to update stage:", err);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAssignRecruiter = async (userId: string) => {
    const selected = teamMembers.find((m) => m.user_id === userId);
    await assignCandidateRecruiterAction({
      workspaceId,
      candidateId: candidate.id,
      applicationId: candidate.latest_application_id,
      recruiterId: selected ? selected.user_id : null,
      recruiterName: selected ? selected.full_name : null,
    });
    if (onStageUpdated) onStageUpdated();
  };

  const handleAddTag = async (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const updated = [...tags, trimmed];
    setTags(updated);
    setCustomTagInput("");
    await updateCandidateTagsAction({
      workspaceId,
      candidateId: candidate.id,
      tags: updated,
    });
    if (onStageUpdated) onStageUpdated();
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    await updateCandidateTagsAction({
      workspaceId,
      candidateId: candidate.id,
      tags: updated,
    });
    if (onStageUpdated) onStageUpdated();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || submittingNote) return;
    setSubmittingNote(true);
    try {
      await addCandidateNoteAction({
        workspaceId,
        candidateId: candidate.id,
        content: newNoteContent.trim(),
      });
      setNewNoteContent("");
      if (onStageUpdated) onStageUpdated();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteCandidateNoteAction({
      workspaceId,
      candidateId: candidate.id,
      noteId,
    });
    if (onStageUpdated) onStageUpdated();
  };

  const handleArchiveToggle = async () => {
    await archiveCandidateAction({
      workspaceId,
      candidateId: candidate.id,
      isArchived: !candidate.is_archived,
    });
    if (onStageUpdated) onStageUpdated();
  };

  const handleCopyEmail = () => {
    if (typeof window !== "undefined" && candidate.email) {
      navigator.clipboard.writeText(candidate.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const getStageBadgeColor = (stage?: CandidateStage) => {
    switch (stage) {
      case "Applied":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Screening":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Shortlisted":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Interview":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Feedback":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "Offer":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Hired":
        return "bg-[#EAF4E2] text-[#246244] border-[#246244]/20 font-bold";
      case "Rejected":
      case "Archived":
      case "Withdrawn":
      case "Expired":
        return "bg-stone-100 text-stone-600 border-stone-200";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  const cvUrl = candidate.cv_storage_key
    ? `/api/storage/${candidate.cv_storage_key}`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs transition-opacity duration-300"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col border-l border-[#D8DDD4] bg-white shadow-2xl transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8DDD4] px-6 py-4 bg-[#FAF9F5]/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#65706A]">
              Candidate Profile
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStageBadgeColor(
                currentStage
              )}`}
            >
              {currentStage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/app/people/candidates/${candidate.id}`}
              className="text-xs font-bold text-[#10251F] hover:underline"
            >
              Full Profile ↗
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#E2E8D8] text-[#65706A] hover:text-[#18221E] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Candidate Summary Box */}
        <div className="border-b border-[#D8DDD4] p-6 bg-white space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-lg font-bold text-white shadow-2xs">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[#18221E] truncate">
                {candidate.full_name}
              </h2>
              <p className="text-xs text-[#65706A] truncate">
                {candidate.latest_job_title || "General Application"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#18221E] font-medium truncate">
                  {candidate.email}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="rounded border border-[#D8DDD4] bg-[#FAF9F5] px-1.5 py-0.5 text-[10px] text-[#65706A] hover:text-[#18221E]"
                >
                  {copiedEmail ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info & Recruiter Selector */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-[#D8DDD4]/60">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                Assigned Recruiter
              </span>
              {canManage ? (
                <select
                  value={candidate.assigned_recruiter_id || ""}
                  onChange={(e) => handleAssignRecruiter(e.target.value)}
                  className="mt-0.5 w-full rounded border border-[#D8DDD4] bg-[#FAF9F5] p-1 text-xs font-semibold text-[#18221E] focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-semibold text-[#18221E]">
                  {candidate.assigned_recruiter_name || "Unassigned"}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                Current Stage
              </span>
              {canManage ? (
                <select
                  value={currentStage}
                  disabled={updatingStage}
                  onChange={(e) => handleStageSelect(e.target.value as CandidateStage)}
                  className="mt-0.5 w-full rounded border border-[#D8DDD4] bg-[#FAF9F5] p-1 text-xs font-semibold text-[#18221E] focus:outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-semibold text-[#18221E]">{currentStage}</p>
              )}
            </div>
          </div>

          {/* Tags Chips */}
          <div className="pt-2 border-t border-[#D8DDD4]/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-[#65706A] block">
              Internal Tags
            </span>
            <div className="flex flex-wrap gap-1 items-center">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#18221E]"
                >
                  <span>{tag}</span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#65706A] hover:text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}

              {canManage && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(customTagInput);
                      }
                    }}
                    placeholder="+ Tag..."
                    className="w-16 rounded border border-[#D8DDD4] bg-[#FAF9F5] px-1.5 py-0.5 text-[10px] focus:outline-none focus:w-28 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#D8DDD4] px-6 text-xs font-semibold text-[#65706A]">
          {[
            { key: "overview", label: "Overview" },
            { key: "notes", label: `Notes (${candidate.notes_list?.length || 0})` },
            { key: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-3 transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-[#10251F] text-[#18221E] -mb-px font-bold"
                  : "hover:text-[#18221E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* CV Section */}
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-2">
                <span className="font-bold text-[#18221E] block text-xs">Resume / CV</span>
                {cvUrl ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[#65706A] truncate flex items-center gap-1.5">
                      <AppIcon name="document" size={13} />
                      <span>{candidate.cv_file_name || "Resume.pdf"}</span>
                    </span>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C]"
                    >
                      Download CV ↗
                    </a>
                  </div>
                ) : (
                  <p className="text-[#8C9489]">No resume uploaded.</p>
                )}
              </div>

              {/* Summary / Bio */}
              <div className="space-y-1">
                <span className="font-bold text-[#18221E] block">Professional Summary</span>
                <p className="text-[#65706A] leading-relaxed rounded-[8px] bg-[#FAF9F5] p-3 border border-[#D8DDD4]">
                  {candidate.bio || candidate.cover_letter || "Not provided"}
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <span className="font-bold text-[#18221E] block">Skills</span>
                {candidate.skills && candidate.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#18221E]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8C9489]">Not provided</p>
                )}
              </div>

              {/* Online Links */}
              <div className="space-y-2">
                <span className="font-bold text-[#18221E] block">Online Links</span>
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[#246244] font-semibold hover:underline truncate"
                  >
                    🔗 LinkedIn: {candidate.linkedin_url}
                  </a>
                )}
                {candidate.portfolio_url && (
                  <a
                    href={candidate.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[#246244] font-semibold hover:underline truncate"
                  >
                    🌐 Portfolio: {candidate.portfolio_url}
                  </a>
                )}
                {candidate.github_url && (
                  <a
                    href={candidate.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[#246244] font-semibold hover:underline truncate"
                  >
                    🐙 GitHub: {candidate.github_url}
                  </a>
                )}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Add note */}
              {canManage && (
                <form onSubmit={handleAddNote} className="space-y-2 p-3 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5]">
                  <textarea
                    rows={2}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write a private recruitment note..."
                    className="w-full rounded border border-[#D8DDD4] bg-white p-2 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNoteContent.trim()}
                      className="rounded bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] disabled:opacity-50"
                    >
                      {submittingNote ? "Saving..." : "Add Note"}
                    </button>
                  </div>
                </form>
              )}

              {/* Notes list */}
              {candidate.notes_list && candidate.notes_list.length > 0 ? (
                <div className="space-y-2.5">
                  {candidate.notes_list.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-[8px] border border-[#D8DDD4] bg-white p-3 space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#18221E]">{n.author_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#65706A]">
                            {new Date(n.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-[10px] text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#18221E] whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#8C9489] py-6">No private notes yet.</p>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#18221E]">
                    {candidate.latest_job_title || "Position Application"}
                  </span>
                  <span className="rounded-full bg-white border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-bold">
                    {currentStage}
                  </span>
                </div>
                <p className="text-[11px] text-[#65706A]">
                  Applied on {new Date(candidate.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {canManage && (
          <div className="border-t border-[#D8DDD4] p-4 bg-[#FAF9F5]/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCreateOffer(candidate)}
                className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
              >
                💼 Offer
              </button>

              <button
                type="button"
                onClick={() => onScheduleInterview(candidate)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
              >
                📅 Interview
              </button>

              {(currentStage === "Offer" || currentStage === "Hired") && !candidate.converted_user_id && (
                <button
                  type="button"
                  onClick={() => onConvertToEmployee(candidate)}
                  className="rounded-[8px] bg-[#246244] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#1c4e36] transition-colors shadow-2xs"
                >
                  ✓ Convert to Employee
                </button>
              )}

              {candidate.converted_user_id && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-1 text-[11px] font-semibold text-[#65706A]">
                    Already converted to an employee
                  </span>
                  <Link
                    href={`/app/people/${candidate.converted_user_id}`}
                    className="rounded-[8px] bg-[#10251F] text-white px-2.5 py-1 text-[11px] font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                  >
                    Profile →
                  </Link>
                  <Link
                    href={`/app/people/onboarding/${candidate.converted_user_id}`}
                    className="rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 px-2.5 py-1 text-[11px] font-bold hover:bg-[#d8edd0] transition-colors"
                  >
                    Onboarding →
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStage !== "Rejected" && (
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(true)}
                  className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Reject
                </button>
              )}

              <button
                type="button"
                onClick={handleArchiveToggle}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                {candidate.is_archived ? "Unarchive" : "Archive"}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <RejectCandidateModal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          onSuccess={() => {
            if (onStageUpdated) onStageUpdated();
          }}
        />
      )}
    </>
  );
}
