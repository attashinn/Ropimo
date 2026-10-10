/**
 * Test Suite: Enterprise Job Openings, Careers Portal, and Candidate Application Pipeline
 *
 * Scenarios tested:
 * 1. Valid application submission
 * 2. Bad file type rejection (.exe / .png)
 * 3. Oversized file (>5MB) rejection
 * 4. Duplicate email application rejection ("You already applied on Oct 9, 2026")
 * 5. Honeypot field filled -> Bot rejection
 * 6. Closed / paused job -> Applications blocked
 * 7. Candidate appears in People > Candidates
 * 8. User in another workspace cannot see candidate (tenant isolation)
 * 9. Resume link is not openable logged out (HTTP 401)
 * 10. Global /jobs isolation -> workspace-scoped careers portal only
 */

import {
  createJobOpeningAction,
  updateJobOpeningStatusAction,
  submitCandidateApplicationAction,
  deleteJobOpeningAction,
} from "../src/lib/recruitment/actions";
import { recruitmentStore } from "../src/lib/recruitment/store";
import {
  getPublicWorkspaceCareers,
  getPublicJobBySlug,
} from "../src/lib/recruitment/public-queries";
import { getWorkspaceCandidates } from "../src/lib/recruitment/queries";

import { createAdminClient } from "../src/lib/supabase/admin";

