"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { recruitmentStore } from "@/lib/recruitment/store";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  isAllowedStageTransition,
  normalizeStage,
  HiringStage,
  STAGE_DEFINITIONS,
} from "./stages";
import {
  generateIcsContent,
  formatInterviewDateTime,
} from "./calendar-ics";
import {
  Candidate,
  CandidateApplication,
  CandidateEvent,
  Interview,
  InterviewFeedback,
  CandidateNote,
  InterviewStatus,
  InterviewType,
} from "@/types/recruitment";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── HELPER: AUTH & ROLE VERIFICATION ────────────────────────────────────────

async function verifyUserAndRole(workspaceId: string, allowedRoles = ["owner", "admin", "hr", "manager", "member"]) {
  let user: { id: string; email?: string } | null = null;
  const adminClient = createAdminClient();

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      user = authData.user;
    }
  } catch {
    // In background / CLI script context without active request cookies
  }

  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      const devAdmin = {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@ropimo.dev",
      };
      return {
        user: devAdmin,
        member: { user_id: devAdmin.id, role: "owner", full_name: "System Admin" },
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
    .maybeSingle();

  const role = member?.role || (process.env.NODE_ENV !== "production" ? "admin" : "member");

  return {
    user,
    member: {
      user_id: user.id,
      role,
      full_name: member?.full_name || "Hiring Team Member",
    },
    adminClient,
  };
}

// ─── 1. CANDIDATE STAGE TRANSITIONS ─────────────────────────────────────────

export async function updateCandidateStageAction(params: {
  workspaceId: string;
  candidateId: string;
  applicationId?: string | null;
  toStage: string;
  reason?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    await requirePermission("candidates:manage", { workspaceId: params.workspaceId }, user.id);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    const apps = recruitmentStore.getCandidateApplications(params.candidateId, params.workspaceId);
    const targetApp = params.applicationId
      ? apps.find((a) => a.id === params.applicationId) || apps[0]
      : apps[0];

    const currentStage = normalizeStage(targetApp?.stage || cand.latest_stage || "applied");
    const targetStage = normalizeStage(params.toStage);

    // Enforce state transition rules
    const transitionCheck = isAllowedStageTransition(currentStage, targetStage);
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    const nowIso = new Date().toISOString();

    // 1. Update Candidate
    cand.latest_stage = targetStage;
    cand.updated_at = nowIso;
    if (targetStage === "rejected") {
      cand.rejection_reason = params.reason || null;
      cand.rejected_at = nowIso;
    }
    recruitmentStore.saveCandidate(cand);

    // 2. Update Application
    if (targetApp) {
      targetApp.stage = targetStage;
      targetApp.updated_at = nowIso;
      if (targetStage === "rejected") {
        targetApp.rejection_reason = params.reason || null;
        targetApp.rejected_at = nowIso;
      } else if (targetStage === "hired") {
        targetApp.hired_at = nowIso;
      }
      recruitmentStore.saveApplication(targetApp);
    }

    // 3. Log candidate_events (who, from, to, when, note)
    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      job_opening_id: targetApp?.job_opening_id || null,
      event_type: "stage_transition",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: params.note || params.reason || `Stage changed from ${STAGE_DEFINITIONS[currentStage]?.label} to ${STAGE_DEFINITIONS[targetStage]?.label}`,
      metadata: {
        from_stage: currentStage,
        to_stage: targetStage,
        actor_id: user.id,
        actor_name: member.full_name,
        reason: params.reason || null,
        note: params.note || null,
      },
      created_at: nowIso,
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      await adminClient.from("candidates").update({
        latest_stage: targetStage,
        rejection_reason: cand.rejection_reason,
        rejected_at: cand.rejected_at,
        updated_at: nowIso,
      }).eq("id", params.candidateId).eq("workspace_id", params.workspaceId);

      if (targetApp) {
        await adminClient.from("candidate_applications").update({
          stage: targetStage,
          rejection_reason: targetApp.rejection_reason,
          rejected_at: targetApp.rejected_at,
          hired_at: targetApp.hired_at,
          updated_at: nowIso,
        }).eq("id", targetApp.id).eq("workspace_id", params.workspaceId);
      }

      await adminClient.from("candidate_events").insert({
        id: event.id,
        workspace_id: event.workspace_id,
        candidate_id: event.candidate_id,
        application_id: targetApp?.id || null,
        actor_id: user.id,
        event_type: event.event_type,
        title: `Moved to ${STAGE_DEFINITIONS[targetStage]?.label}`,
        description: event.notes,
        metadata: event.metadata,
        created_at: nowIso,
      });
    } catch {}

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || "Failed to update candidate stage." };
  }
}

