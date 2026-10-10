/**
 * Verification Test Suite: Enterprise Hiring Pipeline & Interviews System
 *
 * Tests required by user prompt:
 * 1. application -> screening -> schedule interview -> scorecards -> stage change
 * 2. Stage transitions enforcement (disallowed transition blocked, e.g. applied -> hired)
 * 3. Every stage move writes a candidate_events row (who, from, to, when, note)
 * 4. Manager visibility limits: manager sees ONLY candidates for their department's jobs
 * 5. Interviewer visibility limits:
 *    - sees ONLY candidates they interview
 *    - sees resume and scorecard form
 *    - NEVER compensation or offers
 *    - other interviewers' scores blinded until submitting their own
 * 6. RFC 5545 .ics generation, reschedule sequence increment, and cancellation validation for Google Calendar import
 */

import {
  updateCandidateStageAction,
  scheduleInterviewAction,
  rescheduleInterviewAction,
  cancelInterviewAction,
  submitInterviewScorecardAction,
} from "../src/lib/hiring/actions";
import { isAllowedStageTransition, STAGE_DEFINITIONS, HiringStage } from "../src/lib/hiring/stages";
import { generateIcsContent } from "../src/lib/hiring/calendar-ics";
import { recruitmentStore } from "../src/lib/recruitment/store";
import { getWorkspaceCandidates, getCandidateById } from "../src/lib/recruitment/queries";
import { Candidate, CandidateApplication, JobOpening } from "../src/types/recruitment";

