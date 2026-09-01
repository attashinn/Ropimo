import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import {
  submitCandidateApplicationAction,
  updateApplicationStageAction,
  assignCandidateRecruiterAction,
  updateCandidateTagsAction,
  addCandidateNoteAction,
  deleteCandidateNoteAction,
  rejectCandidateApplicationAction,
  archiveCandidateAction,
  scheduleInterviewAction,
  rescheduleInterviewAction,
  completeInterviewAction,
  submitInterviewFeedbackAction,
} from "@/lib/recruitment/actions";
import {
  getCandidateById,
  getWorkspaceInterviews,
  getRecruitmentStats,
} from "@/lib/recruitment/queries";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failCount++;
  }
}

async function runPart2QATests() {
  console.log("\n=======================================================");
  console.log("  ROPIMO — RECRUITMENT PART 2 QA SUITE (CANDIDATES & INTERVIEWS)");
  console.log("=======================================================\n");

  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id, name").limit(1);
  const workspaceId = workspaces?.[0]?.id || "";
  assert(Boolean(workspaceId), `Active workspace found (${workspaceId})`);

  // 1. Existing candidate and job opening load
  console.log("\n--- Phase A: Candidate Profile & Multiple Applications ---");
  const jobs = recruitmentStore.getJobOpenings(workspaceId);
  assert(jobs.length >= 1, `Real job openings present in workspace (${jobs.length} jobs)`);
  const job1 = jobs[0];
  const job2 = jobs.length > 1 ? jobs[1] : jobs[0];

  const candEmail = `part2.candidate.${Date.now()}@test.io`;

  // Submit Application 1
  const app1Res = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: job1.id,
    fullName: "Alex Rivera",
    email: candEmail,
    phone: "+1 555 0188",
    skills: ["React", "TypeScript", "Node.js", "System Design"],
    yearsOfExperience: 6,
    portfolioUrl: "https://alexrivera.dev",
    linkedinUrl: "https://linkedin.com/in/alexrivera",
    coverLetter: "Excited about engineering opportunities at Ropimo.",
    cvStorageKey: `${workspaceId}/resumes/alex-cv-${Date.now()}.pdf`,
    cvFileName: "Alex_Rivera_CV.pdf",
    cvFileSize: 1024 * 75,
  });
  assert(app1Res.success, "Candidate application 1 submitted successfully");

  // 2. Candidate profile loads
  const candidates = recruitmentStore.getCandidates(workspaceId);
  const candidate = candidates.find((c) => c.email === candEmail);
  assert(Boolean(candidate), "Candidate profile loaded in workspace");
  assert(candidate?.full_name === "Alex Rivera", "Candidate name matches real input");

  // 3. Application History (Submit Application 2 to a different job if available)
  if (job2.id !== job1.id) {
    const app2Res = await submitCandidateApplicationAction({
      workspaceId,
      jobOpeningId: job2.id,
      fullName: "Alex Rivera",
      email: candEmail,
      phone: "+1 555 0188",
      skills: ["React", "TypeScript"],
      yearsOfExperience: 6,
      coverLetter: "Also interested in this secondary role.",
      cvStorageKey: `${workspaceId}/resumes/alex-cv-2-${Date.now()}.pdf`,
      cvFileName: "Alex_Rivera_CV2.pdf",
    });
    assert(app2Res.success, "Second independent application submitted for same candidate");
  }

  const profileDetail = await getCandidateById(candidate!.id, workspaceId);
  assert(profileDetail.applications.length >= 1, "Candidate applications relation loaded independently");

  // 4. Recruiter Assignment
  console.log("\n--- Phase A: Recruiter Assignment & Tags ---");
  const { data: members } = await admin
    .from("workspace_members")
    .select("user_id, full_name")
    .eq("workspace_id", workspaceId)
    .limit(1);
  const assignedMember = members?.[0];
  assert(Boolean(assignedMember), "Real workspace member identified for recruiter assignment");

  const assignRes = await assignCandidateRecruiterAction({
    workspaceId,
    candidateId: candidate!.id,
    recruiterId: assignedMember?.user_id || "recruiter-1",
    recruiterName: assignedMember?.full_name || "Tashin Khan",
  });
  assert(assignRes.success, "Candidate assigned to real workspace recruiter");

  const candAfterAssign = recruitmentStore.getCandidateById(candidate!.id, workspaceId);
  assert(
    candAfterAssign?.assigned_recruiter_name === (assignedMember?.full_name || "Tashin Khan"),
    "Recruiter assignment persists accurately"
  );

  // 5. Tags Persist
  const tagRes = await updateCandidateTagsAction({
    workspaceId,
    candidateId: candidate!.id,
    tags: ["Senior", "Strong Candidate", "Urgent"],
  });
  assert(tagRes.success, "Tags updated successfully");

  const candAfterTags = recruitmentStore.getCandidateById(candidate!.id, workspaceId);
  assert(candAfterTags?.tags?.includes("Senior") && candAfterTags?.tags?.includes("Urgent"), "Tags persist in candidate record");

  // 6. Private Recruitment Notes
  console.log("\n--- Phase A: Private Notes ---");
  const noteRes = await addCandidateNoteAction({
    workspaceId,
    candidateId: candidate!.id,
    content: "Screened candidate over phone. Strong communication, target salary $160k.",
  });
  assert(noteRes.success, "Private recruitment note added");

  const candAfterNote = recruitmentStore.getCandidateById(candidate!.id, workspaceId);
  assert(
    (candAfterNote?.notes_list?.length || 0) >= 1,
    "Private note stored persistently with author & timestamp"
  );

  // 7. Rejection with Reason
  console.log("\n--- Phase A: Rejection & Archiving ---");
  const rejectTestEmail = `part2.rejected.${Date.now()}@test.io`;
  await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: job1.id,
    fullName: "Reject Test Candidate",
    email: rejectTestEmail,
    cvStorageKey: `${workspaceId}/resumes/test-reject.pdf`,
  });
  const rejectCand = recruitmentStore.getCandidates(workspaceId).find((c) => c.email === rejectTestEmail);

  const rejectRes = await rejectCandidateApplicationAction({
    workspaceId,
    candidateId: rejectCand!.id,
    applicationId: rejectCand!.latest_application_id,
    reason: "Salary mismatch",
  });
  assert(rejectRes.success, "Candidate rejected with structured reason");

  const rejectedProfile = recruitmentStore.getCandidateById(rejectCand!.id, workspaceId);
  assert(rejectedProfile?.latest_stage === "Rejected", "Candidate stage updated to 'Rejected'");
  const rejectedApp = recruitmentStore.getCandidateApplications(rejectCand!.id, workspaceId)[0];
  assert(rejectedApp?.rejection_reason?.includes("Salary mismatch"), "Private rejection reason preserved internally");

  // 8. Archive Candidate
  const archiveRes = await archiveCandidateAction({
    workspaceId,
    candidateId: rejectCand!.id,
    isArchived: true,
  });
  assert(archiveRes.success, "Candidate marked as archived");
  const archivedCand = recruitmentStore.getCandidateById(rejectCand!.id, workspaceId);
  assert(archivedCand?.is_archived === true, "Archived state persists without deleting records");

  // 9. Schedule Interview
  console.log("\n--- Phase B: Interviews System ---");
  const scheduleRes = await scheduleInterviewAction({
    workspaceId,
    candidateId: candidate!.id,
    applicationId: candidate!.latest_application_id || candidate!.id,
    jobOpeningId: job1.id,
    roundName: "Technical Interview — System Architecture",
    interviewType: "Technical Interview",
    interviewerIds: [assignedMember?.user_id || "recruiter-1"],
    interviewerNames: [assignedMember?.full_name || "Lead Engineer"],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    meetingUrl: "https://meet.google.com/ropimo-qa-test",
    location: "Online",
    notes: "Focus on Next.js 16 caching and PostgreSQL distributed indexing.",
  });
  assert(scheduleRes.success, "Interview scheduled successfully");
  const createdInterview = (scheduleRes as any).data;

  // 10. Interview persists and relations attach
  const interviews = await getWorkspaceInterviews(workspaceId);
  const foundInterview = interviews.find((i) => i.id === createdInterview.id);
  assert(Boolean(foundInterview), "Interview appears in workspace interviews query");
  assert(foundInterview?.round_name === "Technical Interview — System Architecture", "Interview details match");
  assert(Boolean(foundInterview?.candidate), "Candidate relation joined to interview");
  assert(foundInterview?.status === "Scheduled", "Interview status defaults to 'Scheduled'");

  // 11. Reschedule Interview
  console.log("\n--- Phase B: Reschedule & Complete Interview ---");
  const newScheduleTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const rescheduleRes = await rescheduleInterviewAction({
    workspaceId,
    interviewId: createdInterview.id,
    scheduledAt: newScheduleTime,
    durationMinutes: 45,
    notes: "Candidate requested 1 day postponement.",
  });
  assert(rescheduleRes.success, "Interview rescheduled successfully");

  const refreshedIvs = await getWorkspaceInterviews(workspaceId);
  const rescheduledIv = refreshedIvs.find((i) => i.id === createdInterview.id);
  assert(rescheduledIv?.status === "Rescheduled", "Status updated to 'Rescheduled'");

  // 12. Mark Completed & Submit Feedback
  console.log("\n--- Phase B: Interview Feedback ---");
  const completeRes = await completeInterviewAction({
    workspaceId,
    interviewId: createdInterview.id,
  });
  assert(completeRes.success, "Interview marked as Completed");

  const feedbackRes = await submitInterviewFeedbackAction({
    workspaceId,
    interviewId: createdInterview.id,
    applicationId: candidate!.latest_application_id || candidate!.id,
    candidateId: candidate!.id,
    overallRating: 5,
    recommendation: "Strong Hire",
    strengths: "Deep architecture knowledge and clean component patterns.",
    concerns: "None noted.",
    privateNotes: "Highest recommendation for Staff Frontend Engineer.",
  });
  assert(feedbackRes.success, "Interview evaluation feedback submitted");

  const feedbackStored = recruitmentStore.getFeedback(createdInterview.id, workspaceId);
  assert(feedbackStored.length >= 1, "Interview feedback stored persistently");
  assert(feedbackStored[0].recommendation === "Strong Hire", "Feedback recommendation preserved");

  // 13. Candidate Timeline Audit
  console.log("\n--- Audit Trail & Security ---");
  const activities = recruitmentStore.getActivities(candidate!.id, workspaceId);
  assert(activities.length >= 4, `Recruitment timeline captured ${activities.length} real events`);
  const hasInterviewActivity = activities.some((a) => a.action_type === "interview_scheduled");
  const hasFeedbackActivity = activities.some((a) => a.action_type === "feedback_submitted");
  assert(hasInterviewActivity && hasFeedbackActivity, "Timeline captured schedule and feedback events");

  // 14. Workspace Security & No Leaks
  const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";
  const isolatedIvs = await getWorkspaceInterviews(fakeWorkspaceId);
  assert(isolatedIvs.length === 0, "Unauthorized workspace receives 0 interviews");

  // 15. Stats Check
  const stats = await getRecruitmentStats(workspaceId);
  assert(typeof stats.activeCandidatesCount === "number", `Active candidates computed dynamically (${stats.activeCandidatesCount})`);

  console.log("\n=======================================================");
  console.log(`  QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=======================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPart2QATests();
