"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Candidate,
  CandidateApplication,
  CandidateActivity,
  Interview,
  JobOffer,
  CandidateStage,
} from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import {
  updateApplicationStageAction,
  assignCandidateRecruiterAction,
  updateCandidateTagsAction,
  addCandidateNoteAction,
  deleteCandidateNoteAction,
  archiveCandidateAction,
  completeInterviewAction,
  sendOfferAction,
  withdrawOfferAction,
} from "@/lib/recruitment/actions";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import { SubmitFeedbackModal } from "./submit-feedback-modal";
import { RejectCandidateModal } from "./reject-candidate-modal";
import { ConvertToEmployeeModal } from "./convert-to-employee-modal";
import { AppIcon } from "@/components/ui/app-icon";
import { CreateOfferModal } from "./create-offer-modal";
import { CompleteHiringModal } from "./complete-hiring-modal";

export interface CandidateDetailViewProps {
  workspaceId: string;
  workspaceName?: string;
  userRole: string;
  candidate: Candidate;
  applications: CandidateApplication[];
  interviews?: Interview[];
  offers?: JobOffer[];
  activities: CandidateActivity[];
  departments: Department[];
  teamMembers: WorkspacePerson[];
}

type TabKey = "overview" | "applications" | "offers" | "notes" | "resume" | "interviews" | "activity";

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

const PRESET_TAGS = ["Senior", "Strong Candidate", "Remote", "Urgent", "Needs Review", "High Salary", "Culture Fit"];

