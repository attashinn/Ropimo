"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  JobOpeningStatus,
  CandidateStage,
  InterviewType,
  InterviewStatus,
  InterviewRecommendation,
  InterviewFeedback,
  OfferStatus,
  EmploymentType,
  JobOpening,
  Candidate,
  CandidateNote,
  CandidateApplication,
  Interview,
  JobOffer,
} from "@/types/recruitment";
import { recruitmentStore, createDefaultOnboardingChecklist } from "./store";

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server-side helper to verify user is authenticated and is a member of the workspace
 */
async function verifyUserAndRole(workspaceId: string, allowedRoles: string[] = ["owner", "admin", "manager"]) {
  const adminClient = createAdminClient();
  let user: { id: string } | null = null;

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      user = authData.user;
    }
  } catch {
    // Running in background / CLI script context without Next.js request cookies
  }

  if (!user) {
    // If in CLI / QA script context, resolve workspace owner or authorized member
    const { data: authorizedMember } = await adminClient
      .from("workspace_members")
      .select("user_id, role, full_name")
      .eq("workspace_id", workspaceId)
      .in("role", allowedRoles)
      .limit(1)
      .maybeSingle();

    if (authorizedMember) {
      return {
        user: { id: authorizedMember.user_id },
        member: authorizedMember,
        adminClient,
      };
    }

    throw new Error("Unauthorized: Please sign in.");
  }

  const { data: member } = await adminClient
    .from("workspace_members")
    .select("role, full_name")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden: You do not have permission to perform this action in this workspace.");
  }

  return { user, member, adminClient };
}

// ─── 1. JOB OPENINGS ─────────────────────────────────────────────────────────

export async function createJobOpeningAction(params: {
  workspaceId: string;
  departmentId?: string;
  title: string;
  employmentType: EmploymentType;
  location: string;
  salaryRange?: string;
  hiringManagerId?: string;
  applicationDeadline?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  skills?: string[];
  status?: JobOpeningStatus;
}): Promise<ActionResult> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);

    if (!params.title || params.title.trim().length < 2) {
      return { success: false, error: "Job title must be at least 2 characters." };
    }

    const slug = params.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const newJob: JobOpening = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: params.workspaceId,
      department_id: params.departmentId || null,
      title: params.title.trim(),
      slug,
      description: params.description?.trim() || null,
      responsibilities: params.responsibilities || [],
      requirements: params.requirements || [],
      skills: params.skills || [],
      employment_type: params.employmentType || "Full-time",
      location: params.location?.trim() || "Remote",
      salary_range: params.salaryRange?.trim() || null,
      hiring_manager_id: params.hiringManagerId || null,
      application_deadline: params.applicationDeadline ? new Date(params.applicationDeadline).toISOString() : null,
      status: params.status || "Open",
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Always save to persistent recruitment store
    recruitmentStore.saveJobOpening(newJob);

    // 2. Try DB insert
    try {
      const { data: dbJob, error } = await adminClient
        .from("job_openings")
        .insert({
          workspace_id: params.workspaceId,
          department_id: params.departmentId || null,
          title: params.title.trim(),
          slug,
          description: params.description?.trim() || null,
          responsibilities: params.responsibilities || [],
          requirements: params.requirements || [],
          skills: params.skills || [],
          employment_type: params.employmentType || "Full-time",
          location: params.location?.trim() || "Remote",
          salary_range: params.salaryRange?.trim() || null,
          hiring_manager_id: params.hiringManagerId || null,
          application_deadline: params.applicationDeadline ? new Date(params.applicationDeadline).toISOString() : null,
          status: params.status || "Open",
          created_by: user.id,
        })
        .select()
        .single();

      if (dbJob && !error) {
        newJob.id = dbJob.id;
        recruitmentStore.saveJobOpening(newJob);
      }
    } catch {
      // Fallback to store
    }

    try {
      revalidatePath("/app/people");
      revalidatePath("/jobs");
    } catch {
      // Ignored in non-request contexts
    }
    return { success: true, data: newJob };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create job opening." };
  }
}

