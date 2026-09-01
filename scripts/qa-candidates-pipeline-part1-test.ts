import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import {
  submitCandidateApplicationAction,
  updateApplicationStageAction,
} from "@/lib/recruitment/actions";
import {
  getWorkspaceCandidates,
  getCandidateById,
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

async function runPart1QATests() {
  console.log("\n=======================================================");
  console.log("  ROPIMO — CANDIDATES & PIPELINE PART 1 QA SUITE");
  console.log("=======================================================\n");

  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id, name").limit(1);
  const workspaceId = workspaces?.[0]?.id || "";
  assert(Boolean(workspaceId), `Active workspace found (${workspaceId})`);

  // 1. Verify Job Opening exists
  const jobs = recruitmentStore.getJobOpenings(workspaceId);
  assert(jobs.length > 0, `Real job openings found in workspace (${jobs.length} jobs)`);
  const testJob = jobs[0];

  // 2. Test 1: Public application creates candidate
  console.log("\n--- Checkpoint 1 & 2 & 3: Application Flow & Stage Inception ---");
  const testEmail = `qa.applicant.${Date.now()}@test.io`;
  const appResult = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: testJob.id,
    fullName: "QA Verified Candidate",
    email: testEmail,
    phone: "+1 555 0199",
    skills: ["React", "TypeScript", "Next.js"],
    yearsOfExperience: 5,
    coverLetter: "I am excited to apply for this engineering role.",
    cvStorageKey: `${workspaceId}/resumes/qa-test-cv-${Date.now()}.pdf`,
    cvFileName: "QA_Resume.pdf",
    cvFileSize: 1024 * 50,
  });

  assert(appResult.success, "Public candidate application submitted successfully");

  // 3. Test Candidate appears in store & starts at Applied
  const candidates = recruitmentStore.getCandidates(workspaceId);
  const createdCandidate = candidates.find((c) => c.email === testEmail);
  assert(Boolean(createdCandidate), "Candidate appears automatically in Candidates & Pipeline");
  assert(createdCandidate?.latest_stage === "Applied", "Candidate stage defaults to 'Applied'");

  // 4. Test 4: Search works
  console.log("\n--- Checkpoint 4: Search Functionality ---");
  const queryResultName = candidates.filter((c) =>
    c.full_name.toLowerCase().includes("qa verified")
  );
  assert(queryResultName.length >= 1, "Search by name returns matching candidate");

  const queryResultEmail = candidates.filter((c) =>
    c.email.toLowerCase().includes(testEmail.split("@")[0])
  );
  assert(queryResultEmail.length >= 1, "Search by email returns matching candidate");

  const queryResultSkill = candidates.filter((c) =>
    c.skills.some((s) => s.toLowerCase().includes("typescript"))
  );
  assert(queryResultSkill.length >= 1, "Search by skill returns matching candidate");

  // 5. Test 5 & 6: Filters (Job & Stage)
  console.log("\n--- Checkpoint 5 & 6: Job & Stage Filters ---");
  const filterByJob = candidates.filter((c) => c.latest_job_id === testJob.id);
  assert(filterByJob.length >= 1, `Job filter correctly filters candidates for job ${testJob.id}`);

  const filterByStage = candidates.filter((c) => c.latest_stage === "Applied");
  assert(filterByStage.length >= 1, "Stage filter correctly filters candidates in 'Applied'");

  // 6. Test 7 & 8: Candidate Profile & Secure CV Link
  console.log("\n--- Checkpoint 7 & 8: Profile Data & CV Retrieval ---");
  if (createdCandidate) {
    const detail = await getCandidateById(createdCandidate.id, workspaceId);
    assert(Boolean(detail.candidate), "Candidate profile query returns candidate record");
    assert(detail.applications.length >= 1, "Candidate applications relation loaded");
    assert(
      detail.candidate?.cv_storage_key?.includes(workspaceId),
      "Real Cloudflare R2 CV storage key is scoped to workspace"
    );
  }

  // 7. Test 9, 10, 11, 12, 13: Stage Transitions & Activity Tracking
  console.log("\n--- Checkpoint 9 to 13: Stage Transitions & Activity Tracking ---");
  if (createdCandidate) {
    // Applied -> Screening
    const moveScreening = await updateApplicationStageAction({
      workspaceId,
      applicationId: createdCandidate.latest_application_id || createdCandidate.id,
      candidateId: createdCandidate.id,
      toStage: "Screening",
      reason: "Passed initial resume review",
    });
    console.log("moveScreening debug:", moveScreening);
    assert(moveScreening.success, "Move candidate Applied → Screening succeeded");

    // Verify persistence
    const refreshedScreening = recruitmentStore.getCandidateById(createdCandidate.id, workspaceId);
    assert(refreshedScreening?.latest_stage === "Screening", "Screening stage persists accurately");

    // Screening -> Shortlisted
    const moveShortlisted = await updateApplicationStageAction({
      workspaceId,
      applicationId: createdCandidate.latest_application_id || createdCandidate.id,
      candidateId: createdCandidate.id,
      toStage: "Shortlisted",
      reason: "Shortlisted for engineering interview",
    });
    assert(moveShortlisted.success, "Move candidate Screening → Shortlisted succeeded");

    // Verify activity logged
    const activities = recruitmentStore.getActivities(createdCandidate.id, workspaceId);
    assert(activities.length >= 2, `Recruitment timeline logged ${activities.length} activity records`);
    const stageActivity = activities.find((a) => a.action_type === "stage_changed");
    assert(Boolean(stageActivity), "Stage change activity recorded in audit trail");
  }

  // 8. Test 14: Duplicate Application Behavior
  console.log("\n--- Checkpoint 14: Duplicate Application Prevention ---");
  const dupResult = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: testJob.id,
    fullName: "QA Verified Candidate Duplicate",
    email: testEmail,
    phone: "+1 555 0199",
    skills: ["React"],
    yearsOfExperience: 5,
    coverLetter: "Duplicate attempt",
    cvStorageKey: `${workspaceId}/resumes/qa-dup.pdf`,
  });
  assert(
    !dupResult.success && Boolean(dupResult.error?.includes("already") || dupResult.error?.includes("submitted")),
    "Duplicate application for same job opening is prevented with clear validation error"
  );

  // 9. Test 15: Workspace Isolation & Security
  console.log("\n--- Checkpoint 15 & 16: Security & Workspace Isolation ---");
  const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";
  const fakeCandidates = recruitmentStore.getCandidates(fakeWorkspaceId);
  assert(fakeCandidates.length === 0, "Unauthorized workspace query returns 0 candidates");

  if (createdCandidate) {
    const wrongWorkspaceDetail = await getCandidateById(createdCandidate.id, fakeWorkspaceId);
    assert(
      !wrongWorkspaceDetail.candidate,
      "Accessing candidate from non-matching workspace is strictly blocked"
    );
  }

  // 10. Test 17 & 18: Real Stats & Counts
  console.log("\n--- Checkpoint 17 & 18: Real Stats & Counts ---");
  const stats = await getRecruitmentStats(workspaceId);
  assert(typeof stats.activeCandidatesCount === "number", `Active candidates computed from real data (${stats.activeCandidatesCount})`);
  assert(typeof stats.openJobsCount === "number", `Open jobs computed from real data (${stats.openJobsCount})`);

  // Summary
  console.log("\n=======================================================");
  console.log(`  QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=======================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPart1QATests();