export async function bulkUpdateCandidatesStageAction(params: {
  workspaceId: string;
  candidateIds: string[];
  toStage: string;
  reason?: string;
}): Promise<ActionResult<{ updatedCount: number; errors: string[] }>> {
  try {
    const errors: string[] = [];
    let updatedCount = 0;

    for (const candId of params.candidateIds) {
      const res = await updateCandidateStageAction({
        workspaceId: params.workspaceId,
        candidateId: candId,
        toStage: params.toStage,
        reason: params.reason,
      });
      if (res.success) {
        updatedCount++;
      } else if (res.error) {
        errors.push(res.error);
      }
    }

    return { success: true, data: { updatedCount, errors } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 2. CANDIDATE RATINGS & TAGS ─────────────────────────────────────────────

export async function updateCandidateRatingAction(params: {
  workspaceId: string;
  candidateId: string;
  rating: number; // 1 to 5
}): Promise<ActionResult> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    const cleanRating = Math.max(1, Math.min(5, Math.round(params.rating)));
    cand.rating = cleanRating;
    cand.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(cand);

    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      event_type: "candidate_rated",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: `Rating updated to ${cleanRating}/5 by ${member.full_name}`,
      created_at: new Date().toISOString(),
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      await adminClient
        .from("candidates")
        .update({ rating: cleanRating, updated_at: cand.updated_at })
        .eq("id", params.candidateId)
        .eq("workspace_id", params.workspaceId);
    } catch {}

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: { rating: cleanRating } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function updateCandidateTagsAction(params: {
  workspaceId: string;
  candidateId: string;
  tags: string[];
}): Promise<ActionResult> {
  try {
    const { adminClient } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    const cleanTags = Array.from(new Set(params.tags.map((t) => t.trim()).filter(Boolean)));
    cand.tags = cleanTags;
    cand.updated_at = new Date().toISOString();
    recruitmentStore.saveCandidate(cand);

    try {
      await adminClient
        .from("candidates")
        .update({ tags: cleanTags, updated_at: cand.updated_at })
        .eq("id", params.candidateId)
        .eq("workspace_id", params.workspaceId);
    } catch {}

    try {
      revalidatePath("/app/people");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: { tags: cleanTags } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function bulkTagCandidatesAction(params: {
  workspaceId: string;
  candidateIds: string[];
  tags: string[];
}): Promise<ActionResult> {
  try {
    for (const id of params.candidateIds) {
      const cand = recruitmentStore.getCandidateById(id, params.workspaceId);
      if (cand) {
        const merged = Array.from(new Set([...(cand.tags || []), ...params.tags]));
        await updateCandidateTagsAction({
          workspaceId: params.workspaceId,
          candidateId: id,
          tags: merged,
        });
      }
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 3. CANDIDATE NOTES (WITH @MENTIONS) ─────────────────────────────────────

export async function addCandidateNoteAction(params: {
  workspaceId: string;
  candidateId: string;
  content: string;
  mentions?: string[];
}): Promise<ActionResult<CandidateNote>> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    if (!params.content || !params.content.trim()) {
      return { success: false, error: "Note content cannot be empty." };
    }

    const nowIso = new Date().toISOString();
    const newNote: CandidateNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      author_id: user.id,
      author_name: member.full_name || "Hiring Team Member",
      content: params.content.trim(),
      mentions: params.mentions || [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    recruitmentStore.saveCandidateNote(newNote);

    try {
      await adminClient.from("candidate_notes").insert({
        id: newNote.id,
        workspace_id: newNote.workspace_id,
        candidate_id: newNote.candidate_id,
        author_id: user.id,
        content: newNote.content,
        mentions: newNote.mentions || [],
        created_at: nowIso,
      });
    } catch {}

    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      event_type: "note_added",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: `Internal note added by ${member.full_name}`,
      created_at: nowIso,
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: newNote };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function deleteCandidateNoteAction(params: {
  workspaceId: string;
  candidateId: string;
  noteId: string;
}): Promise<ActionResult> {
  try {
    const { adminClient } = await verifyUserAndRole(params.workspaceId);

    recruitmentStore.deleteCandidateNote(params.noteId, params.workspaceId);

    try {
      await adminClient
        .from("candidate_notes")
        .delete()
        .eq("id", params.noteId)
        .eq("workspace_id", params.workspaceId);
    } catch {}

    try {
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 4. REJECTION FLOW WITH OPTIONAL RESEND EMAIL ───────────────────────────

export async function rejectCandidateWithEmailAction(params: {
  workspaceId: string;
  candidateId: string;
  reason: string;
  sendEmailNotification?: boolean;
  emailSubject?: string;
  emailBody?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    // Move stage to rejected
    const stageRes = await updateCandidateStageAction({
      workspaceId: params.workspaceId,
      candidateId: params.candidateId,
      toStage: "rejected",
      reason: params.reason,
    });
    if (!stageRes.success) return stageRes;

    // Send email if requested
    if (params.sendEmailNotification && cand.email) {
      const subject = params.emailSubject || `Update on your application with Ropimo`;
      const body =
        params.emailBody ||
        `Dear ${cand.full_name},\n\nThank you for taking the time to speak with us about the position. After careful review, we have decided to move forward with other candidates whose qualifications more closely align with our current needs.\n\nWe appreciate your interest in joining our team and wish you the best in your job search.\n\nSincerely,\nRopimo Hiring Team`;

      await sendEmail({
        to: cand.email,
        workspaceId: params.workspaceId,
        fromName: "Ropimo Hiring Team",
        replyTo: "hr@ropimo.com",
        template: "candidate_rejection",
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
            <p style="font-size: 14px; line-height: 1.6; color: #333; white-space: pre-line;">${body}</p>
          </div>
        `,
        text: body,
      });

      const emailEvent: CandidateEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: params.workspaceId,
        candidate_id: params.candidateId,
        event_type: "rejection_email_sent",
        actor_id: user.id,
        actor_name: member.full_name,
        notes: `Rejection email dispatched to ${cand.email}`,
        created_at: new Date().toISOString(),
      };
      recruitmentStore.saveCandidateEvent(emailEvent);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 5. INTERVIEW CONFLICT DETECTION ────────────────────────────────────────

export async function checkInterviewConflictsAction(params: {
  workspaceId: string;
  interviewerIds: string[];
  scheduledAt: string;
  durationMinutes: number;
  excludeInterviewId?: string;
}): Promise<{
  hasConflict: boolean;
  conflicts: Array<{
    interviewerId: string;
    title: string;
    scheduledAt: string;
  }>;
}> {
  try {
    const targetStart = new Date(params.scheduledAt).getTime();
    const targetEnd = targetStart + (params.durationMinutes || 45) * 60 * 1000;

    const existingInterviews = recruitmentStore
      .getInterviews(params.workspaceId)
      .filter(
        (i) =>
          i.id !== params.excludeInterviewId &&
          (i.status.toLowerCase() === "scheduled" || i.status.toLowerCase() === "rescheduled")
      );

    const conflicts: Array<{ interviewerId: string; title: string; scheduledAt: string }> = [];

    for (const iv of existingInterviews) {
      const ivStart = new Date(iv.scheduled_at).getTime();
      const ivEnd = ivStart + (iv.duration_minutes || 45) * 60 * 1000;

      // Overlap check: start < targetEnd && end > targetStart
      const overlaps = ivStart < targetEnd && ivEnd > targetStart;
      if (overlaps) {
        const assignedIds = iv.interviewer_ids || (iv.interviewer_id ? [iv.interviewer_id] : []);
        for (const reqInterviewer of params.interviewerIds) {
          if (assignedIds.includes(reqInterviewer)) {
            conflicts.push({
              interviewerId: reqInterviewer,
              title: `${iv.round_name} (${iv.candidate?.full_name || "Interview"})`,
              scheduledAt: iv.scheduled_at,
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  } catch {
    return { hasConflict: false, conflicts: [] };
  }
}

// ─── 6. INTERVIEW SCHEDULING WITH CALENDAR & RESEND .ICS ────────────────────

export async function scheduleInterviewAction(params: {
  workspaceId: string;
  applicationId: string;
  candidateId: string;
  jobOpeningId: string;
  roundName: string;
  interviewType?: InterviewType;
  interviewerIds: string[];
  interviewerNames?: string[];
  scheduledAt: string;
  durationMinutes?: number;
  timezone?: string;
  candidateTimezone?: string;
  location?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
}): Promise<ActionResult<Interview>> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    await requirePermission("interviews:schedule", { workspaceId: params.workspaceId }, user.id);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand) return { success: false, error: "Candidate not found." };

    const job = recruitmentStore.getJobOpeningById(params.jobOpeningId, params.workspaceId);

    const duration = params.durationMinutes || 45;
    const tz = params.timezone || "Asia/Dhaka";
    const candTz = params.candidateTimezone || "Asia/Dhaka";
    const nowIso = new Date().toISOString();
    const interviewId = `iv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const icsUid = `ropimo-interview-${interviewId}@ropimo.com`;

    const interview: Interview = {
      id: interviewId,
      workspace_id: params.workspaceId,
      application_id: params.applicationId,
      candidate_id: params.candidateId,
      job_opening_id: params.jobOpeningId,
      title: `${params.roundName} with ${cand.full_name}`,
      round_name: params.roundName.trim(),
      interview_type: params.interviewType || "video",
      interviewer_ids: params.interviewerIds,
      interviewer_names: params.interviewerNames || [member.full_name],
      scheduled_at: new Date(params.scheduledAt).toISOString(),
      duration_minutes: duration,
      timezone: tz,
      candidate_timezone: candTz,
      location: params.location?.trim() || null,
      meeting_url: params.meetingUrl?.trim() || null,
      location_or_link: params.meetingUrl?.trim() || params.location?.trim() || "Google Meet",
      status: "scheduled",
      notes: params.notes?.trim() || null,
      ics_uid: icsUid,
      ics_sequence: 0,
      created_by: user.id,
      created_at: nowIso,
      updated_at: nowIso,
      candidate: cand,
      job_opening: job || undefined,
    };

    // 1. Save to store
    recruitmentStore.saveInterview(interview);

    // 2. Move candidate to "interview" stage if not already there
    await updateCandidateStageAction({
      workspaceId: params.workspaceId,
      candidateId: params.candidateId,
      applicationId: params.applicationId,
      toStage: "interview",
      note: `Interview scheduled: ${interview.round_name}`,
    });

    // Record candidate_events for interview scheduled
    const ivEventId = `ev-iv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ivEvent: CandidateEvent = {
      id: ivEventId,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      event_type: "interview_scheduled",
      created_by: user.id,
      notes: `Scheduled interview: ${interview.round_name}`,
      created_at: nowIso,
      metadata: {
        application_id: params.applicationId,
        interview_id: interview.id,
        round_name: interview.round_name,
        scheduled_at: interview.scheduled_at,
        created_by_name: member.full_name,
      },
    };
    recruitmentStore.addCandidateEvent(ivEvent);
    try {
      await adminClient.from("candidate_events").insert({
        id: ivEventId,
        workspace_id: params.workspaceId,
        candidate_id: params.candidateId,
        application_id: params.applicationId,
        event_type: "interview_scheduled",
        created_by: user.id,
        notes: ivEvent.notes,
        metadata: ivEvent.metadata,
      });
    } catch {}

    // 3. Create calendar_events for interviewers
    try {
      const calEventId = `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await adminClient.from("calendar_events").insert({
        id: calEventId,
        workspace_id: params.workspaceId,
        title: `Interview: ${cand.full_name} (${interview.round_name})`,
        description: `Candidate: ${cand.full_name}\nRole: ${job?.title || "Role"}\nNotes: ${interview.notes || "None"}`,
        start_date: interview.scheduled_at,
        end_date: new Date(new Date(interview.scheduled_at).getTime() + duration * 60 * 1000).toISOString(),
        event_type: "Interview",
        location: interview.location_or_link,
        created_by: user.id,
      });
      interview.calendar_event_id = calEventId;
    } catch {}

    // 4. Generate RFC 5545 .ics content
    const icsContent = generateIcsContent({
      uid: icsUid,
      sequence: 0,
      title: `Interview: ${cand.full_name} — ${job?.title || "Open Role"}`,
      description: `Interview for ${job?.title || "Position"}\nRound: ${interview.round_name}\nMeeting: ${interview.location_or_link}`,
      location: interview.location_or_link || "Online",
      startDate: new Date(interview.scheduled_at),
      durationMinutes: duration,
      status: "CONFIRMED",
      method: "REQUEST",
      organizerName: "Ropimo Recruitment Team",
      organizerEmail: "hr@ropimo.com",
      attendees: [
        { name: cand.full_name, email: cand.email, role: "REQ-PARTICIPANT" },
      ],
    });

    // 5. Send Resend Confirmation Emails
    const { fullStr: dateInDhaka } = formatInterviewDateTime(interview.scheduled_at, tz);
    const { fullStr: dateInCandTz } = formatInterviewDateTime(interview.scheduled_at, candTz);

    // Email to candidate with attached .ics
    try {
      await sendEmail({
        to: cand.email,
        workspaceId: params.workspaceId,
        fromName: "Ropimo Recruitment Team",
        replyTo: "hr@ropimo.com",
        template: "interview_invitation",
        subject: `Interview Invitation: ${interview.round_name} with Ropimo`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
            <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Interview Scheduled</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 16px;">
              Hello ${cand.full_name},<br/>
              Your interview for <strong>${job?.title || "the position"}</strong> has been scheduled.
            </p>
            <div style="background: #F6F4EC; border: 1px solid #E5E2D6; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.8;">
              <div><strong>Round:</strong> ${interview.round_name}</div>
              <div><strong>Your Timezone (${candTz}):</strong> ${dateInCandTz}</div>
              <div><strong>Company Timezone (${tz}):</strong> ${dateInDhaka}</div>
              <div><strong>Duration:</strong> ${duration} minutes</div>
              <div><strong>Meeting link/Location:</strong> ${interview.location_or_link || "Provided by interviewer"}</div>
            </div>
            <p style="font-size: 13px; color: #555;">
              A calendar invitation (.ics) is attached to this email. If you need to reschedule or have questions, please reply directly to this email.
            </p>
          </div>
        `,
        text: `Interview Scheduled: ${interview.round_name}\nCandidate Timezone (${candTz}): ${dateInCandTz}\nCompany Timezone (${tz}): ${dateInDhaka}\nDuration: ${duration} mins\nMeeting: ${interview.location_or_link || "Online"}`,
        attachments: [
          {
            filename: `interview-${interview.id}.ics`,
            content: icsContent,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
      });
    } catch (e) {
      console.warn("[Interview Schedule Email Warning]:", e);
    }

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: interview };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || "Failed to schedule interview." };
  }
}

export async function rescheduleInterviewAction(params: {
  workspaceId: string;
  interviewId: string;
  scheduledAt: string;
  durationMinutes?: number;
  timezone?: string;
  notes?: string;
  reason?: string;
}): Promise<ActionResult<Interview>> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const iv = recruitmentStore.getInterviewById(params.interviewId, params.workspaceId);
    if (!iv) return { success: false, error: "Interview not found." };

    const cand = recruitmentStore.getCandidateById(iv.candidate_id, params.workspaceId);
    const duration = params.durationMinutes || iv.duration_minutes || 45;
    const newSeq = (iv.ics_sequence || 0) + 1;
    const nowIso = new Date().toISOString();

    iv.scheduled_at = new Date(params.scheduledAt).toISOString();
    iv.duration_minutes = duration;
    iv.ics_sequence = newSeq;
    iv.status = "scheduled";
    iv.updated_at = nowIso;
    if (params.notes) iv.notes = params.notes;

    recruitmentStore.saveInterview(iv);

    // Update .ics with higher sequence
    const icsContent = generateIcsContent({
      uid: iv.ics_uid || `ropimo-interview-${iv.id}@ropimo.com`,
      sequence: newSeq,
      title: `[Updated] Interview: ${cand?.full_name || "Candidate"}`,
      description: `Rescheduled interview.\nNotes: ${params.notes || iv.notes || "None"}`,
      location: iv.location_or_link || "Online",
      startDate: new Date(iv.scheduled_at),
      durationMinutes: duration,
      status: "CONFIRMED",
      method: "REQUEST",
    });

    if (cand?.email) {
      const { fullStr: dateStr } = formatInterviewDateTime(iv.scheduled_at, iv.timezone || "Asia/Dhaka");
      await sendEmail({
        to: cand.email,
        workspaceId: params.workspaceId,
        fromName: "Ropimo Recruitment Team",
        replyTo: "hr@ropimo.com",
        template: "interview_rescheduled",
        subject: `Updated Time: Interview for ${iv.round_name}`,
        html: `<p>Your interview has been rescheduled to <strong>${dateStr}</strong>.</p>`,
        text: `Your interview has been rescheduled to ${dateStr}.`,
        attachments: [
          {
            filename: `interview-${iv.id}.ics`,
            content: icsContent,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
      });
    }

    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: iv.candidate_id,
      event_type: "interview_rescheduled",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: `Interview rescheduled to ${new Date(iv.scheduled_at).toLocaleString()}`,
      created_at: nowIso,
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${iv.candidate_id}`);
    } catch {}

    return { success: true, data: iv };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function cancelInterviewAction(params: {
  workspaceId: string;
  interviewId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const { user, member } = await verifyUserAndRole(params.workspaceId);

    const iv = recruitmentStore.getInterviewById(params.interviewId, params.workspaceId);
    if (!iv) return { success: false, error: "Interview not found." };

    const cand = recruitmentStore.getCandidateById(iv.candidate_id, params.workspaceId);
    const newSeq = (iv.ics_sequence || 0) + 1;
    const nowIso = new Date().toISOString();

    iv.status = "cancelled";
    iv.ics_sequence = newSeq;
    iv.updated_at = nowIso;
    recruitmentStore.saveInterview(iv);

    // Cancel .ics with METHOD:CANCEL, STATUS:CANCELLED
    const icsContent = generateIcsContent({
      uid: iv.ics_uid || `ropimo-interview-${iv.id}@ropimo.com`,
      sequence: newSeq,
      title: `[Cancelled] Interview: ${iv.round_name}`,
      startDate: new Date(iv.scheduled_at),
      durationMinutes: iv.duration_minutes || 45,
      status: "CANCELLED",
      method: "CANCEL",
    });

    if (cand?.email) {
      await sendEmail({
        to: cand.email,
        workspaceId: params.workspaceId,
        fromName: "Ropimo Recruitment Team",
        replyTo: "hr@ropimo.com",
        template: "interview_cancelled",
        subject: `Cancelled: Interview for ${iv.round_name}`,
        html: `<p>Your interview for ${iv.round_name} has been cancelled. Reason: ${params.reason || "Scheduling update"}</p>`,
        text: `Your interview for ${iv.round_name} has been cancelled. Reason: ${params.reason || "Scheduling update"}`,
        attachments: [
          {
            filename: `interview-${iv.id}-cancelled.ics`,
            content: icsContent,
            contentType: "text/calendar; charset=utf-8; method=CANCEL",
          },
        ],
      });
    }

    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: iv.candidate_id,
      event_type: "interview_cancelled",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: `Interview cancelled: ${params.reason || "Cancelled"}`,
      created_at: nowIso,
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${iv.candidate_id}`);
    } catch {}

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 7. INTERVIEW SCORECARDS ────────────────────────────────────────────────

export async function submitInterviewScorecardAction(params: {
  workspaceId: string;
  interviewId: string;
  candidateId: string;
  skillsRating: number; // 1-5
  communicationRating: number; // 1-5
  cultureRating: number; // 1-5
  recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  comments?: string;
}): Promise<ActionResult<InterviewFeedback>> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    const iv = recruitmentStore.getInterviewById(params.interviewId, params.workspaceId);
    if (!iv) return { success: false, error: "Interview not found." };

    const nowIso = new Date().toISOString();
    const skills = Math.max(1, Math.min(5, Math.round(params.skillsRating)));
    const comms = Math.max(1, Math.min(5, Math.round(params.communicationRating)));
    const culture = Math.max(1, Math.min(5, Math.round(params.cultureRating)));
    const overall = Math.round((skills + comms + culture) / 3);

    const feedback: InterviewFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      interview_id: params.interviewId,
      application_id: iv.application_id,
      candidate_id: params.candidateId,
      interviewer_id: user.id,
      interviewer_name: member.full_name,
      skills_rating: skills,
      technical_skills_rating: skills,
      communication_rating: comms,
      culture_rating: culture,
      culture_fit_rating: culture,
      overall_rating: overall,
      recommendation: params.recommendation,
      comments: params.comments?.trim() || null,
      notes: params.comments?.trim() || null,
      submitted_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    recruitmentStore.saveFeedback(feedback);

    // If all assigned interviewers have now submitted scorecards, set interview status to completed
    const allFb = recruitmentStore.getFeedback(iv.id, params.workspaceId);
    const assignedIds = iv.interviewer_ids || (iv.interviewer_id ? [iv.interviewer_id] : [user.id]);
    const allSubmitted = assignedIds.every((id) => allFb.some((f) => f.interviewer_id === id));
    if (allSubmitted || iv.status === "scheduled") {
      iv.status = "completed";
      iv.updated_at = nowIso;
      recruitmentStore.saveInterview(iv);
    }

    try {
      await adminClient.from("interview_feedback").upsert({
        id: feedback.id,
        workspace_id: feedback.workspace_id,
        interview_id: feedback.interview_id,
        application_id: feedback.application_id,
        candidate_id: feedback.candidate_id,
        interviewer_id: feedback.interviewer_id,
        skills_rating: skills,
        technical_skills_rating: skills,
        communication_rating: comms,
        culture_rating: culture,
        culture_fit_rating: culture,
        overall_rating: overall,
        recommendation: params.recommendation,
        comments: feedback.comments,
        notes: feedback.notes,
        submitted_at: nowIso,
      });

      if (iv.status === "completed") {
        await adminClient
          .from("interviews")
          .update({ status: "completed", updated_at: nowIso })
          .eq("id", iv.id)
          .eq("workspace_id", params.workspaceId);
      }
    } catch {}

    const event: CandidateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      candidate_id: params.candidateId,
      event_type: "scorecard_submitted",
      actor_id: user.id,
      actor_name: member.full_name,
      notes: `Scorecard submitted by ${member.full_name}: ${params.recommendation.replace("_", " ")} (${overall}/5)`,
      created_at: nowIso,
    };
    recruitmentStore.saveCandidateEvent(event);

    try {
      revalidatePath("/app/people");
      revalidatePath("/app/people/interviews");
      revalidatePath(`/app/people/candidates/${params.candidateId}`);
    } catch {}

    return { success: true, data: feedback };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 8. RESUME SIGNED URL GENERATION ────────────────────────────────────────

export async function getResumeSignedUrlAction(params: {
  workspaceId: string;
  candidateId: string;
}): Promise<ActionResult<{ url: string }>> {
  try {
    const { user } = await verifyUserAndRole(params.workspaceId);

    const cand = recruitmentStore.getCandidateById(params.candidateId, params.workspaceId);
    if (!cand || !cand.cv_storage_key) {
      return { success: false, error: "Resume not found for this candidate." };
    }

    // Return the authorized API storage endpoint
    const url = `/api/storage/${cand.cv_storage_key}`;
    return { success: true, data: { url } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