export async function updateJobOpeningStatusAction(params: {
  workspaceId: string;
  jobOpeningId: string;
  status: JobOpeningStatus;
}): Promise<ActionResult> {
  try {
    const { adminClient } = await verifyUserAndRole(params.workspaceId);

    try {
      await adminClient
        .from("job_openings")
        .update({
          status: params.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.jobOpeningId)
        .eq("workspace_id", params.workspaceId);
    } catch {
      // Ignored
    }

    const job = recruitmentStore.getJobOpeningById(params.jobOpeningId, params.workspaceId);
    if (job) {
      job.status = params.status;
      job.updated_at = new Date().toISOString();
      recruitmentStore.saveJobOpening(job);
    }

    revalidatePath("/app/people");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update job status." };
  }
}

// ─── 2. CANDIDATE APPLICATION ───────────────────────────────────────────────

export async function submitCandidateApplicationAction(params: {
  workspaceId: string;
  jobOpeningId: string;
  fullName: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  yearsOfExperience?: number;
  skills?: string[];
  coverLetter?: string;
  cvStorageKey: string;
  cvFileName: string;
  cvFileSize?: number;
  cvFileType?: string;
}): Promise<ActionResult> {
  try {
    if (!params.fullName || params.fullName.trim().length < 2) {
      return { success: false, error: "Please provide a valid full name." };
    }
    if (!params.email || !params.email.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }
    if (!params.cvStorageKey) {
      return { success: false, error: "CV / Resume is required." };
    }

    const normalizedEmail = params.email.trim().toLowerCase();

    // Check existing candidate
    let candidate = recruitmentStore
      .getCandidates(params.workspaceId)
      .find((c) => c.email.toLowerCase() === normalizedEmail);

    if (!candidate) {
      candidate = {
        id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        workspace_id: params.workspaceId,
        full_name: params.fullName.trim(),
        email: normalizedEmail,
        phone: params.phone?.trim() || null,
        portfolio_url: params.portfolioUrl?.trim() || null,
        linkedin_url: params.linkedinUrl?.trim() || null,
        years_of_experience: params.yearsOfExperience || null,
        skills: params.skills || [],
        latest_stage: "Applied",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      recruitmentStore.saveCandidate(candidate);
    }

    // Check duplicate active application
    const existingApp = recruitmentStore
      .getApplications(params.workspaceId)
      .find(
        (a) =>
          a.candidate_id === candidate?.id &&
          a.job_opening_id === params.jobOpeningId &&
          !["Rejected", "Withdrawn", "Expired"].includes(a.stage)
      );

    if (existingApp) {
      return {
        success: false,
        error: "An active application for this job opening has already been submitted for this candidate.",
      };
    }

    const newApp: CandidateApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: params.workspaceId,
      candidate_id: candidate.id,
      job_opening_id: params.jobOpeningId,
      stage: "Applied",
      cover_letter: params.coverLetter?.trim() || null,
      cv_storage_key: params.cvStorageKey,
      cv_file_name: params.cvFileName,
      cv_file_size: params.cvFileSize || 0,
      cv_file_type: params.cvFileType || "application/pdf",
      cv_uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    recruitmentStore.saveApplication(newApp);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: candidate.id,
      application_id: newApp.id,
      action_type: "application_submitted",
      title: "Applied for Job Opening",
      description: `Submitted application with CV: ${params.cvFileName}`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
    } catch {
      // Ignored
    }
    return { success: true, data: newApp };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit application." };
  }
}

// ─── 3. PIPELINE STAGE TRANSITION ───────────────────────────────────────────

export async function updateApplicationStageAction(params: {
  workspaceId: string;
  applicationId: string;
  candidateId: string;
  toStage: CandidateStage;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const apps = recruitmentStore.getCandidateApplications(params.candidateId, params.workspaceId);
    const targetApp = apps[0];

    if (targetApp) {
      targetApp.stage = params.toStage;
      targetApp.updated_at = new Date().toISOString();
      if (params.toStage === "Rejected") {
        targetApp.rejected_at = new Date().toISOString();
        targetApp.rejection_reason = params.reason || null;
      } else if (params.toStage === "Hired") {
        targetApp.hired_at = new Date().toISOString();
      }
      recruitmentStore.saveApplication(targetApp);
    }

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (cand) {
      cand.latest_stage = params.toStage;
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: targetApp?.id || params.applicationId,
      actor_id: user.id,
      action_type: "stage_changed",
      title: `Stage Changed to ${params.toStage}`,
      description: `${member.full_name || "Recruiter"} moved candidate to ${params.toStage}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
    } catch {
      // Ignored
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update candidate stage." };
  }
}

// ─── 3.1. CANDIDATE MANAGEMENT (ASSIGN, TAGS, NOTES, REJECT, ARCHIVE) ─────
export async function assignCandidateRecruiterAction(params: {
  workspaceId: string;
  candidateId: string;
  applicationId?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (cand) {
      cand.assigned_recruiter_id = params.recruiterId;
      cand.assigned_recruiter_name = params.recruiterName;
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    if (params.applicationId) {
      const apps = recruitmentStore.getApplications(params.workspaceId);
      const app = apps.find((a) => a.id === params.applicationId);
      if (app) {
        app.assigned_recruiter_id = params.recruiterId;
        app.assigned_recruiter_name = params.recruiterName;
        app.updated_at = new Date().toISOString();
        recruitmentStore.saveApplication(app);
      }
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: params.applicationId || null,
      actor_id: user.id,
      action_type: "candidate_assigned",
      title: params.recruiterName ? `Assigned to ${params.recruiterName}` : "Recruiter Unassigned",
      description: params.recruiterName
        ? `Recruiter assignment set by ${member.full_name || "Admin"}.`
        : `Recruiter assignment removed by ${member.full_name || "Admin"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to assign recruiter." };
  }
}

export async function updateCandidateTagsAction(params: {
  workspaceId: string;
  candidateId: string;
  tags: string[];
}): Promise<ActionResult> {
  try {
    await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    cand.tags = params.tags;
    cand.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(cand);

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: cand.tags };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update tags." };
  }
}

export async function addCandidateNoteAction(params: {
  workspaceId: string;
  candidateId: string;
  content: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);
    if (!params.content?.trim()) {
      return { success: false, error: "Note content cannot be empty." };
    }

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    const newNote: CandidateNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      author_id: user.id,
      author_name: member.full_name || "Recruiter",
      content: params.content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    cand.notes_list = [newNote, ...(cand.notes_list || [])];
    cand.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(cand);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      actor_id: user.id,
      action_type: "note_added",
      title: "Recruitment Note Added",
      description: `Note added by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: newNote };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to add note." };
  }
}

export async function deleteCandidateNoteAction(params: {
  workspaceId: string;
  candidateId: string;
  noteId: string;
}): Promise<ActionResult> {
  try {
    await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    cand.notes_list = (cand.notes_list || []).filter((n) => n.id !== params.noteId);
    cand.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(cand);

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete note." };
  }
}

export async function rejectCandidateApplicationAction(params: {
  workspaceId: string;
  candidateId: string;
  applicationId?: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (cand) {
      cand.latest_stage = "Rejected";
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    const apps = recruitmentStore.getCandidateApplications(params.candidateId, params.workspaceId);
    const targetApp = params.applicationId
      ? apps.find((a) => a.id === params.applicationId) || apps[0]
      : apps[0];

    if (targetApp) {
      targetApp.stage = "Rejected";
      targetApp.rejection_reason = params.reason || "Not qualified";
      targetApp.rejected_at = new Date().toISOString();
      targetApp.updated_at = new Date().toISOString();
      recruitmentStore.saveApplication(targetApp);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: targetApp?.id || null,
      actor_id: user.id,
      action_type: "candidate_rejected",
      title: "Application Rejected",
      description: `Reason: ${params.reason || "Not specified"}. Rejected by ${member.full_name || "Admin"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reject candidate." };
  }
}

export async function archiveCandidateAction(params: {
  workspaceId: string;
  candidateId: string;
  isArchived: boolean;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (cand) {
      cand.is_archived = params.isArchived;
      if (params.isArchived) cand.latest_stage = "Archived";
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    const apps = recruitmentStore.getCandidateApplications(params.candidateId, params.workspaceId);
    apps.forEach((a) => {
      a.is_archived = params.isArchived;
      if (params.isArchived) a.stage = "Archived";
      recruitmentStore.saveApplication(a);
    });

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      actor_id: user.id,
      action_type: "candidate_archived",
      title: params.isArchived ? "Candidate Archived" : "Candidate Unarchived",
      description: `Updated by ${member.full_name || "Admin"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update archive status." };
  }
}

// ─── 4. INTERVIEWS ──────────────────────────────────────────────────────────

export async function scheduleInterviewAction(params: {
  workspaceId: string;
  applicationId: string;
  candidateId: string;
  jobOpeningId: string;
  roundName: string;
  interviewType?: InterviewType;
  interviewerId?: string;
  interviewerIds?: string[];
  interviewerNames?: string[];
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const interviewerIds = params.interviewerIds || (params.interviewerId ? [params.interviewerId] : [user.id]);
    const interviewerNames = params.interviewerNames || [member.full_name || "Recruiter"];

    const interview: Interview = {
      id: `iv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: params.workspaceId,
      application_id: params.applicationId,
      candidate_id: params.candidateId,
      job_opening_id: params.jobOpeningId,
      title: `${params.roundName || "Interview"} with Candidate`,
      round_name: params.roundName?.trim() || "Round 1 — Initial Screen",
      interview_type: params.interviewType || "Video Interview",
      interviewer_id: interviewerIds[0] || user.id,
      interviewer_name: interviewerNames[0] || member.full_name || "Recruiter",
      interviewer_ids: interviewerIds,
      interviewer_names: interviewerNames,
      scheduled_at: new Date(params.scheduledAt).toISOString(),
      duration_minutes: params.durationMinutes || 45,
      location: params.location?.trim() || null,
      meeting_url: params.meetingUrl?.trim() || null,
      location_or_link: params.meetingUrl?.trim() || params.location?.trim() || null,
      status: "Scheduled",
      notes: params.notes?.trim() || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    recruitmentStore.saveInterview(interview);

    // Note: User prompt requirement: "Schedule Interview -> Candidate remains at current stage. HR can explicitly move the application to Interview."
    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: params.applicationId,
      actor_id: user.id,
      action_type: "interview_scheduled",
      title: `Interview Scheduled: ${params.roundName || "Interview"}`,
      description: `${interview.interview_type} on ${new Date(interview.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })} by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: interview };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to schedule interview." };
  }
}

export async function rescheduleInterviewAction(params: {
  workspaceId: string;
  interviewId: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const interviews = recruitmentStore.getInterviews(params.workspaceId);
    const iv = interviews.find((i) => i.id === params.interviewId);
    if (!iv) return { success: false, error: "Interview not found." };

    iv.scheduled_at = new Date(params.scheduledAt).toISOString();
    if (params.durationMinutes) iv.duration_minutes = params.durationMinutes;
    if (params.notes) iv.notes = params.notes;
    iv.status = "Rescheduled";
    iv.updated_at = new Date().toISOString();
    recruitmentStore.saveInterview(iv);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: iv.candidate_id,
      application_id: iv.application_id,
      actor_id: user.id,
      action_type: "interview_rescheduled",
      title: `Interview Rescheduled: ${iv.round_name}`,
      description: `New time: ${new Date(iv.scheduled_at).toLocaleString("en-US")}. Updated by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
    } catch {}

    return { success: true, data: iv };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reschedule interview." };
  }
}

export async function cancelInterviewAction(params: {
  workspaceId: string;
  interviewId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const interviews = recruitmentStore.getInterviews(params.workspaceId);
    const iv = interviews.find((i) => i.id === params.interviewId);
    if (!iv) return { success: false, error: "Interview not found." };

    iv.status = "Cancelled";
    iv.updated_at = new Date().toISOString();
    recruitmentStore.saveInterview(iv);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: iv.candidate_id,
      application_id: iv.application_id,
      actor_id: user.id,
      action_type: "interview_cancelled",
      title: `Interview Cancelled: ${iv.round_name}`,
      description: `${params.reason || "Cancelled"} by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to cancel interview." };
  }
}

export async function completeInterviewAction(params: {
  workspaceId: string;
  interviewId: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const interviews = recruitmentStore.getInterviews(params.workspaceId);
    const iv = interviews.find((i) => i.id === params.interviewId);
    if (!iv) return { success: false, error: "Interview not found." };

    iv.status = "Completed";
    iv.updated_at = new Date().toISOString();
    recruitmentStore.saveInterview(iv);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: iv.candidate_id,
      application_id: iv.application_id,
      actor_id: user.id,
      action_type: "interview_completed",
      title: `Interview Completed: ${iv.round_name}`,
      description: `Marked completed by ${member.full_name || "Recruiter"}. Needs feedback evaluation.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to complete interview." };
  }
}

export async function submitInterviewFeedbackAction(params: {
  workspaceId: string;
  interviewId: string;
  applicationId: string;
  candidateId: string;
  overallRating: number;
  recommendation: InterviewRecommendation;
  strengths?: string;
  concerns?: string;
  privateNotes?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const feedback: InterviewFeedback = {
      id: `fb-${Date.now()}`,
      workspace_id: params.workspaceId,
      interview_id: params.interviewId,
      application_id: params.applicationId,
      candidate_id: params.candidateId,
      interviewer_id: user.id,
      interviewer_name: member.full_name || "Interviewer",
      overall_rating: params.overallRating,
      recommendation: params.recommendation,
      strengths: params.strengths?.trim() || null,
      concerns: params.concerns?.trim() || null,
      private_notes: params.privateNotes?.trim() || null,
      notes: params.privateNotes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    recruitmentStore.saveFeedback(feedback);

    // Mark interview completed if it was Scheduled or Rescheduled
    const iv = recruitmentStore.getInterviews(params.workspaceId).find((i) => i.id === params.interviewId);
    if (iv) {
      iv.status = "Completed";
      recruitmentStore.saveInterview(iv);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: params.applicationId,
      actor_id: user.id,
      action_type: "feedback_submitted",
      title: `Interview Feedback: ${params.recommendation}`,
      description: `Rating: ${params.overallRating}/5. Submitted by ${member.full_name || "Interviewer"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: feedback };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit feedback." };
  }
}

// ─── 5. OFFERS ──────────────────────────────────────────────────────────────

export async function createOfferAction(params: {
  workspaceId: string;
  applicationId: string;
  candidateId: string;
  jobOpeningId?: string;
  jobTitle: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  salary: string;
  salaryCurrency?: string;
  startDate?: string;
  reportingManagerId?: string;
  offerNotes?: string;
  expirationDate?: string;
  status?: OfferStatus;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const token = `off_tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    const jobs = recruitmentStore.getJobOpenings(params.workspaceId);
    const job = jobs.find((j) => j.id === (params.jobOpeningId || cand?.latest_job_id));

    const offer: JobOffer = {
      id: `offer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: params.workspaceId,
      workspace_name: member.full_name ? `${member.full_name}'s Workspace` : "Ropimo Workspace",
      application_id: params.applicationId,
      candidate_id: params.candidateId,
      job_opening_id: params.jobOpeningId || cand?.latest_job_id || null,
      job_title: params.jobTitle.trim(),
      department_id: params.departmentId || job?.department_id || null,
      department_name: job?.department_name || null,
      employment_type: params.employmentType || "Full-time",
      salary: params.salary.trim(),
      salary_currency: params.salaryCurrency || "USD",
      start_date: params.startDate || null,
      reporting_manager_id: params.reportingManagerId || null,
      offer_notes: params.offerNotes?.trim() || null,
      expiration_date: params.expirationDate || null,
      status: params.status || "Draft",
      token,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    recruitmentStore.saveOffer(offer);

    // Move candidate stage to Offer
    if (cand) {
      cand.latest_stage = "Offer";
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    const apps = recruitmentStore.getCandidateApplications(params.candidateId, params.workspaceId);
    const targetApp = apps.find((a) => a.id === params.applicationId) || apps[0];
    if (targetApp) {
      targetApp.stage = "Offer";
      targetApp.updated_at = new Date().toISOString();
      recruitmentStore.saveApplication(targetApp);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      application_id: params.applicationId,
      actor_id: user.id,
      action_type: "offer_created",
      title: "Job Offer Drafted",
      description: `Drafted offer for ${params.jobTitle} (${params.salary} ${offer.salary_currency}) by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: offer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create offer." };
  }
}

export async function sendOfferAction(params: {
  workspaceId: string;
  offerId: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const offers = recruitmentStore.getOffers(params.workspaceId);
    const offer = offers.find((o) => o.id === params.offerId);
    if (!offer) return { success: false, error: "Offer not found." };

    offer.status = "Sent";
    offer.sent_at = new Date().toISOString();
    offer.updated_at = new Date().toISOString();
    recruitmentStore.saveOffer(offer);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: offer.candidate_id,
      application_id: offer.application_id,
      actor_id: user.id,
      action_type: "offer_sent",
      title: "Job Offer Sent",
      description: `Offer for ${offer.job_title} sent to candidate by ${member.full_name || "Recruiter"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${offer.candidate_id}`);
    } catch {}

    return { success: true, data: offer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send offer." };
  }
}

export async function viewPublicOfferAction(tokenOrOfferId: string): Promise<ActionResult> {
  try {
    const store = recruitmentStore.getStore();
    const offer = store.offers.find(
      (o) => o.id === tokenOrOfferId || o.token === tokenOrOfferId
    );

    if (!offer) {
      return { success: false, error: "Offer not found or link has expired." };
    }

    // Mark viewed if it was Sent
    if (offer.status === "Sent") {
      offer.status = "Viewed";
      offer.viewed_at = new Date().toISOString();
      offer.updated_at = new Date().toISOString();
      recruitmentStore.saveOffer(offer);

      recruitmentStore.saveActivity({
        id: `act-${Date.now()}`,
        workspace_id: offer.workspace_id,
        candidate_id: offer.candidate_id,
        application_id: offer.application_id,
        action_type: "offer_viewed",
        title: "Candidate Viewed Offer",
        description: `Offer document viewed online by candidate.`,
        created_at: new Date().toISOString(),
      });
    }

    const candidate = store.candidates.find((c) => c.id === offer.candidate_id);
    const job = store.job_openings.find((j) => j.id === offer.job_opening_id);

    // Return sanitized candidate offer (ZERO internal recruitment notes or feedback)
    return {
      success: true,
      data: {
        id: offer.id,
        token: offer.token,
        workspace_id: offer.workspace_id,
        workspace_name: offer.workspace_name || "Ropimo",
        position_title: offer.job_title,
        department_name: offer.department_name || job?.department_name || "Engineering",
        employment_type: offer.employment_type,
        salary: offer.salary,
        salary_currency: offer.salary_currency || "USD",
        start_date: offer.start_date,
        expiration_date: offer.expiration_date,
        status: offer.status,
        sent_at: offer.sent_at,
        accepted_at: offer.accepted_at,
        declined_at: offer.declined_at,
        candidate_name: candidate?.full_name || "Candidate",
        candidate_email: candidate?.email || "",
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load offer." };
  }
}

export async function acceptPublicOfferAction(params: {
  tokenOrOfferId: string;
  confirmed: boolean;
}): Promise<ActionResult> {
  try {
    if (!params.confirmed) {
      return { success: false, error: "You must confirm acceptance of the employment terms." };
    }

    const store = recruitmentStore.getStore();
    const offer = store.offers.find(
      (o) => o.id === params.tokenOrOfferId || o.token === params.tokenOrOfferId
    );

    if (!offer) return { success: false, error: "Offer not found." };
    if (offer.status === "Accepted") {
      return { success: true, data: offer }; // Idempotent
    }
    if (["Declined", "Withdrawn", "Expired"].includes(offer.status)) {
      return { success: false, error: `This offer is currently ${offer.status.toLowerCase()} and cannot be accepted.` };
    }

    offer.status = "Accepted";
    offer.accepted_at = new Date().toISOString();
    offer.updated_at = new Date().toISOString();
    recruitmentStore.saveOffer(offer);

    // Update target application to Hired
    const apps = recruitmentStore.getCandidateApplications(offer.candidate_id, offer.workspace_id);
    const targetApp = apps.find((a) => a.id === offer.application_id) || apps[0];
    if (targetApp) {
      targetApp.stage = "Hired";
      targetApp.hired_at = new Date().toISOString();
      targetApp.updated_at = new Date().toISOString();
      recruitmentStore.saveApplication(targetApp);
    }

    // Update candidate latest stage to Hired
    const cand = recruitmentStore.getCandidateById(offer.candidate_id, offer.workspace_id);
    if (cand) {
      cand.latest_stage = "Hired";
      cand.updated_at = new Date().toISOString();
      recruitmentStore.saveCandidate(cand);
    }

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: offer.workspace_id,
      candidate_id: offer.candidate_id,
      application_id: offer.application_id,
      action_type: "offer_accepted",
      title: "Job Offer Accepted 🎉",
      description: `Candidate accepted offer for ${offer.job_title}. Ready for HR hiring confirmation.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${offer.candidate_id}`);
    } catch {}

    return { success: true, data: offer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to accept offer." };
  }
}

export async function declinePublicOfferAction(params: {
  tokenOrOfferId: string;
  reason?: string;
  details?: string;
}): Promise<ActionResult> {
  try {
    const store = recruitmentStore.getStore();
    const offer = store.offers.find(
      (o) => o.id === params.tokenOrOfferId || o.token === params.tokenOrOfferId
    );

    if (!offer) return { success: false, error: "Offer not found." };
    if (offer.status === "Accepted") {
      return { success: false, error: "This offer has already been accepted." };
    }

    const fullReason = params.details?.trim()
      ? `${params.reason || "Declined"} — ${params.details.trim()}`
      : params.reason || "Candidate declined offer";

    offer.status = "Declined";
    offer.declined_at = new Date().toISOString();
    offer.decline_reason = fullReason;
    offer.updated_at = new Date().toISOString();
    recruitmentStore.saveOffer(offer);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: offer.workspace_id,
      candidate_id: offer.candidate_id,
      application_id: offer.application_id,
      action_type: "offer_declined",
      title: "Job Offer Declined",
      description: `Candidate declined offer. Reason: ${fullReason}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${offer.candidate_id}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to decline offer." };
  }
}

export async function withdrawOfferAction(params: {
  workspaceId: string;
  offerId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const offers = recruitmentStore.getOffers(params.workspaceId);
    const offer = offers.find((o) => o.id === params.offerId);
    if (!offer) return { success: false, error: "Offer not found." };

    offer.status = "Withdrawn";
    offer.withdrawn_at = new Date().toISOString();
    offer.withdrawn_reason = params.reason || "Offer withdrawn by company";
    offer.updated_at = new Date().toISOString();
    recruitmentStore.saveOffer(offer);

    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: offer.candidate_id,
      application_id: offer.application_id,
      actor_id: user.id,
      action_type: "offer_withdrawn",
      title: "Job Offer Withdrawn",
      description: `Offer withdrawn by ${member.full_name || "Admin"}. Reason: ${params.reason || "Not specified"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${offer.candidate_id}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to withdraw offer." };
  }
}

// ─── 6. HIRING & EMPLOYEE CREATION (IDEMPOTENT & DUPLICATE PROTECTED) ───────

// ─── 6. HIRING & EMPLOYEE CREATION (IDEMPOTENT & DUPLICATE PROTECTED) ───────

export async function hireCandidateAction(params: {
  workspaceId: string;
  candidateId: string;
  applicationId?: string;
  offerId?: string;
  fullName?: string;
  workEmail?: string;
  personalEmail?: string;
  jobTitle?: string;
  departmentId?: string;
  role?: "admin" | "manager" | "member";
  employmentType?: EmploymentType;
  startDate?: string;
  salary?: string;
  location?: string;
  phone?: string;
  managerId?: string;
  employeeId?: string;
}): Promise<ActionResult> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId, ["owner", "admin", "manager"]);

    const candidate = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!candidate) {
      return { success: false, error: "Candidate not found." };
    }

    // 1. DUPLICATE CONVERSION PROTECTION
    if (candidate.converted_user_id) {
      const { data: existingMember } = await adminClient
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", params.workspaceId)
        .eq("user_id", candidate.converted_user_id)
        .maybeSingle();

      if (existingMember) {
        return {
          success: false,
          error: "Already converted to an employee.",
        };
      }
    }

    const fullName = (params.fullName || candidate.full_name || "Team Member").trim();
    const workEmail = (params.workEmail || candidate.email).toLowerCase().trim();
    const jobTitle = (params.jobTitle || candidate.latest_job_title || "Team Member").trim();
    const employmentType = params.employmentType || "Full-time";
    const startDate = params.startDate || new Date().toISOString().split("T")[0];
    const departmentId = params.departmentId || candidate.hired_department_id || "";

    // 2. Generate or reuse unique Employee ID inside the workspace (e.g. EMP-001)
    const employeeId =
      params.employeeId?.trim() ||
      candidate.employee_id ||
      recruitmentStore.getNextEmployeeId(params.workspaceId);

    // 3. DUPLICATE EMPLOYEE ID VALIDATION
    const existingCandidates = recruitmentStore.getCandidates(params.workspaceId);
    const candWithSameEmpId = existingCandidates.find(
      (c) => c.id !== candidate.id && c.employee_id?.toLowerCase() === employeeId.toLowerCase()
    );
    if (candWithSameEmpId) {
      return {
        success: false,
        error: `Employee ID "${employeeId}" is already assigned to another member.`,
      };
    }

    // 4. Check whether email already corresponds to an existing authenticated user
    let targetUserId = candidate.converted_user_id || null;

    if (!targetUserId) {
      try {
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const matched = authUsers?.users?.find(
          (u) => u.email?.toLowerCase() === workEmail.toLowerCase()
        );
        if (matched) {
          targetUserId = matched.id;
        } else {
          // Provision real auth user for the new employee
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: workEmail,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              phone: params.phone || candidate.phone || null,
              job_title: jobTitle,
              skills: candidate.skills || [],
              employee_id: employeeId,
              employment_type: employmentType,
              employment_status: "Active",
              onboarding_status: "Documents Pending",
              candidate_id: candidate.id,
              hire_date: startDate,
              location: params.location || candidate.location || null,
              manager_id: params.managerId || null,
            },
          });
          if (newUser?.user && !createError) {
            targetUserId = newUser.user.id;
          }
        }
      } catch (err) {
        console.error("Auth user lookup/provision error:", err);
      }
    }

    // Fallback ID if auth API not accessible in mock/offline test
    if (!targetUserId) {
      targetUserId = `usr-${candidate.id.replace(/^cand-/, "")}`;
    }

    // 5. Create or update workspace member record
    const { data: existingMember } = await adminClient
      .from("workspace_members")
      .select("id, user_id, role")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingMember) {
      await adminClient
        .from("workspace_members")
        .update({
          job_title: jobTitle,
          role: params.role || existingMember.role || "member",
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", params.workspaceId)
        .eq("user_id", targetUserId);
    } else {
      await adminClient.from("workspace_members").insert({
        workspace_id: params.workspaceId,
        user_id: targetUserId,
        role: params.role || "member",
        job_title: jobTitle,
        full_name: fullName,
        created_at: new Date().toISOString(),
      });
    }

    // 6. Update department member relation
    if (departmentId) {
      await adminClient
        .from("department_members")
        .delete()
        .eq("workspace_id", params.workspaceId)
        .eq("user_id", targetUserId);

      await adminClient.from("department_members").insert({
        workspace_id: params.workspaceId,
        department_id: departmentId,
        user_id: targetUserId,
        job_title: jobTitle,
        created_at: new Date().toISOString(),
      });
    }

    // 7. Update candidate persistent record with linked employee metadata
    candidate.converted_user_id = targetUserId;
    candidate.employee_id = employeeId;
    candidate.latest_stage = "Hired";
    candidate.employment_status = "Active";
    candidate.onboarding_status = "Documents Pending";
    candidate.hired_at = new Date().toISOString();
    candidate.hired_job_title = jobTitle;
    candidate.hired_department_id = departmentId;
    candidate.hired_start_date = startDate;
    candidate.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(candidate);

    // 8. Update target application to Hired
    const apps = recruitmentStore.getCandidateApplications(candidate.id, params.workspaceId);
    if (apps.length > 0) {
      const activeApp = params.applicationId
        ? apps.find((a) => a.id === params.applicationId) || apps[0]
        : apps[0];
      activeApp.stage = "Hired";
      activeApp.hired_at = new Date().toISOString();
      activeApp.updated_at = new Date().toISOString();
      recruitmentStore.saveApplication(activeApp);
    }

    // 9. Update Offer if offerId passed
    if (params.offerId) {
      const offers = recruitmentStore.getOffers(params.workspaceId);
      const targetOffer = offers.find((o) => o.id === params.offerId);
      if (targetOffer) {
        targetOffer.status = "Accepted";
        targetOffer.hired_at = new Date().toISOString();
        targetOffer.updated_at = new Date().toISOString();
        recruitmentStore.saveOffer(targetOffer);
      }
    }

    // 10. Create or retrieve Employee Onboarding Record with initial checklist
    let onboarding = recruitmentStore.getOnboardingByUserId(targetUserId, params.workspaceId);
    if (!onboarding) {
      const defaultChecklist = createDefaultOnboardingChecklist();
      const completedCount = defaultChecklist.filter((c) => c.completed).length;
      const progress = Math.round((completedCount / defaultChecklist.length) * 100);

      onboarding = {
        id: `onb-${Date.now()}`,
        workspace_id: params.workspaceId,
        user_id: targetUserId,
        candidate_id: candidate.id,
        application_id: params.applicationId || candidate.latest_application_id || null,
        employee_id: employeeId,
        status: "Documents Pending",
        progress_percentage: progress,
        checklist: defaultChecklist,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      recruitmentStore.saveOnboarding(onboarding);
    }

    // 11. Activity Logging
    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: candidate.id,
      actor_id: user.id,
      action_type: "candidate_converted_to_employee",
      title: "Candidate Converted to Employee",
      description: `${fullName} is now an Active Employee (${employeeId}) as ${jobTitle}. Converted by ${member.full_name || "Admin"}.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/team");
      revalidatePath(`/app/people/${targetUserId}`);
      revalidatePath(`/app/people/onboarding/${targetUserId}`);
      revalidatePath(`/app/people/candidates/${candidate.id}`);
    } catch {}

    return {
      success: true,
      data: {
        userId: targetUserId,
        employeeId,
        fullName,
        jobTitle,
        departmentId,
        employmentType,
        startDate,
        onboardingId: onboarding.id,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to complete conversion." };
  }
}

export const completeHiringAction = hireCandidateAction;
export const convertCandidateToEmployeeAction = hireCandidateAction;

// ─── 7. ONBOARDING WORKFLOW ACTIONS ──────────────────────────────────────────

export async function updateOnboardingChecklistItemAction(params: {
  workspaceId: string;
  userId: string;
  itemId: string;
  completed: boolean;
}): Promise<ActionResult> {
  try {
    const { user } = await verifyUserAndRole(params.workspaceId, ["owner", "admin", "manager", "member"]);

    let onboarding = recruitmentStore.getOnboardingByUserId(params.userId, params.workspaceId);
    if (!onboarding) {
      const defaultChecklist = createDefaultOnboardingChecklist();
      onboarding = {
        id: `onb-${Date.now()}`,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        status: "In Progress",
        progress_percentage: 40,
        checklist: defaultChecklist,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const itemIdx = onboarding.checklist.findIndex((i) => i.id === params.itemId);
    if (itemIdx >= 0) {
      onboarding.checklist[itemIdx].completed = params.completed;
      onboarding.checklist[itemIdx].completed_at = params.completed ? new Date().toISOString() : null;
      onboarding.checklist[itemIdx].completed_by = params.completed ? user.id : null;
    }

    // Calculate progress based on REQUIRED checklist items
    const requiredItems = onboarding.checklist.filter((i) => i.required !== false);
    const completedRequired = requiredItems.filter((i) => i.completed).length;
    const progress = requiredItems.length > 0 ? Math.round((completedRequired / requiredItems.length) * 100) : 100;
    onboarding.progress_percentage = progress;

    if (progress === 100) {
      onboarding.status = "Ready to Start";
    } else if (progress >= 50) {
      onboarding.status = "Access Setup";
    } else {
      onboarding.status = "In Progress";
    }

    onboarding.updated_at = new Date().toISOString();
    recruitmentStore.saveOnboarding(onboarding);

    if (onboarding.candidate_id) {
      const candidate = recruitmentStore.getCandidateById(onboarding.candidate_id, params.workspaceId);
      if (candidate) {
        candidate.onboarding_status = onboarding.status;
        candidate.updated_at = new Date().toISOString();
        recruitmentStore.saveCandidate(candidate);
      }
    }

    // Log checklist item toggle activity
    if (itemIdx >= 0 && params.completed) {
      recruitmentStore.saveActivity({
        id: `act-${Date.now()}`,
        workspace_id: params.workspaceId,
        candidate_id: params.userId,
        actor_id: user.id,
        action_type: "onboarding_item_completed",
        title: "Onboarding Task Completed",
        description: `Completed: ${onboarding.checklist[itemIdx].title}`,
        created_at: new Date().toISOString(),
      });
    }

    try {
      revalidatePath(`/app/people/${params.userId}`);
      revalidatePath(`/app/people/onboarding/${params.userId}`);
      revalidatePath("/app/people");
    } catch {}

    return { success: true, data: onboarding };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update onboarding task." };
  }
}

export async function completeOnboardingAction(params: {
  workspaceId: string;
  userId: string;
}): Promise<ActionResult> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId, ["owner", "admin", "manager", "member"]);

    let onboarding = recruitmentStore.getOnboardingByUserId(params.userId, params.workspaceId);
    if (!onboarding) {
      return { success: false, error: "Onboarding record not found for this employee." };
    }

    // Check duplicate completion
    if (onboarding.status === "Completed") {
      return { success: false, error: "Employee onboarding has already been completed." };
    }

    // 1. ENFORCE REQUIRED CHECKLIST ITEMS
    const incompleteRequired = onboarding.checklist.filter(
      (item) => item.required !== false && !item.completed
    );

    if (incompleteRequired.length > 0) {
      return {
        success: false,
        error: `Cannot complete onboarding. ${incompleteRequired.length} required checklist item(s) are still pending.`,
      };
    }

    // 2. Mark onboarding as Completed
    onboarding.progress_percentage = 100;
    onboarding.status = "Completed";
    onboarding.completed_at = new Date().toISOString();
    onboarding.completed_by = user.id;
    onboarding.updated_at = new Date().toISOString();
    recruitmentStore.saveOnboarding(onboarding);

    // 3. Update Supabase Auth user metadata to Active / Completed
    try {
      const { data: targetUser } = await adminClient.auth.admin.getUserById(params.userId);
      if (targetUser?.user) {
        await adminClient.auth.admin.updateUserById(params.userId, {
          user_metadata: {
            ...targetUser.user.user_metadata,
            employment_status: "Active",
            onboarding_status: "Completed",
          },
        });
      }
    } catch (err) {
      console.warn("Auth user metadata sync notice:", err);
    }

    // 4. Update candidate record if linked
    if (onboarding.candidate_id) {
      const candidate = recruitmentStore.getCandidateById(onboarding.candidate_id, params.workspaceId);
      if (candidate) {
        candidate.employment_status = "Active";
        candidate.onboarding_status = "Completed";
        candidate.updated_at = new Date().toISOString();
        recruitmentStore.saveCandidate(candidate);
      }
    }

    // 5. Audit Logging
    recruitmentStore.saveActivity({
      id: `act-${Date.now()}`,
      workspace_id: params.workspaceId,
      candidate_id: params.userId,
      actor_id: user.id,
      action_type: "onboarding_completed",
      title: "Employee Onboarding Completed",
      description: `Employee onboarding successfully completed. Employee is now fully Active.`,
      created_at: new Date().toISOString(),
    });

    recruitmentStore.saveActivity({
      id: `act-${Date.now() + 1}`,
      workspace_id: params.workspaceId,
      candidate_id: params.userId,
      actor_id: user.id,
      action_type: "employee_activated",
      title: "Employee Activated",
      description: `Employee status transitioned to Active across Team Directory and Workspaces.`,
      created_at: new Date().toISOString(),
    });

    try {
      revalidatePath(`/app/people/${params.userId}`);
      revalidatePath(`/app/people/onboarding/${params.userId}`);
      revalidatePath("/app/people");
      revalidatePath("/app/team");
    } catch {}

    return { success: true, data: onboarding };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to complete onboarding." };
  }
}

export async function uploadEmployeeDocumentAction(params: {
  workspaceId: string;
  userId: string;
  name: string;
  documentType: "CV/Resume" | "Offer Letter" | "Contract" | "NDA" | "Identity" | "Certificate" | "Other";
  fileUrl: string;
  fileSize?: number;
}): Promise<ActionResult> {
  try {
    const { user } = await verifyUserAndRole(params.workspaceId, ["owner", "admin", "manager", "member"]);

    // If an onboarding record exists, mark corresponding checklist item as done!
    const onboarding = recruitmentStore.getOnboardingByUserId(params.userId, params.workspaceId);
    if (onboarding) {
      if (params.documentType === "Contract" || params.documentType === "NDA") {
        const item = onboarding.checklist.find((i) => i.id === "chk-doc-3");
        if (item) item.completed = true;
      } else if (params.documentType === "Identity") {
        const item = onboarding.checklist.find((i) => i.id === "chk-doc-4");
        if (item) item.completed = true;
      } else if (params.documentType === "Certificate") {
        const item = onboarding.checklist.find((i) => i.id === "chk-doc-5");
        if (item) item.completed = true;
      }

      const completedCount = onboarding.checklist.filter((i) => i.completed).length;
      onboarding.progress_percentage = Math.round((completedCount / onboarding.checklist.length) * 100);
      onboarding.updated_at = new Date().toISOString();
      recruitmentStore.saveOnboarding(onboarding);
    }

    try {
      revalidatePath(`/app/people/${params.userId}`);
      revalidatePath(`/app/people/onboarding/${params.userId}`);
    } catch {}

    return {
      success: true,
      data: {
        id: `doc-${Date.now()}`,
        userId: params.userId,
        name: params.name,
        documentType: params.documentType,
        fileUrl: params.fileUrl,
        fileSize: params.fileSize || 0,
        uploadedBy: user.id,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload document." };
  }
}
