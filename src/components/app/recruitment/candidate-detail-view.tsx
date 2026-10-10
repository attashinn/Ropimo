"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Candidate,
  CandidateApplication,
  CandidateActivity,
  CandidateEvent,
  CandidateNote,
  Interview,
  InterviewFeedback,
  JobOffer,
  CandidateStage,
} from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import {
  updateCandidateStageAction,
  updateCandidateRatingAction,
  updateCandidateTagsAction,
  addCandidateNoteAction,
  deleteCandidateNoteAction,
  getResumeSignedUrlAction,
} from "@/lib/recruitment/actions";
import { STAGE_DEFINITIONS, HIRING_STAGES, HiringStage } from "@/lib/hiring/stages";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import { SubmitFeedbackModal } from "./submit-feedback-modal";
import { RejectCandidateModal } from "./reject-candidate-modal";
import { CreateOfferModal } from "./create-offer-modal";
import { CompleteHiringModal } from "./complete-hiring-modal";
import { toast } from "sonner";
import {
  Star,
  Mail,
  Phone,
  Globe,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  ExternalLink,
  Download,
  AlertCircle,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  User,
  Send,
  Briefcase,
  Lock,
} from "lucide-react";

export interface CandidateDetailViewProps {
  workspaceId: string;
  workspaceName?: string;
  userRole: string;
  candidate: Candidate;
  applications: CandidateApplication[];
  interviews?: Interview[];
  offers?: JobOffer[];
  activities?: CandidateActivity[];
  events?: CandidateEvent[];
  notes?: CandidateNote[];
  feedbacks?: InterviewFeedback[];
  departments: Department[];
  teamMembers: WorkspacePerson[];
}

type TabKey = "overview" | "timeline" | "notes" | "interviews" | "offer" | "emails";

const PRESET_TAGS = ["Senior", "Strong Fit", "Fast-Track", "Remote", "High Priority", "Leadership"];

