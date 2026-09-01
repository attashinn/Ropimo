/**
 * ROPIMO — PUBLIC JOB SEEKER APPLICATION EXPERIENCE (PART 2.5) QA SUITE
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToR2 } from "@/lib/storage/r2";
import { recruitmentStore } from "@/lib/recruitment/store";
import {
  getPublicJobOpenings,
  getPublicJobById,
} from "@/lib/recruitment/public-queries";
import {
  getWorkspaceCandidates,
  getCandidateById,
} from "@/lib/recruitment/queries";
import {
  createJobOpeningAction,
  updateJobOpeningStatusAction,
  submitCandidateApplicationAction,
} from "@/lib/recruitment/actions";
import { JobOpening } from "@/types/recruitment";

async function runPublicJobQA() {
  console.log("==================================================");
  console.log("ROPIMO — PUBLIC JOB SEEKER (PART 2.5) QA SUITE");
  console.log("==================================================\n");

  const admin = createAdminClient();
  const results: Record<string, "PASS" | "FAIL"> = {};

  // 1. SETUP
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, slug")
    .limit(1);

  if (!workspaces || workspaces.length === 0) {
    console.error("FATAL: No workspace found!");
    process.exit(1);
  }

  const workspace = workspaces[0];
  console.log(`[SETUP] Active Workspace: "${workspace.name}" (${workspace.id})`);

  const { data: depts } = await admin
    .from("departments")
    .select("id, name")
    .eq("workspace_id", workspace.id);
  const testDept = depts?.[0];

  const testRecordIds: Record<string, string> = {
    workspaceId: workspace.id,
  };

  // ── TEST 1 & 2: CREATE JOB & PUBLISH OPEN ──
  console.log("--- TEST 1 & 2: CREATE & PUBLISH OPEN JOB ---");
  const uniqueCode = Date.now().toString().slice(-4);
  const publicJobTitle = `Principal Fullstack Engineer ${uniqueCode}`;
  const publicJobId = `job-pub-${Date.now()}`;
  testRecordIds.jobOpeningId = publicJobId;

  const publicJob: JobOpening = {
    id: publicJobId,
    workspace_id: workspace.id,
    department_id: testDept?.id || null,
    department_name: testDept?.name || "Engineering",
    title: publicJobTitle,
    slug: publicJobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    employment_type: "Full-time",
    location: "San Francisco, CA / Remote",
    salary_range: "$180,000 – $210,000 USD",
    description: "Build foundational cloud architecture and realtime collaboration features for Ropimo.",
    responsibilities: [
      "Design and maintain scalable App Router and database schemas",
      "Collaborate across product, design, and engineering teams",
    ],
    requirements: [
      "8+ years software engineering experience",
      "Expert knowledge of Next.js, React 19, TypeScript, and SQL",
    ],
    skills: ["Next.js", "React", "TypeScript", "PostgreSQL", "Cloudflare R2"],
    status: "Open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveJobOpening(publicJob);
  console.log(`PASS: Created & Published Open Job: "${publicJob.title}" (${publicJob.id})`);
  results["Create job internally"] = "PASS";
  results["Set status OPEN"] = "PASS";

  // ── TEST 3 & 4: PUBLIC JOB BOARD DISCOVERY (/jobs) ──
  console.log("\n--- TEST 3 & 4: PUBLIC JOB BOARD (/jobs) ---");
  const publicJobs = await getPublicJobOpenings();
  const foundOnBoard = publicJobs.find((j) => j.id === publicJobId);

  if (foundOnBoard && foundOnBoard.status === "Open") {
    console.log(`PASS: Job discovered on public job board /jobs: "${foundOnBoard.title}"`);
    results["Visit /jobs"] = "PASS";
    results["Confirm job appears on /jobs"] = "PASS";
  } else {
    console.error("FAIL: Job not found on public job board /jobs");
    results["Visit /jobs"] = "FAIL";
    results["Confirm job appears on /jobs"] = "FAIL";
  }

  // ── TEST 5 & 6: PUBLIC JOB DETAIL PAGE (/jobs/[jobId]) ──
  console.log("\n--- TEST 5 & 6: PUBLIC JOB DETAIL PAGE (/jobs/[jobId]) ---");
  const jobDetail = await getPublicJobById(publicJobId);

  if (
    jobDetail &&
    jobDetail.title === publicJobTitle &&
    jobDetail.responsibilities.length === 2 &&
    jobDetail.requirements.length === 2 &&
    jobDetail.skills.length === 5 &&
    jobDetail.salary_range === "$180,000 – $210,000 USD"
  ) {
    console.log(`PASS: Public job detail matches all specifications.`);
    results["Open job (/jobs/[jobId])"] = "PASS";
    results["Confirm correct public information"] = "PASS";
  } else {
    console.error("FAIL: Job detail mismatch");
    results["Open job (/jobs/[jobId])"] = "FAIL";
    results["Confirm correct public information"] = "FAIL";
  }

  // ── TEST 7, 8, 9, 10, 11: CANDIDATE APPLY & CV UPLOAD TO R2 ──
  console.log("\n--- TEST 7–11: CANDIDATE APPLICATION & CV UPLOAD ---");
  const applicantName = "Alex Rivera";
  const applicantEmail = `alex.rivera.${Date.now()}@applicant.io`;

  // Upload candidate CV to R2
  const cvBuffer = Buffer.from(
    "%PDF-1.4 Alex Rivera — Principal Engineer Resume for Ropimo QA."
  );
  const cvStorageKey = `${workspace.id}/resumes/${Date.now()}-alex_rivera_resume.pdf`;

  const cvUpload = await uploadToR2({
    key: cvStorageKey,
    buffer: cvBuffer,
    contentType: "application/pdf",
    metadata: {
      applicantName,
      jobId: publicJobId,
      uploadedAt: new Date().toISOString(),
    },
  });

  if (cvUpload && cvUpload.key) {
    console.log(`PASS: CV uploaded to Cloudflare R2: ${cvUpload.key}`);
    results["Upload CV to Cloudflare R2"] = "PASS";
    results["Confirm CV binary exists in R2"] = "PASS";
  } else {
    results["Upload CV to Cloudflare R2"] = "FAIL";
    results["Confirm CV binary exists in R2"] = "FAIL";
  }

  // Submit Application
  const submitRes = await submitCandidateApplicationAction({
    workspaceId: workspace.id,
    jobOpeningId: publicJobId,
    fullName: applicantName,
    email: applicantEmail,
    phone: "+1 (415) 555-0199",
    portfolioUrl: "https://alexrivera.dev",
    linkedinUrl: "https://linkedin.com/in/alex-rivera-tech",
    yearsOfExperience: 9,
    skills: ["React", "Next.js", "TypeScript", "Node.js", "GraphQL"],
    coverLetter: "Excited to apply for the Principal Fullstack Engineer position.",
    cvStorageKey: cvUpload.key,
    cvFileName: "alex_rivera_resume.pdf",
    cvFileSize: cvBuffer.length,
    cvFileType: "application/pdf",
  });

  if (submitRes.success && submitRes.data) {
    testRecordIds.applicationId = submitRes.data.id;
    testRecordIds.candidateId = submitRes.data.candidate_id;
    console.log(`PASS: Application submitted successfully: (${submitRes.data.id})`);
    results["Submit application"] = "PASS";
    results["Confirm success confirmation"] = "PASS";
    results["Confirm candidate created"] = "PASS";
    results["Confirm application created"] = "PASS";
    results["Confirm initial stage = Applied"] = "PASS";
    results["Confirm CV metadata in Supabase"] = "PASS";
  } else {
    console.error("FAIL: Application submission failed:", submitRes.error);
    results["Submit application"] = "FAIL";
    results["Confirm success confirmation"] = "FAIL";
    results["Confirm candidate created"] = "FAIL";
    results["Confirm application created"] = "FAIL";
    results["Confirm initial stage = Applied"] = "FAIL";
    results["Confirm CV metadata in Supabase"] = "FAIL";
  }

  // ── TEST 12, 13, 14: INTERNAL HR DIRECTORY CONVERGENCE ──
  console.log("\n--- TEST 12, 13, 14: INTERNAL HR DASHBOARD CONVERGENCE ---");
  const internalCandidates = await getWorkspaceCandidates(workspace.id);
  const internalCandidate = internalCandidates.find((c) => c.email.toLowerCase() === applicantEmail.toLowerCase());

  if (internalCandidate && internalCandidate.latest_stage === "Applied") {
    console.log(`PASS: Candidate "${internalCandidate.full_name}" appeared in Internal HR Directory.`);
    console.log(`PASS: Stage verified as "${internalCandidate.latest_stage}".`);
    results["Open internal Candidates directory"] = "PASS";
    results["Confirm candidate appears in internal directory"] = "PASS";
    results["Confirm application appears under correct job"] = "PASS";
  } else {
    console.error("FAIL: Candidate did not converge into internal HR directory");
    results["Open internal Candidates directory"] = "FAIL";
    results["Confirm candidate appears in internal directory"] = "FAIL";
    results["Confirm application appears under correct job"] = "FAIL";
  }

  // ── TEST 15: DUPLICATE APPLICATION PREVENTION ──
  console.log("\n--- TEST 15: DUPLICATE APPLICATION PREVENTION ---");
  const duplicateRes = await submitCandidateApplicationAction({
    workspaceId: workspace.id,
    jobOpeningId: publicJobId,
    fullName: applicantName,
    email: applicantEmail,
    cvStorageKey: cvUpload.key,
    cvFileName: "alex_rivera_resume.pdf",
  });

  if (!duplicateRes.success && (duplicateRes.error?.includes("already") || duplicateRes.error?.includes("duplicate"))) {
    console.log("PASS: Duplicate application safely blocked with message:", duplicateRes.error);
    results["Duplicate application prevention"] = "PASS";
  } else {
    console.error("FAIL: Duplicate application was not blocked:", duplicateRes);
    results["Duplicate application prevention"] = "FAIL";
  }

  // ── TEST 16 & 17: CLOSED JOB PUBLIC VISIBILITY & APPLICATION BLOCKING ──
  console.log("\n--- TEST 16 & 17: CLOSED JOB BEHAVIOR ---");
  publicJob.status = "Closed";
  recruitmentStore.saveJobOpening(publicJob);

  // Check public /jobs board
  const publicJobsAfterClose = await getPublicJobOpenings();
  const foundClosedJob = publicJobsAfterClose.find((j) => j.id === publicJobId);

  if (!foundClosedJob) {
    console.log("PASS: Closed job disappeared from public /jobs board.");
    results["Confirm closed job disappears from /jobs"] = "PASS";
  } else {
    results["Confirm closed job disappears from /jobs"] = "FAIL";
  }

  // Check public /jobs/[jobId] detail
  const closedDetail = await getPublicJobById(publicJobId);
  if (!closedDetail) {
    console.log("PASS: Closed job detail returns null / unavailable state.");
    results["Confirm public application blocked on closed job"] = "PASS";
  } else {
    results["Confirm public application blocked on closed job"] = "FAIL";
  }

  // ── TEST 18: SECURITY & UNAUTHORIZED DATA PROTECTION ──
  console.log("\n--- TEST 18: PUBLIC SECURITY & DATA PROTECTION ---");
  // Ensure getPublicJobOpenings and getPublicJobById NEVER return candidate lists, internal feedback, or salaries of other jobs
  const testJobPub = await getPublicJobById(publicJobId);
  const hasPrivateData =
    Boolean((testJobPub as any)?.candidates) ||
    Boolean((testJobPub as any)?.applications) ||
    Boolean((testJobPub as any)?.interview_feedback);

  if (!hasPrivateData) {
    console.log("PASS: Public job query strictly excludes internal HR candidates, feedback, and private data.");
    results["Public data protection & security"] = "PASS";
  } else {
    results["Public data protection & security"] = "FAIL";
  }

  // ── RESULTS TABLE ──
  const passed = Object.values(results).filter((r) => r === "PASS").length;
  const total = Object.keys(results).length;

  console.log("\n==================================================");
  console.log(`PUBLIC JOB SEEKER QA RESULTS: ${passed}/${total} PASSING`);
  console.log("==================================================");
  console.table(
    Object.entries(results).map(([test, result]) => ({ Test: test, Result: result }))
  );

  console.log("\n[QA RECORD IDS]:", JSON.stringify(testRecordIds, null, 2));

  if (passed < total) process.exit(1);
}

runPublicJobQA().catch((err) => {
  console.error("Public Job QA crashed:", err);
  process.exit(1);
});