export function CandidateDetailView({
  workspaceId,
  workspaceName = "Workspace",
  userRole,
  candidate,
  applications,
  interviews = [],
  offers = [],
  activities = [],
  departments,
  teamMembers,
}: CandidateDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [currentStage, setCurrentStage] = React.useState<CandidateStage>(
    candidate.latest_stage || "Applied"
  );
  const [updatingStage, setUpdatingStage] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedOfferLink, setCopiedOfferLink] = React.useState<string | null>(null);

  // Notes state
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [submittingNote, setSubmittingNote] = React.useState(false);

  // Tags state
  const [customTagInput, setCustomTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>(candidate.tags || []);

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [createOfferOpen, setCreateOfferOpen] = React.useState(false);
  const [completeHiringOpen, setCompleteHiringOpen] = React.useState(false);
  const [feedbackInterview, setFeedbackInterview] = React.useState<Interview | null>(null);
  const [selectedOfferForHire, setSelectedOfferForHire] = React.useState<JobOffer | undefined>(undefined);

  const canManage = ["owner", "admin", "manager"].includes(userRole);
  const latestApp = applications[0] || {
    id: candidate.latest_application_id || candidate.id,
    workspace_id: workspaceId,
    candidate_id: candidate.id,
    job_opening_id: candidate.latest_job_id || "",
    stage: currentStage,
    created_at: candidate.created_at,
    updated_at: candidate.created_at,
  };

  const isHired = candidate.latest_stage === "Hired" || Boolean(candidate.converted_user_id);
  const acceptedOffer = offers.find((o) => o.status === "Accepted");

  const initials = candidate.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleStageChange = async (newStage: CandidateStage) => {
    setCurrentStage(newStage);
    setUpdatingStage(true);
    try {
      await updateApplicationStageAction({
        workspaceId,
        applicationId: latestApp.id,
        candidateId: candidate.id,
        toStage: newStage,
      });
      router.refresh();
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
      applicationId: latestApp.id,
      recruiterId: selected ? selected.user_id : null,
      recruiterName: selected ? (selected.full_name || null) : null,
    });
    router.refresh();
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
    router.refresh();
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    await updateCandidateTagsAction({
      workspaceId,
      candidateId: candidate.id,
      tags: updated,
    });
    router.refresh();
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
      router.refresh();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this internal note?")) return;
    await deleteCandidateNoteAction({
      workspaceId,
      candidateId: candidate.id,
      noteId,
    });
    router.refresh();
  };

  const handleArchiveToggle = async () => {
    const targetState = !candidate.is_archived;
    await archiveCandidateAction({
      workspaceId,
      candidateId: candidate.id,
      isArchived: targetState,
    });
    router.refresh();
  };

  const handleSendOffer = async (offerId: string) => {
    await sendOfferAction({
      workspaceId,
      offerId,
    });
    router.refresh();
  };

  const handleWithdrawOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to withdraw this job offer?")) return;
    await withdrawOfferAction({
      workspaceId,
      offerId,
      reason: "Withdrawn by hiring team",
    });
    router.refresh();
  };

  const handleCopyOfferLink = (offer: JobOffer) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/jobs/offers/${offer.token || offer.id}`;
      navigator.clipboard.writeText(url);
      setCopiedOfferLink(offer.id);
      setTimeout(() => setCopiedOfferLink(null), 2000);
    }
  };

  const handleCompleteInterview = async (interviewId: string) => {
    await completeInterviewAction({
      workspaceId,
      interviewId,
    });
    router.refresh();
  };

  const handleCopyEmail = () => {
    if (typeof window !== "undefined" && candidate.email) {
      navigator.clipboard.writeText(candidate.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const cvKey = candidate.cv_storage_key || latestApp.cv_storage_key;
  const cvUrl = cvKey ? `/api/storage/${cvKey}` : null;
  const cvFileName = candidate.cv_file_name || latestApp.cv_file_name || "Resume.pdf";
  const cvFileSize = candidate.cv_file_size || latestApp.cv_file_size;

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

  const getOfferBadgeColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-stone-100 text-stone-700 border-stone-200";
      case "Sent":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Viewed":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Accepted":
        return "bg-[#EAF4E2] text-[#246244] border-[#246244]/20 font-bold";
      case "Declined":
      case "Withdrawn":
      case "Expired":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-24 text-[#18221E]">
      {/* 1. BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link href="/app" className="hover:text-[#18221E] transition-colors">
          {workspaceName}
        </Link>
        <span>/</span>
        <Link href="/app/people" className="hover:text-[#18221E] transition-colors">
          People & Candidates
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#18221E]">{candidate.full_name}</span>
      </div>

      {/* HIRING NOTIFICATION BANNER (IF ACCEPTED BUT NOT HIRED) */}
      {acceptedOffer && !isHired && canManage && (
        <div className="rounded-[14px] bg-[#EAF4E2] border border-[#246244]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-xs text-[#246244]">Offer Accepted by Candidate!</p>
              <p className="text-[11px] text-[#246244]/80">
                {candidate.full_name} accepted the offer for {acceptedOffer.job_title}. Confirm to activate as employee in Team Directory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedOfferForHire(acceptedOffer);
              setCompleteHiringOpen(true);
            }}
            className="rounded-[8px] bg-[#10251F] text-white px-4 py-2 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs whitespace-nowrap"
          >
            Complete Hiring →
          </button>
        </div>
      )}

      {/* 2. CANDIDATE PROFILE HEADER CARD */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-lg font-bold text-white shadow-2xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-[#18221E] truncate">
                {candidate.full_name}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStageBadgeColor(
                  currentStage
                )}`}
              >
                {currentStage}
              </span>
              {isHired && (
                <span className="rounded-full bg-[#EAF4E2] border border-[#246244]/30 px-2.5 py-0.5 text-xs font-bold text-[#246244]">
                  ✓ Active Employee
                </span>
              )}
              {candidate.is_archived && (
                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                  Archived
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#65706A] truncate">
              {candidate.latest_job_title || latestApp.job_opening?.title || "Candidate"} • {candidate.email}{" "}
              {candidate.phone && `• ${candidate.phone}`}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* If already hired, view employee profile & onboarding */}
          {candidate.converted_user_id ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/app/people/${candidate.converted_user_id}`}
                className="rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#246244]/30 px-3.5 py-1.5 text-xs font-bold hover:bg-[#d8edd0] transition-colors"
              >
                View Employee Profile →
              </Link>
              <Link
                href={`/app/people/onboarding/${candidate.converted_user_id}`}
                className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-1.5 text-xs font-bold text-[#18221E] hover:bg-white transition-colors"
              >
                Onboarding →
              </Link>
            </div>
          ) : (
            <>
              {/* If stage is Hired, prominent Hire Candidate button */}
              {currentStage === "Hired" && canManage && (
                <button
                  type="button"
                  onClick={() => setCompleteHiringOpen(true)}
                  className="rounded-[8px] bg-[#246244] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#1b4a33] transition-colors shadow-2xs"
                >
                  ✓ Hire Candidate
                </button>
              )}

              {/* Recruiter Selector */}
              {canManage && (
                <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#D8DDD4] rounded-[8px] px-2.5 py-1">
                  <span className="text-[10px] font-bold uppercase text-[#65706A]">Assigned:</span>
                  <select
                    value={candidate.assigned_recruiter_id || ""}
                    onChange={(e) => handleAssignRecruiter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Move Stage Selector */}
              {canManage && (
                <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#D8DDD4] rounded-[8px] px-2.5 py-1">
                  <span className="text-[10px] font-bold uppercase text-[#65706A]">Stage:</span>
                  <select
                    value={currentStage}
                    disabled={updatingStage}
                    onChange={(e) => handleStageChange(e.target.value as CandidateStage)}
                    className="bg-transparent text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
                  >
                    {STAGES.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Create Offer Button */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => setCreateOfferOpen(true)}
                  className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                >
                  💼 Create Offer
                </button>
              )}

              {/* Schedule Interview */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-colors shadow-2xs"
                >
                  📅 Interview
                </button>
              )}

              {/* Reject */}
              {canManage && currentStage !== "Rejected" && (
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(true)}
                  className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-2xs"
                >
                  Reject
                </button>
              )}
            </>
          )}

          {/* Archive / Unarchive */}
          {canManage && (
            <button
              type="button"
              onClick={handleArchiveToggle}
              className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
            >
              {candidate.is_archived ? "Unarchive" : "Archive"}
            </button>
          )}
        </div>
      </div>

      {/* 3. PROFILE TABS */}
      <div className="flex items-center gap-6 border-b border-[#D8DDD4] text-xs font-medium text-[#65706A] overflow-x-auto">
        {[
          { key: "overview", label: "Overview" },
          { key: "offers", label: `Job Offers (${offers.length})` },
          { key: "applications", label: `Applications (${applications.length})` },
          { key: "notes", label: `Private Notes (${candidate.notes_list?.length || 0})` },
          { key: "resume", label: "Resume / CV" },
          { key: "interviews", label: `Interviews (${interviews.length})` },
          { key: "activity", label: `Activity Log (${activities.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`pb-3 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#10251F] font-semibold text-[#18221E] -mb-px"
                : "hover:text-[#18221E]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Contact Info, Summary, & Tags */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact Details */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">Contact & Background</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Full Name
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{candidate.full_name}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Email Address
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <a href={`mailto:${candidate.email}`} className="font-semibold text-[#18221E] hover:underline truncate">
                      {candidate.email}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-[10px] text-[#65706A] hover:text-[#18221E] border border-[#D8DDD4] rounded px-1 py-0.5"
                    >
                      {copiedEmail ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Phone Number
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">
                    {candidate.phone ? (
                      <a href={`tel:${candidate.phone}`} className="hover:underline">
                        {candidate.phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Location
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">
                    {candidate.location || latestApp.job_opening?.location || "Not provided"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Years of Experience
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">
                    {candidate.years_of_experience ? `${candidate.years_of_experience} years` : "Not provided"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                    Application Date
                  </span>
                  <p className="font-semibold text-[#18221E] mt-0.5">
                    {new Date(candidate.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#18221E]">Recruitment Tags</h3>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1 text-xs font-semibold text-[#18221E]"
                  >
                    <span>{tag}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#65706A] hover:text-red-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {canManage && (
                <div className="pt-2 space-y-2 border-t border-[#D8DDD4]/60">
                  <div className="flex items-center gap-2">
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
                      placeholder="Add tag (e.g. Senior, Urgent)..."
                      className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(customTagInput)}
                      className="rounded-[8px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C]"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {PRESET_TAGS.filter((pt) => !tags.includes(pt)).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handleAddTag(pt)}
                        className="text-[10px] font-semibold text-[#65706A] hover:text-[#18221E] border border-dashed border-[#D8DDD4] rounded px-2 py-0.5 hover:bg-[#FAF9F5]"
                      >
                        + {pt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Professional Summary */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#18221E]">Professional Summary</h3>
              <p className="text-xs text-[#18221E] leading-relaxed">
                {candidate.bio || candidate.cover_letter || "Not provided"}
              </p>
            </div>
          </div>

          {/* Right: Skills & Online Profiles & Employment */}
          <div className="lg:col-span-5 space-y-6">
            {/* Employment Status Card (if Hired or Converted) */}
            {candidate.converted_user_id && (
              <div className="rounded-[14px] border border-[#246244]/20 bg-[#EAF4E2]/40 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#246244]/20 pb-2.5">
                  <h3 className="text-sm font-bold text-[#18221E]">Employment & HR Status</h3>
                  <span className="rounded-full bg-[#EAF4E2] text-[#246244] border border-[#246244]/30 px-2 py-0.5 text-[10px] font-bold">
                    {candidate.employment_status || "Active"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#65706A]">Employee ID</span>
                    <span className="font-bold text-[#18221E]">{candidate.employee_id || "EMP-001"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#65706A]">Official Role</span>
                    <span className="font-semibold text-[#18221E]">
                      {candidate.hired_job_title || candidate.latest_job_title || "Team Member"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#65706A]">Onboarding</span>
                    <span className="font-semibold text-[#246244]">
                      {candidate.onboarding_status || "Completed"}
                    </span>
                  </div>
                  {candidate.hired_start_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#65706A]">Start Date</span>
                      <span className="font-semibold text-[#18221E]">{candidate.hired_start_date}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[#246244]/20">
                  <Link
                    href={`/app/people/${candidate.converted_user_id}`}
                    className="rounded-[8px] bg-[#10251F] text-white py-2 text-center text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                  >
                    View Employee Profile →
                  </Link>
                  <Link
                    href={`/app/people/onboarding/${candidate.converted_user_id}`}
                    className="rounded-[8px] border border-[#D8DDD4] bg-white py-1.5 text-center text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                  >
                    View Onboarding Checklist →
                  </Link>
                </div>
              </div>
            )}

            {/* Online Profiles */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">Online Profiles</h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block mb-1">
                    LinkedIn
                  </span>
                  {candidate.linkedin_url ? (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#18221E] hover:bg-white hover:border-[#10251F] transition-colors"
                    >
                      <span className="truncate">🔗 {candidate.linkedin_url}</span>
                      <span className="text-[#65706A] shrink-0">↗</span>
                    </a>
                  ) : (
                    <p className="text-[#8C9489]">Not provided</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block mb-1">
                    GitHub / Code
                  </span>
                  {candidate.github_url ? (
                    <a
                      href={candidate.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#18221E] hover:bg-white hover:border-[#10251F] transition-colors"
                    >
                      <span className="truncate">🐙 {candidate.github_url}</span>
                      <span className="text-[#65706A] shrink-0">↗</span>
                    </a>
                  ) : (
                    <p className="text-[#8C9489]">Not provided</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block mb-1">
                    Portfolio / Website
                  </span>
                  {candidate.portfolio_url ? (
                    <a
                      href={candidate.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#18221E] hover:bg-white hover:border-[#10251F] transition-colors"
                    >
                      <span className="truncate">🌐 {candidate.portfolio_url}</span>
                      <span className="text-[#65706A] shrink-0">↗</span>
                    </a>
                  ) : (
                    <p className="text-[#8C9489]">Not provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#18221E]">Skills & Qualifications</h3>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1 text-xs font-semibold text-[#18221E]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8C9489]">Not provided</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OFFERS */}
      {activeTab === "offers" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-6 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#18221E]">Job Offers</h3>
              <p className="text-xs text-[#65706A] mt-0.5">
                Manage compensation packages, offer letters, and candidate acceptance.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setCreateOfferOpen(true)}
                className="rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
              >
                + Create Offer
              </button>
            )}
          </div>

          {offers.length > 0 ? (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DDD4]/80 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#18221E]">{offer.job_title}</h4>
                      <p className="text-xs text-[#65706A] mt-0.5">
                        {offer.employment_type} • Department: {offer.department_name || "General"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getOfferBadgeColor(
                        offer.status
                      )}`}
                    >
                      {offer.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Compensation
                      </span>
                      <p className="font-bold text-sm text-[#246244] mt-0.5">
                        {offer.salary} {offer.salary_currency || "USD"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Start Date
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {offer.start_date
                          ? new Date(offer.start_date).toLocaleDateString("en-US", { dateStyle: "medium" })
                          : "Immediate"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Expiration
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {offer.expiration_date
                          ? new Date(offer.expiration_date).toLocaleDateString("en-US", { dateStyle: "medium" })
                          : "None"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Created
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {new Date(offer.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>

                  {offer.decline_reason && (
                    <div className="bg-red-50 p-2.5 rounded-[8px] border border-red-200 text-xs text-red-800">
                      <strong>Decline Reason:</strong> {offer.decline_reason}
                    </div>
                  )}

                  {/* Actions Bar */}
                  {canManage && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#D8DDD4]/60">
                      <div className="flex items-center gap-2">
                        {/* Copy Public Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyOfferLink(offer)}
                          className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                        >
                          {copiedOfferLink === offer.id ? "✓ Link Copied" : "Copy Candidate Link ↗"}
                        </button>

                        <a
                          href={`/jobs/offers/${offer.token || offer.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                        >
                          Open Offer Page ↗
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {offer.status === "Draft" && (
                          <button
                            type="button"
                            onClick={() => handleSendOffer(offer.id)}
                            className="rounded-[6px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] transition-colors"
                          >
                            Send Offer →
                          </button>
                        )}

                        {["Sent", "Viewed"].includes(offer.status) && (
                          <button
                            type="button"
                            onClick={() => handleWithdrawOffer(offer.id)}
                            className="rounded-[6px] border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Withdraw Offer
                          </button>
                        )}

                        {(offer.status === "Accepted" || isHired) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOfferForHire(offer);
                              setCompleteHiringOpen(true);
                            }}
                            className="rounded-[6px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                          >
                            {isHired ? "Update Employee Profile" : "Complete Hiring →"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8C9489] rounded-[10px] border border-dashed border-[#D8DDD4] space-y-2">
              <p className="font-bold text-[#18221E]">No offers extended yet</p>
              <p>Create and send official compensation packages and employment terms.</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setCreateOfferOpen(true)}
                  className="rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] shadow-2xs"
                >
                  Create Offer
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPLICATIONS & HISTORY */}
      {activeTab === "applications" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-6 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18221E]">Independent Application History</h3>
            <span className="text-xs text-[#65706A]">{applications.length} Position(s) Applied</span>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DDD4]/60 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#18221E]">
                        {app.job_opening?.title || candidate.latest_job_title || "General Application"}
                      </h4>
                      <p className="text-xs text-[#65706A] mt-0.5">
                        Department: {app.job_opening?.department_name || "General"} • Location:{" "}
                        {app.job_opening?.location || "Remote"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStageBadgeColor(
                        app.stage
                      )}`}
                    >
                      {app.stage}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Applied Date
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {new Date(app.created_at || candidate.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Source
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {app.source || "Careers Portal"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Status
                      </span>
                      <p className="font-semibold text-[#18221E] mt-0.5">
                        {app.stage === "Rejected" ? "Rejected" : app.stage === "Hired" ? "Hired" : "Active in Pipeline"}
                      </p>
                    </div>
                  </div>

                  {/* If Rejected */}
                  {app.rejection_reason && (
                    <div className="border-t border-[#D8DDD4]/60 pt-3 text-xs bg-red-50/50 p-3 rounded-[8px] border border-red-200/60">
                      <span className="font-bold text-red-700 block">Private Rejection Reason:</span>
                      <p className="text-red-800 mt-0.5">{app.rejection_reason}</p>
                    </div>
                  )}

                  {/* Cover letter */}
                  {app.cover_letter && (
                    <div className="border-t border-[#D8DDD4]/60 pt-3 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Cover Letter
                      </span>
                      <p className="text-xs text-[#18221E] leading-relaxed whitespace-pre-wrap rounded-[8px] bg-white p-3.5 border border-[#D8DDD4]">
                        {app.cover_letter}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C9489]">No application record on file.</p>
          )}
        </div>
      )}

      {/* TAB 4: PRIVATE NOTES */}
      {activeTab === "notes" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-[#18221E]">Internal Recruitment Notes</h3>
            <p className="text-xs text-[#65706A] mt-0.5">
              Private notes are visible strictly to authorized internal hiring members.
            </p>
          </div>

          {/* Add Note Form */}
          {canManage && (
            <form onSubmit={handleAddNote} className="space-y-3 p-4 rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5]">
              <label className="font-bold text-xs text-[#18221E] block">Add Recruitment Note</label>
              <textarea
                rows={3}
                required
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write private notes regarding phone screens, salary expectations, follow-ups..."
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-3 text-xs focus:border-[#10251F] focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !newNoteContent.trim()}
                  className="rounded-[8px] bg-[#10251F] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs disabled:opacity-50"
                >
                  {submittingNote ? "Saving..." : "Add Note"}
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          {candidate.notes_list && candidate.notes_list.length > 0 ? (
            <div className="space-y-3">
              {candidate.notes_list.map((note) => (
                <div
                  key={note.id}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white p-4 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#10251F] text-[10px] font-bold text-white flex items-center justify-center">
                        {note.author_name[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-xs text-[#18221E]">{note.author_name}</span>
                      <span className="text-[10px] text-[#65706A]">
                        {new Date(note.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        })}
                      </span>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-[#65706A] hover:text-red-600 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#18221E] leading-relaxed whitespace-pre-wrap pl-8">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8C9489] rounded-[10px] border border-dashed border-[#D8DDD4]">
              No recruitment notes recorded for this candidate yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RESUME / CV */}
      {activeTab === "resume" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-5 text-xs">
          <h3 className="text-sm font-bold text-[#18221E]">Resume & Documents</h3>

          {cvUrl ? (
            <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white border border-[#D8DDD4] text-[#65706A]">
                  <AppIcon name="document" size={24} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#18221E] truncate">{cvFileName}</p>
                  <p className="text-xs text-[#65706A] mt-0.5">
                    {cvFileSize ? `${Math.round(cvFileSize / 1024)} KB • ` : ""}
                    Cloudflare R2 Stored Document
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] bg-[#10251F] text-white px-4 py-2 text-xs font-semibold hover:bg-[#18342C] transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <span>Download / View CV</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[#D8DDD4] p-8 text-center text-xs text-[#8C9489]">
              No resume document attached to this candidate.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: INTERVIEWS */}
      {activeTab === "interviews" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-5 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18221E]">Interviews & Evaluations</h3>
            {canManage && (
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors"
              >
                + Schedule Interview
              </button>
            )}
          </div>

          {interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((iv) => (
                <div
                  key={iv.id}
                  className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8DDD4]/60 pb-2.5">
                    <div>
                      <h4 className="font-bold text-xs text-[#18221E]">{iv.round_name}</h4>
                      <p className="text-[11px] text-[#65706A]">
                        {iv.interview_type || "Video Interview"} • {iv.duration_minutes} minutes
                      </p>
                    </div>
                    <span className="rounded-full bg-white border border-[#D8DDD4] px-2.5 py-0.5 text-[10px] font-bold text-[#10251F]">
                      {iv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Schedule
                      </span>
                      <p className="font-semibold text-[#18221E]">
                        {new Date(iv.scheduled_at).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Interviewer(s)
                      </span>
                      <p className="font-semibold text-[#18221E]">
                        {iv.interviewer_names?.join(", ") || iv.interviewer_name || "Assigned Team"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Meeting Link / Location
                      </span>
                      {iv.meeting_url || iv.location_or_link ? (
                        <a
                          href={iv.meeting_url || iv.location_or_link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#246244] font-semibold hover:underline truncate block"
                        >
                          {iv.meeting_url || iv.location_or_link} ↗
                        </a>
                      ) : (
                        <p className="text-[#8C9489]">Not set</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]/60">
                    {iv.meeting_url && (
                      <a
                        href={iv.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                      >
                        Join Meeting ↗
                      </a>
                    )}

                    {iv.status !== "Completed" && canManage && (
                      <button
                        type="button"
                        onClick={() => handleCompleteInterview(iv.id)}
                        className="rounded-[6px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                      >
                        Mark Completed
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setFeedbackInterview(iv)}
                      className="rounded-[6px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] transition-colors"
                    >
                      {iv.feedback && iv.feedback.length > 0 ? "Edit Feedback" : "Submit Feedback"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C9489]">No interviews scheduled yet.</p>
          )}
        </div>
      )}

      {/* TAB 7: ACTIVITY LOG */}
      {activeTab === "activity" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#18221E]">Recruitment Timeline & Activity</h3>

          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-[#18221E]">{act.title}</p>
                    <span className="text-[10px] text-[#65706A]">
                      {new Date(act.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </span>
                  </div>
                  {act.description && <p className="text-xs text-[#65706A]">{act.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C9489]">No activity records logged yet.</p>
          )}
        </div>
      )}

      {/* Modals */}
      {scheduleModalOpen && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          application={latestApp}
          teamMembers={teamMembers}
          onSuccess={() => router.refresh()}
        />
      )}

      {createOfferOpen && (
        <CreateOfferModal
          isOpen={createOfferOpen}
          onClose={() => setCreateOfferOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          application={latestApp}
          departments={departments}
          onSuccess={() => router.refresh()}
        />
      )}

      {completeHiringOpen && (
        <CompleteHiringModal
          isOpen={completeHiringOpen}
          onClose={() => setCompleteHiringOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          departments={departments}
          teamMembers={teamMembers}
          offer={selectedOfferForHire || acceptedOffer}
          onSuccess={() => router.refresh()}
        />
      )}

      {rejectModalOpen && (
        <RejectCandidateModal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
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