export function CandidateDetailView({
  workspaceId,
  workspaceName = "Workspace",
  userRole,
  candidate,
  applications = [],
  interviews = [],
  offers = [],
  activities = [],
  events = [],
  notes = [],
  feedbacks = [],
  departments,
  teamMembers,
}: CandidateDetailViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");
  const [currentStage, setCurrentStage] = React.useState<string>(
    (candidate.latest_stage || "applied").toLowerCase()
  );
  const [updatingStage, setUpdatingStage] = React.useState(false);
  const [rating, setRating] = React.useState<number>(candidate.rating || 0);
  const [tags, setTags] = React.useState<string[]>(candidate.tags || []);
  const [newTagInput, setNewTagInput] = React.useState("");

  // Notes state
  const [noteContent, setNoteContent] = React.useState("");
  const [noteMentions, setNoteMentions] = React.useState<string[]>([]);
  const [submittingNote, setSubmittingNote] = React.useState(false);

  // Resume Signed URL state
  const [signedResumeUrl, setSignedResumeUrl] = React.useState<string | null>(null);
  const [loadingResumeUrl, setLoadingResumeUrl] = React.useState(false);

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [createOfferOpen, setCreateOfferOpen] = React.useState(false);
  const [completeHiringOpen, setCompleteHiringOpen] = React.useState(false);
  const [scorecardInterview, setScorecardInterview] = React.useState<Interview | null>(null);
  const [selectedOfferForHire, setSelectedOfferForHire] = React.useState<JobOffer | undefined>(undefined);

  const isHiringTeam = ["owner", "admin", "hr", "manager"].includes(userRole);
  const isInterviewerOnly = !isHiringTeam;

  const latestApp = applications[0];

  // Fetch signed resume URL
  React.useEffect(() => {
    async function loadSignedUrl() {
      if (candidate.cv_storage_key || latestApp?.cv_storage_key) {
        setLoadingResumeUrl(true);
        const res = await getResumeSignedUrlAction({
          workspaceId,
          candidateId: candidate.id,
        });
        if (res.success && res.data?.url) {
          setSignedResumeUrl(res.data.url);
        } else {
          setSignedResumeUrl(`/api/storage/${candidate.cv_storage_key || latestApp?.cv_storage_key}`);
        }
        setLoadingResumeUrl(false);
      }
    }
    loadSignedUrl();
  }, [workspaceId, candidate.id, candidate.cv_storage_key, latestApp?.cv_storage_key]);

  const handleStageChange = async (targetStage: string) => {
    setUpdatingStage(true);
    const res = await updateCandidateStageAction({
      workspaceId,
      candidateId: candidate.id,
      applicationId: latestApp?.id,
      toStage: targetStage,
    });
    setUpdatingStage(false);

    if (!res.success) {
      toast.error(res.error || "Cannot move stage.");
      return;
    }

    setCurrentStage(targetStage);
    toast.success(`Moved to ${STAGE_DEFINITIONS[targetStage as HiringStage]?.label || targetStage}`);
    router.refresh();
  };

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);
    const res = await updateCandidateRatingAction({
      workspaceId,
      candidateId: candidate.id,
      rating: newRating,
    });
    if (res.success) {
      toast.success(`Rated ${newRating}/5 stars`);
      router.refresh();
    }
  };

  const handleAddTag = async (t: string) => {
    const clean = t.trim();
    if (!clean || tags.includes(clean)) return;
    const updated = [...tags, clean];
    setTags(updated);
    setNewTagInput("");
    await updateCandidateTagsAction({
      workspaceId,
      candidateId: candidate.id,
      tags: updated,
    });
    router.refresh();
  };

  const handleRemoveTag = async (t: string) => {
    const updated = tags.filter((item) => item !== t);
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
    if (!noteContent.trim() || submittingNote) return;
    setSubmittingNote(true);

    // Extract @mentions
    const matches = noteContent.match(/@([a-zA-Z0-9._-]+)/g) || [];
    const mentions = Array.from(new Set(matches.map((m) => m.substring(1))));

    const res = await addCandidateNoteAction({
      workspaceId,
      candidateId: candidate.id,
      content: noteContent.trim(),
      mentions,
    });
    setSubmittingNote(false);

    if (res.success) {
      toast.success("Internal note added.");
      setNoteContent("");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to add note.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this internal note?")) return;
    const res = await deleteCandidateNoteAction({
      workspaceId,
      candidateId: candidate.id,
      noteId,
    });
    if (res.success) {
      toast.success("Note removed.");
      router.refresh();
    }
  };

  // Rejection emails sent
  const emailsSent = events.filter(
    (ev) => ev.event_type === "rejection_email_sent" || ev.event_type === "interview_scheduled"
  );

  // Scorecards calculation
  const totalScorecards = feedbacks.length;
  const avgSkills =
    totalScorecards > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.skills_rating || f.technical_skills_rating || 3), 0) / totalScorecards).toFixed(1)
      : null;
  const avgComms =
    totalScorecards > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.communication_rating || 3), 0) / totalScorecards).toFixed(1)
      : null;
  const avgCulture =
    totalScorecards > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.culture_rating || f.culture_fit_rating || 3), 0) / totalScorecards).toFixed(1)
      : null;
  const avgOverall =
    totalScorecards > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.overall_rating || f.rating || 3), 0) / totalScorecards).toFixed(1)
      : null;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-24 text-[#18221E]">
      {/* 1. BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link href="/app" className="hover:text-[#18221E] transition-colors">
          {workspaceName}
        </Link>
        <span>/</span>
        <Link href="/app/people?tab=candidates" className="hover:text-[#18221E] transition-colors">
          Candidates
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#18221E]">{candidate.full_name}</span>
      </div>

      {/* 2. CANDIDATE PROFILE HEADER CARD */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-lg font-bold text-white shadow-2xs">
              {candidate.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-[#18221E] truncate">
                  {candidate.full_name}
                </h1>
                <span className="rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#18221E]">
                  {STAGE_DEFINITIONS[currentStage as HiringStage]?.label || currentStage}
                </span>
                {candidate.latest_job_title && (
                  <span className="rounded-full bg-[#EAF4E2] border border-[#246244]/20 px-2.5 py-0.5 text-xs font-bold text-[#246244]">
                    {candidate.latest_job_title}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#65706A] truncate">
                {candidate.email} {candidate.phone && `• ${candidate.phone}`} • Source: {candidate.source || "Careers Portal"}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Rating Stars (1-5) */}
            <div className="flex items-center gap-1 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1">
              <span className="text-[10px] font-bold text-[#65706A] mr-1">Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  className="hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= rating ? "text-amber-500 fill-amber-500" : "text-[#D8DDD4]"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Stage Selector */}
            {isHiringTeam && (
              <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#D8DDD4] rounded-[8px] px-2.5 py-1">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Stage:</span>
                <select
                  value={currentStage}
                  disabled={updatingStage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
                >
                  {HIRING_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {STAGE_DEFINITIONS[stg].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Schedule Interview */}
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="rounded-[8px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
            >
              📅 Schedule Interview
            </button>

            {/* Reject Candidate */}
            {isHiringTeam && currentStage !== "rejected" && (
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="rounded-[8px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-2xs"
              >
                Reject Candidate
              </button>
            )}
          </div>
        </div>

        {/* Tags bar */}
        <div className="mt-4 pt-4 border-t border-[#D8DDD4]/60 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[#65706A]">Tags:</span>
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#18221E]"
            >
              {t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="text-[#65706A] hover:text-[#D9383A]"
              >
                ×
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              placeholder="+ Add tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(newTagInput);
                }
              }}
              className="h-6 w-24 rounded border border-[#D8DDD4] bg-white px-2 text-[11px] text-[#18221E] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. PROFILE TABS NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-[#D8DDD4] text-xs font-medium text-[#65706A] overflow-x-auto">
        {[
          { key: "overview", label: "Overview" },
          { key: "timeline", label: `Timeline (${events.length})` },
          { key: "notes", label: `Notes (${notes.length})` },
          { key: "interviews", label: `Interviews (${interviews.length})` },
          { key: "offer", label: `Offer (${offers.length})` },
          { key: "emails", label: `Emails (${emailsSent.length})` },
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
          {/* Left Column: Contact & Application Answers */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">Contact & Background</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">Full Name</span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{candidate.full_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">Email Address</span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{candidate.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">Phone</span>
                  <p className="font-semibold text-[#18221E] mt-0.5">{candidate.phone || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#65706A] block">Experience</span>
                  <p className="font-semibold text-[#18221E] mt-0.5">
                    {candidate.years_of_experience ? `${candidate.years_of_experience} years` : "Not provided"}
                  </p>
                </div>
              </div>

              {/* Links */}
              <div className="pt-3 border-t border-[#D8DDD4]/60 flex items-center gap-4">
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#246244] hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {candidate.portfolio_url && (
                  <a
                    href={candidate.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#246244] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Portfolio</span>
                  </a>
                )}
              </div>
            </div>

            {/* Application Answers */}
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#18221E]">Application Answers & Cover Letter</h3>
              {latestApp?.cover_letter ? (
                <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 text-xs leading-relaxed text-[#18221E] whitespace-pre-line">
                  {latestApp.cover_letter}
                </div>
              ) : (
                <p className="text-xs text-[#65706A] italic">No cover letter submitted.</p>
              )}
            </div>
          </div>

          {/* Right Column: Resume Preview via Short-Lived Signed URL */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18221E]">Resume Preview</h3>
                {signedResumeUrl && (
                  <a
                    href={signedResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#246244] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>

              {loadingResumeUrl ? (
                <div className="p-8 text-center text-xs text-[#65706A]">Loading secure preview...</div>
              ) : signedResumeUrl ? (
                <div className="space-y-3">
                  <div className="aspect-[3/4] w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="h-10 w-10 text-[#246244] mb-2" />
                    <p className="text-xs font-bold text-[#18221E]">
                      {candidate.cv_file_name || latestApp?.cv_file_name || "Resume.pdf"}
                    </p>
                    <p className="text-[11px] text-[#65706A] mt-1">Short-lived signed access granted</p>
                    <a
                      href={signedResumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Document Preview</span>
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#65706A] italic">No resume uploaded for this candidate.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === "timeline" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#18221E]">Candidate Timeline & Audit Log</h3>
          {events.length === 0 ? (
            <p className="text-xs text-[#65706A] italic py-4">No events logged yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7EADF]">
              {events.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-[#246244]" />
                  <div className="text-xs">
                    <p className="font-bold text-[#18221E]">{ev.notes}</p>
                    <p className="text-[11px] text-[#65706A] mt-0.5">
                      By <span className="font-semibold">{ev.actor_name || "System"}</span> •{" "}
                      {new Date(ev.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTES (Internal, @mentions, hiring team only) */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {isInterviewerOnly ? (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-6 text-xs text-amber-800 flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Internal notes are restricted to the hiring team. Assigned interviewers cannot view internal evaluation notes.</span>
            </div>
          ) : (
            <>
              {/* Add Note Form */}
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#18221E]">Internal Hiring Team Notes</h3>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add an internal note. Type @name to mention a teammate..."
                    rows={3}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white p-3 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#65706A]">
                      💡 Only visible to owners, admins, HR, and department managers.
                    </span>
                    <button
                      type="submit"
                      disabled={submittingNote || !noteContent.trim()}
                      className="rounded-[8px] bg-[#10251F] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#18342C] disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      {submittingNote ? "Posting..." : "Post Note"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-xs text-[#65706A] italic py-4">No internal notes posted yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#18221E]">{n.author_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#65706A]">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-[#65706A] hover:text-[#D9383A] text-[11px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-[#333] leading-relaxed whitespace-pre-line">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: INTERVIEWS */}
      {activeTab === "interviews" && (
        <div className="space-y-6">
          {/* Combined Scorecard Summary if feedbacks available */}
          {totalScorecards > 0 && (
            <div className="rounded-[14px] border border-[#246244]/20 bg-[#EAF4E2] p-5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-xs font-bold text-[#246244] uppercase tracking-wider">Combined Scorecard Result</h4>
                  <p className="text-[11px] text-[#246244]/80 mt-0.5">
                    Aggregated across {totalScorecards} submitted interviewer scorecard{totalScorecards > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div className="rounded-[8px] bg-white px-3 py-1.5 border border-[#246244]/20">
                    <span className="text-[10px] text-[#65706A] block">Overall</span>
                    <span className="text-sm font-bold text-[#18221E]">{avgOverall} / 5</span>
                  </div>
                  <div className="rounded-[8px] bg-white px-3 py-1.5 border border-[#246244]/20">
                    <span className="text-[10px] text-[#65706A] block">Skills</span>
                    <span className="text-sm font-bold text-[#18221E]">{avgSkills} / 5</span>
                  </div>
                  <div className="rounded-[8px] bg-white px-3 py-1.5 border border-[#246244]/20">
                    <span className="text-[10px] text-[#65706A] block">Communication</span>
                    <span className="text-sm font-bold text-[#18221E]">{avgComms} / 5</span>
                  </div>
                  <div className="rounded-[8px] bg-white px-3 py-1.5 border border-[#246244]/20">
                    <span className="text-[10px] text-[#65706A] block">Culture</span>
                    <span className="text-sm font-bold text-[#18221E]">{avgCulture} / 5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interviews List */}
          <div className="space-y-4">
            {interviews.length === 0 ? (
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#65706A] shadow-2xs">
                <p>No interviews scheduled yet for this candidate.</p>
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Schedule Interview</span>
                </button>
              </div>
            ) : (
              interviews.map((iv) => (
                <div key={iv.id} className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#18221E]">{iv.round_name}</h4>
                      <p className="text-xs text-[#65706A]">
                        {new Date(iv.scheduled_at).toLocaleString()} • {iv.duration_minutes || 45} mins •{" "}
                        <span className="capitalize">{iv.interview_type || "video"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[#18221E]">
                        {iv.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScorecardInterview(iv)}
                        className="rounded-[8px] bg-[#10251F] text-white px-3 py-1 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                      >
                        Submit Scorecard
                      </button>
                    </div>
                  </div>

                  {iv.location_or_link && (
                    <div className="text-xs text-[#65706A]">
                      <span className="font-semibold text-[#18221E]">Link / Location:</span>{" "}
                      <a href={iv.location_or_link} target="_blank" rel="noreferrer" className="text-[#246244] hover:underline">
                        {iv.location_or_link}
                      </a>
                    </div>
                  )}

                  {/* Feedbacks for this interview */}
                  {feedbacks.filter((f) => f.interview_id === iv.id).length > 0 && (
                    <div className="pt-3 border-t border-[#D8DDD4]/60 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#65706A]">Submitted Scorecards</p>
                      {feedbacks
                        .filter((f) => f.interview_id === iv.id)
                        .map((fb) => (
                          <div key={fb.id} className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#18221E]">{fb.interviewer_name || "Interviewer"}</span>
                              <span className="rounded-full bg-white border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-bold capitalize text-[#246244]">
                                Recommendation: {fb.recommendation.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#65706A]">
                              Skills: {fb.skills_rating || 3}/5 • Communication: {fb.communication_rating || 3}/5 • Culture: {fb.culture_rating || 3}/5
                            </p>
                            {fb.comments && <p className="text-xs text-[#333] pt-1">{fb.comments}</p>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OFFER */}
      {activeTab === "offer" && (
        <div className="space-y-6">
          {isInterviewerOnly ? (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-6 text-xs text-amber-800 flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Compensation and job offers are confidential and restricted to the hiring team.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18221E]">Job Offers</h3>
                <button
                  type="button"
                  onClick={() => setCreateOfferOpen(true)}
                  className="rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs"
                >
                  + Create Offer
                </button>
              </div>

              {offers.length === 0 ? (
                <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 text-center text-xs text-[#65706A] shadow-2xs">
                  <p>No job offers drafted or extended yet.</p>
                </div>
              ) : (
                offers.map((off) => (
                  <div key={off.id} className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#18221E]">{off.job_title}</h4>
                        <p className="text-xs text-[#65706A]">
                          Salary: <span className="font-bold text-[#18221E]">{off.salary || "Not specified"}</span> • Status: {off.status}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#18221E]">
                        {off.status}
                      </span>
                    </div>
                    {off.offer_notes && <p className="text-xs text-[#555]">{off.offer_notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: EMAILS */}
      {activeTab === "emails" && (
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#18221E]">Candidate Email History (Sent via Resend)</h3>
          {emailsSent.length === 0 ? (
            <p className="text-xs text-[#65706A] italic py-4">No emails dispatched to this candidate yet.</p>
          ) : (
            <div className="space-y-3">
              {emailsSent.map((ev) => (
                <div key={ev.id} className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18221E]">
                      {ev.event_type === "rejection_email_sent" ? "Rejection Notification Email" : "Interview Calendar Invitation (.ics)"}
                    </span>
                    <span className="text-[10px] text-[#65706A]">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[#555]">{ev.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {scheduleModalOpen && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          teamMembers={teamMembers}
          onSuccess={() => {
            setScheduleModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {rejectModalOpen && (
        <RejectCandidateModal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          onSuccess={() => {
            setRejectModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {scorecardInterview && (
        <SubmitFeedbackModal
          isOpen={Boolean(scorecardInterview)}
          onClose={() => setScorecardInterview(null)}
          workspaceId={workspaceId}
          interview={scorecardInterview}
          onSuccess={() => {
            setScorecardInterview(null);
            router.refresh();
          }}
        />
      )}

      {createOfferOpen && (
        <CreateOfferModal
          isOpen={createOfferOpen}
          onClose={() => setCreateOfferOpen(false)}
          workspaceId={workspaceId}
          candidate={candidate}
          departments={departments}
          teamMembers={teamMembers}
          onSuccess={() => {
            setCreateOfferOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