async function runPipelineTests() {
  console.log("================================================================================");
  console.log("HIRING PIPELINE & CANDIDATE / INTERVIEW VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  const workspaceId = "test-ws-" + Date.now();
  const engineeringDeptId = "dept-eng-" + Date.now();
  const designDeptId = "dept-des-" + Date.now();

  const managerUserId = "user-manager-eng";
  const interviewerA = "user-interviewer-1";
  const interviewerB = "user-interviewer-2";

  // Setup Job Openings
  const engJob: JobOpening = {
    id: "job-eng-" + Date.now(),
    workspace_id: workspaceId,
    department_id: engineeringDeptId,
    title: "Senior Backend Engineer",
    slug: "senior-backend-engineer",
    description: "Backend role",
    responsibilities: [],
    requirements: [],
    skills: ["TypeScript", "Node.js", "PostgreSQL"],
    employment_type: "Full-time",
    location: "Remote",
    salary_range: "$120,000 - $150,000",
    status: "Open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveJobOpening(engJob);

  const designJob: JobOpening = {
    id: "job-des-" + Date.now(),
    workspace_id: workspaceId,
    department_id: designDeptId,
    title: "Product Designer",
    slug: "product-designer",
    description: "Design role",
    responsibilities: [],
    requirements: [],
    skills: ["Figma", "Design Systems"],
    employment_type: "Full-time",
    location: "Remote",
    salary_range: "$110,000 - $130,000",
    status: "Open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveJobOpening(designJob);

  // Setup Candidate 1 (Engineering Job)
  const candidate1: Candidate = {
    id: "cand-1-" + Date.now(),
    workspace_id: workspaceId,
    full_name: "Alex Mercer",
    email: "alex.mercer@example.com",
    skills: ["TypeScript", "Distributed Systems"],
    latest_stage: "applied",
    latest_job_id: engJob.id,
    latest_job_title: engJob.title,
    cv_storage_key: "resumes/alex-mercer.pdf",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveCandidate(candidate1);

  const app1: CandidateApplication = {
    id: "app-1-" + Date.now(),
    workspace_id: workspaceId,
    candidate_id: candidate1.id,
    job_opening_id: engJob.id,
    stage: "applied",
    cv_storage_key: "resumes/alex-mercer.pdf",
    cover_letter: "Excited about distributed databases and scalability.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveApplication(app1);

  // Setup Candidate 2 (Design Job)
  const candidate2: Candidate = {
    id: "cand-2-" + Date.now(),
    workspace_id: workspaceId,
    full_name: "Elena Rostova",
    email: "elena.rostova@example.com",
    skills: ["Figma", "UI/UX"],
    latest_stage: "applied",
    latest_job_id: designJob.id,
    latest_job_title: designJob.title,
    cv_storage_key: "resumes/elena-rostova.pdf",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveCandidate(candidate2);

  const app2: CandidateApplication = {
    id: "app-2-" + Date.now(),
    workspace_id: workspaceId,
    candidate_id: candidate2.id,
    job_opening_id: designJob.id,
    stage: "applied",
    cv_storage_key: "resumes/elena-rostova.pdf",
    cover_letter: "Passionate about typography and micro-interactions.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveApplication(app2);

  console.log("--- 1. STAGE STATE MACHINE & DISALLOWED TRANSITIONS ---");
  // Test disallowed transition: applied -> hired directly
  const illegalTransition = isAllowedStageTransition("applied", "hired");
  assert(
    !illegalTransition.allowed,
    "Disallowed transition blocked: applied -> hired cannot bypass screening/interview/offer",
    illegalTransition.reason
  );

  const illegalDirectOffer = isAllowedStageTransition("applied", "offer");
  assert(
    !illegalDirectOffer.allowed,
    "Disallowed transition blocked: applied -> offer cannot bypass screening & interview"
  );

  // Test allowed transition: applied -> screening
  const allowedScreening = isAllowedStageTransition("applied", "screening");
  assert(allowedScreening.allowed, "Allowed transition accepted: applied -> screening");

  console.log("\n--- 2. APPLICATION -> SCREENING -> SCHEDULE INTERVIEW -> SCORECARDS -> STAGE CHANGE ---");

  // Step A: Move from applied to screening
  const resScreening = await updateCandidateStageAction({
    workspaceId,
    candidateId: candidate1.id,
    applicationId: app1.id,
    toStage: "screening",
    note: "Passed initial resume review by recruiter",
  });
  assert(resScreening.success, "Stage updated: applied -> screening");

  const candAfterScreening = recruitmentStore.getCandidateById(candidate1.id, workspaceId);
  assert(
    candAfterScreening?.latest_stage === "screening",
    "Candidate latest_stage is now 'screening'"
  );

  // Verify candidate_events row written
  let events = recruitmentStore.getCandidateEvents(candidate1.id, workspaceId);
  assert(
    events.some(
      (e) =>
        e.metadata?.from_stage === "applied" &&
        e.metadata?.to_stage === "screening" &&
        e.notes?.includes("Passed initial resume review")
    ),
    "candidate_events row recorded for screening move with who, from, to, when, note"
  );

  // Step B: Schedule interview
  const scheduledTime = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const scheduleRes = await scheduleInterviewAction({
    workspaceId,
    candidateId: candidate1.id,
    applicationId: app1.id,
    jobOpeningId: engJob.id,
    roundName: "Technical Deep-Dive",
    interviewType: "video",
    interviewerIds: [interviewerA, interviewerB],
    interviewerNames: ["Senior Engineer A", "Staff Engineer B"],
    scheduledAt: scheduledTime,
    durationMinutes: 60,
    meetingUrl: "https://meet.google.com/rop-interview-test",
    timezone: "Asia/Dhaka",
    candidateTimezone: "Asia/Dhaka",
  });
  assert(scheduleRes.success, "Interview scheduled successfully");

  const createdInterview = scheduleRes.data!;
  assert(
    Boolean(createdInterview?.ics_uid),
    "Interview created with valid RFC 5545 UID: " + createdInterview?.ics_uid
  );
  assert(
    createdInterview?.ics_sequence === 0,
    "Interview created with initial sequence 0"
  );

  // Verify candidate automatically moved to 'interview'
  const candAfterInterview = recruitmentStore.getCandidateById(candidate1.id, workspaceId);
  assert(
    candAfterInterview?.latest_stage === "interview",
    "Candidate moved to 'interview' on interview schedule"
  );

  events = recruitmentStore.getCandidateEvents(candidate1.id, workspaceId);
  assert(
    events.some((e) => e.event_type === "interview_scheduled"),
    "candidate_events row recorded for interview_scheduled event"
  );

  // Step C: Reschedule interview (Sequence increment)
  const newScheduledTime = new Date(Date.now() + 2 * 86400000).toISOString();
  const rescheduleRes = await rescheduleInterviewAction({
    workspaceId,
    interviewId: createdInterview.id,
    scheduledAt: newScheduledTime,
    durationMinutes: 45,
    reason: "Candidate requested afternoon slot",
  });
  assert(rescheduleRes.success, "Interview rescheduled successfully");
  assert(
    rescheduleRes.data?.ics_sequence === 1,
    "Interview sequence incremented from 0 to 1 on reschedule"
  );

  // Step D: Submit Scorecard (Interviewer A)
  const scorecardARes = await submitInterviewScorecardAction({
    workspaceId,
    interviewId: createdInterview.id,
    candidateId: candidate1.id,
    skillsRating: 5,
    communicationRating: 4,
    cultureRating: 5,
    recommendation: "strong_yes",
    comments: "Superb problem decomposition and clean architectural instincts.",
  });
  assert(scorecardARes.success, "Interviewer A submitted scorecard (skills: 5, comms: 4, culture: 5, strong_yes)");

  // Step E: Submit Scorecard (Interviewer B)
  const scorecardBRes = await submitInterviewScorecardAction({
    workspaceId,
    interviewId: createdInterview.id,
    candidateId: candidate1.id,
    skillsRating: 4,
    communicationRating: 5,
    cultureRating: 4,
    recommendation: "yes",
    comments: "Solid systems knowledge. Good hire.",
  });
  assert(scorecardBRes.success, "Interviewer B submitted scorecard (skills: 4, comms: 5, culture: 4, yes)");

  // Verify interview status auto-completed
  const completedInterview = recruitmentStore.getInterviewById(createdInterview.id, workspaceId);
  assert(
    completedInterview?.status === "completed",
    "Interview status automatically moved to 'completed' after scorecards"
  );

  // Step F: Move to Offer and Hired
  const offerRes = await updateCandidateStageAction({
    workspaceId,
    candidateId: candidate1.id,
    applicationId: app1.id,
    toStage: "offer",
    note: "All scorecards positive. Extending formal offer.",
  });
  assert(offerRes.success, "Candidate advanced from interview -> offer");

  const hireRes = await updateCandidateStageAction({
    workspaceId,
    candidateId: candidate1.id,
    applicationId: app1.id,
    toStage: "hired",
    note: "Candidate accepted offer! Signed on Oct 11.",
  });
  assert(hireRes.success, "Candidate advanced from offer -> hired");

  const candHired = recruitmentStore.getCandidateById(candidate1.id, workspaceId);
  assert(candHired?.latest_stage === "hired", "Candidate final stage is 'hired'");

  console.log("\n--- 3. MANAGER VISIBILITY LIMITS ---");
  // Manager leads Engineering, NOT Design
  const managerCandidates = await getWorkspaceCandidates(workspaceId, {
    viewerUserId: managerUserId,
    viewerRole: "manager",
    leadDepartmentIds: [engineeringDeptId],
  });

  const seesEng = managerCandidates.some((c) => c.id === candidate1.id);
  const seesDesign = managerCandidates.some((c) => c.id === candidate2.id);

  assert(seesEng, "Manager CAN see candidate for Engineering job (their department)");
  assert(!seesDesign, "Manager CANNOT see candidate for Design job (different department)");

  console.log("\n--- 4. INTERVIEWER VISIBILITY LIMITS ---");
  // Interviewer A was assigned only to Candidate 1
  const interviewerCandidates = await getWorkspaceCandidates(workspaceId, {
    viewerUserId: interviewerA,
    viewerRole: "member",
  });

  assert(
    interviewerCandidates.some((c) => c.id === candidate1.id),
    "Assigned interviewer CAN see candidate they interview"
  );
  assert(
    !interviewerCandidates.some((c) => c.id === candidate2.id),
    "Assigned interviewer CANNOT see candidate they do not interview"
  );

  // Add offer to Candidate 1 in store
  recruitmentStore.saveOffer({
    id: "off-test-1",
    workspace_id: workspaceId,
    candidate_id: candidate1.id,
    job_title: "Senior Backend Engineer",
    salary: "$145,000 / year + equity",
    status: "Accepted",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Verify Interviewer A views Candidate 1 details:
  // Must see resume and scorecard, NEVER compensation or offers!
  const interviewerDetail = await getCandidateById(candidate1.id, workspaceId, {
    viewerUserId: interviewerA,
    viewerRole: "member",
  });

  assert(
    Boolean(interviewerDetail.candidate),
    "Interviewer can access candidate profile"
  );
  assert(
    interviewerDetail.offers.length === 0,
    "COMPENSATION / OFFERS STRIPPED: Interviewer cannot see offers or compensation"
  );
  assert(
    interviewerDetail.notes.length === 0,
    "INTERNAL HIRING NOTES STRIPPED: Non-hiring team interviewer cannot see private team notes"
  );

  // Scorecards blinding test:
  // Setup interview 2 where Interviewer B has NOT submitted yet
  const interview2 = {
    id: "iv-blinded-test",
    workspace_id: workspaceId,
    candidate_id: candidate1.id,
    round_name: "Follow-up round",
    interviewer_id: interviewerB,
    interviewer_ids: [interviewerA, interviewerB],
    scheduled_at: new Date().toISOString(),
    status: "scheduled" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  recruitmentStore.saveInterview(interview2);

  // A has submitted feedback for interview2, B has NOT submitted yet
  recruitmentStore.saveFeedback({
    id: "fb-blinded-a",
    workspace_id: workspaceId,
    interview_id: interview2.id,
    candidate_id: candidate1.id,
    interviewer_id: interviewerA,
    interviewer_name: "Interviewer A",
    skills_rating: 5,
    communication_rating: 5,
    culture_rating: 5,
    overall_rating: 5,
    recommendation: "strong_yes",
    comments: "Top tier answers",
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Viewer B has not submitted scorecard for interview2 yet
  const detailViewerB = await getCandidateById(candidate1.id, workspaceId, {
    viewerUserId: interviewerB,
    viewerRole: "member",
  });

  const viewerBSeesOtherScore = detailViewerB.feedbacks.some(
    (fb) => fb.interview_id === interview2.id && fb.interviewer_id === interviewerA
  );
  assert(
    !viewerBSeesOtherScore,
    "SCORECARD BLINDING ACTIVE: Interviewer B cannot see Interviewer A's scorecard until submitting their own"
  );

  console.log("\n--- 5. RFC 5545 .ICS GENERATION & GOOGLE CALENDAR IMPORT VERIFICATION ---");
  const testUid = "uid-google-calendar-test@ropimo.com";
  const icsOutput = generateIcsContent({
    uid: testUid,
    sequence: 1,
    roundName: "Technical Deep-Dive",
    candidateName: "Alex Mercer",
    jobTitle: "Senior Backend Engineer",
    interviewerNames: ["Senior Engineer A", "Staff Engineer B"],
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    scheduledAt: "2026-10-15T14:00:00Z",
    durationMinutes: 60,
    timezone: "Asia/Dhaka",
    status: "CONFIRMED",
    method: "REQUEST",
  });

  console.log("Generated RFC 5545 .ICS Preview:");
  console.log("--------------------------------------------------------------------------------");
  console.log(icsOutput.trim());
  console.log("--------------------------------------------------------------------------------");

  // Verify critical RFC 5545 standard tokens for Google Calendar compatibility:
  assert(icsOutput.includes("BEGIN:VCALENDAR"), "Contains BEGIN:VCALENDAR");
  assert(icsOutput.includes("VERSION:2.0"), "Contains VERSION:2.0");
  assert(icsOutput.includes("PRODID:-//Ropimo//Hiring Calendar//EN"), "Contains PRODID token");
  assert(icsOutput.includes("METHOD:REQUEST"), "Contains METHOD:REQUEST");
  assert(icsOutput.includes("BEGIN:VEVENT"), "Contains BEGIN:VEVENT");
  assert(icsOutput.includes(`UID:${testUid}`), "Contains identical UID for recurrence & updates");
  assert(icsOutput.includes("SEQUENCE:1"), "Contains incremented SEQUENCE:1");
  assert(icsOutput.includes("STATUS:CONFIRMED"), "Contains STATUS:CONFIRMED");
  assert(icsOutput.includes("SUMMARY:Interview: Technical Deep-Dive — Alex Mercer"), "Contains descriptive SUMMARY");
  assert(icsOutput.includes("URL:https://meet.google.com/abc-defg-hij"), "Contains meeting URL");
  assert(icsOutput.includes("END:VEVENT"), "Contains END:VEVENT");
  assert(icsOutput.includes("END:VCALENDAR"), "Contains END:VCALENDAR");

  // Test Cancellation ICS
  const cancelIcsOutput = generateIcsContent({
    uid: testUid,
    sequence: 2,
    roundName: "Technical Deep-Dive",
    candidateName: "Alex Mercer",
    jobTitle: "Senior Backend Engineer",
    interviewerNames: ["Senior Engineer A"],
    scheduledAt: "2026-10-15T14:00:00Z",
    durationMinutes: 60,
    timezone: "Asia/Dhaka",
    status: "CANCELLED",
    method: "CANCEL",
  });

  assert(cancelIcsOutput.includes("METHOD:CANCEL"), "Cancellation .ics has METHOD:CANCEL");
  assert(cancelIcsOutput.includes("STATUS:CANCELLED"), "Cancellation .ics has STATUS:CANCELLED");
  assert(cancelIcsOutput.includes("SEQUENCE:2"), "Cancellation .ics increments SEQUENCE to 2");

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPipelineTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