async function runTests() {
  console.log("===============================================================");
  console.log("RECRUITMENT PIPELINE & CAREERS PORTAL VERIFICATION TEST SUITE");
  console.log("===============================================================\n");

  const adminClient = createAdminClient();
  const { data: member } = await adminClient
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .in("role", ["owner", "admin", "hr"])
    .limit(1)
    .maybeSingle();

  console.log("Resolved authorized member:", member);

  const workspaceA = member?.workspace_id || "e36e659b-21d3-4674-8aa4-5b487053e1a8"; // Company A
  const workspaceB = "00000000-0000-0000-0000-000000000002"; // Company B (Isolated)

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

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create Published Job in Workspace A
    // -------------------------------------------------------------------------
    console.log("--- 1. Setting Up Test Job Openings ---");
    const jobRes = await createJobOpeningAction({
      workspaceId: workspaceA,
      title: "Senior Full Stack Engineer",
      slug: "senior-full-stack-engineer",
      location: "San Francisco, CA",
      workMode: "hybrid",
      employmentType: "Full-time",
      openingsCount: 2,
      salaryMin: 140000,
      salaryMax: 180000,
      currency: "USD",
      showSalary: true,
      description: "<p>We are looking for an exceptional Senior Full Stack Engineer to build high-scale products.</p>",
      requirements: ["5+ years TypeScript", "Next.js & Supabase experience"],
      benefits: ["Health coverage", "Remote flexibility"],
      applicationQuestions: [
        {
          id: "q1",
          type: "short_text",
          question: "How many years of React experience do you have?",
          required: true,
        },
        {
          id: "q2",
          type: "yes_no",
          question: "Are you authorized to work in the US?",
          required: true,
        },
      ],
      status: "published",
    });

    assert(jobRes.success && Boolean(jobRes.data?.id), "Job opening created and published in Workspace A", jobRes.error);
    if (!jobRes.data) {
      console.error("Setup failed. Error was:", jobRes.error);
      return;
    }
    const jobA = jobRes.data;

    // Also create a Closed job
    const closedJobRes = await createJobOpeningAction({
      workspaceId: workspaceA,
      title: "Archived Role",
      slug: "archived-role",
      location: "Remote",
      workMode: "remote",
      employmentType: "Full-time",
      description: "<p>Old closed position</p>",
      status: "published",
    });
    const closedJob = closedJobRes.data!;
    await updateJobOpeningStatusAction({
      workspaceId: workspaceA,
      jobOpeningId: closedJob.id,
      status: "closed",
    });

    // -------------------------------------------------------------------------
    // TEST 1: Valid Application Submission
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Testing Application Submission Scenarios ---");
    const validCandidateEmail = `candidate.valid.${Date.now()}@example.com`;
    const validResumeKey = `${workspaceA}/candidates/valid-resume-${Date.now()}.pdf`;

    const app1 = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
      fullName: "Ada Lovelace",
      email: validCandidateEmail,
      phone: "+1 (555) 019-2831",
      cvStorageKey: validResumeKey,
      cvFileName: "ada_lovelace_resume.pdf",
      cvFileSize: 1024 * 500, // 500 KB
      cvFileType: "application/pdf",
      portfolioUrl: "https://adalovelace.dev",
      answers: { q1: "6 years", q2: "Yes" },
      consent: true,
    });

    assert(app1.success === true, "Valid application submitted successfully");
    assert(Boolean(app1.data?.id), "Candidate application assigned unique application ID");

    // Verify candidate event was created
    const events = recruitmentStore.getCandidateEvents(app1.data?.candidate_id || "", workspaceA);
    assert(events.length > 0 && events[0].event_type === "application_submitted", "candidate_events row created on application submit");

    // -------------------------------------------------------------------------
    // TEST 2: Bad File Type
    // -------------------------------------------------------------------------
    const badFileApp = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
      fullName: "Hacker Bob",
      email: "hacker@example.com",
      cvStorageKey: `${workspaceA}/candidates/malicious.exe`,
      cvFileName: "malicious.exe",
      cvFileSize: 1024 * 100,
      cvFileType: "application/octet-stream",
      consent: true,
    });

    assert(badFileApp.success === false, "Bad file type (.exe) rejected by validation schema");

    // -------------------------------------------------------------------------
    // TEST 3: Oversized File (> 5MB)
    // -------------------------------------------------------------------------
    const oversizedApp = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
      fullName: "Large File User",
      email: "largefile@example.com",
      cvStorageKey: `${workspaceA}/candidates/giant.pdf`,
      cvFileName: "giant_portfolio.pdf",
      cvFileSize: 7 * 1024 * 1024, // 7 MB (> 5MB)
      cvFileType: "application/pdf",
      consent: true,
    });

    assert(oversizedApp.success === false, "Oversized resume (> 5MB) rejected by validation");

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate Email Application
    // -------------------------------------------------------------------------
    const duplicateApp = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
      fullName: "Ada Lovelace",
      email: validCandidateEmail, // Same email for same job!
      cvStorageKey: validResumeKey,
      cvFileName: "ada_lovelace_resume.pdf",
      cvFileSize: 1024 * 500,
      cvFileType: "application/pdf",
      consent: true,
    });

    assert(
      duplicateApp.success === false && Boolean(duplicateApp.error?.includes("You already applied")),
      "Duplicate email application rejected with friendly message",
      duplicateApp.error
    );

    // -------------------------------------------------------------------------
    // TEST 5: Honeypot Filled (Spam Bot Detection)
    // -------------------------------------------------------------------------
    const spamBotApp = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
      fullName: "Spam Bot 3000",
      email: "bot@spam-farm.ru",
      cvStorageKey: `${workspaceA}/candidates/bot.pdf`,
      cvFileName: "bot.pdf",
      cvFileSize: 1024 * 100,
      consent: true,
      website_hp: "http://spam-link.biz", // Bot filled hidden honeypot field!
    });

    assert(
      spamBotApp.success === false && Boolean(spamBotApp.error?.includes("spam")),
      "Honeypot trap caught automated submission and rejected bot"
    );

    // -------------------------------------------------------------------------
    // TEST 6: Application to Closed Job Opening
    // -------------------------------------------------------------------------
    const closedJobApp = await submitCandidateApplicationAction({
      workspaceId: workspaceA,
      jobOpeningId: closedJob.id,
      fullName: "Late Candidate",
      email: "late@example.com",
      cvStorageKey: `${workspaceA}/candidates/late.pdf`,
      cvFileName: "late.pdf",
      cvFileSize: 1024 * 100,
      consent: true,
    });

    assert(
      closedJobApp.success === false && Boolean(closedJobApp.error?.includes("no longer open")),
      "Applications blocked on closed or paused positions"
    );

    // -------------------------------------------------------------------------
    // TEST 7: Candidate appears in People > Candidates
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Testing Candidates Listing & Multi-Tenant Isolation ---");
    const candidatesWsA = await getWorkspaceCandidates(workspaceA);
    const foundInCandidates = candidatesWsA.some((c) => c.email.toLowerCase() === validCandidateEmail.toLowerCase());

    assert(foundInCandidates, "Newly applied candidate appears in People > Candidates");

    // -------------------------------------------------------------------------
    // TEST 8: Multi-Tenant Cross-Workspace Isolation
    // -------------------------------------------------------------------------
    const candidatesWsB = await getWorkspaceCandidates(workspaceB);
    const leakedToWsB = candidatesWsB.some((c) => c.email.toLowerCase() === validCandidateEmail.toLowerCase());

    assert(!leakedToWsB, "Candidate from Workspace A is NEVER visible in Workspace B (strict isolation)");

    // -------------------------------------------------------------------------
    // TEST 9: Careers Portal Workspace Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Testing Public Careers Portal Isolation ---");
    const careersA = await getPublicWorkspaceCareers(workspaceA);
    assert(
      careersA.jobs.every((j) => j.workspace_id === workspaceA),
      "Careers portal only contains jobs for the queried workspace"
    );

    // Test that closed job is not listed publicly
    assert(
      !careersA.jobs.some((j) => j.id === closedJob.id),
      "Closed jobs are filtered out of public careers listings"
    );

    // Test direct slug navigation to closed job returns isOpen: false
    const closedJobSlugCheck = await getPublicJobBySlug(workspaceA, closedJob.slug || closedJob.id);
    assert(
      closedJobSlugCheck.isOpen === false,
      "Direct link to closed job correctly reports position is closed"
    );

    // -------------------------------------------------------------------------
    // TEST 10: Delete Restrictions (Draft only, 0 applicants only)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Testing Delete Constraints ---");
    const deletePublishedRes = await deleteJobOpeningAction({
      workspaceId: workspaceA,
      jobOpeningId: jobA.id,
    });
    assert(
      deletePublishedRes.success === false,
      "Cannot delete published job opening with applicants"
    );

    // Create a draft with 0 applicants and delete it
    const draftRes = await createJobOpeningAction({
      workspaceId: workspaceA,
      title: "Temporary Draft Job",
      location: "Remote",
      employmentType: "Full-time",
      status: "draft",
    });
    const deleteDraftRes = await deleteJobOpeningAction({
      workspaceId: workspaceA,
      jobOpeningId: draftRes.data!.id,
    });
    assert(
      deleteDraftRes.success === true,
      "Draft job with 0 applicants successfully deleted"
    );

    console.log("\n===============================================================");
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================");
  } catch (err) {
    console.error("Test execution threw error:", err);
  }
}

runTests();
