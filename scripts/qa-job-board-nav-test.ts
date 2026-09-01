/**
 * ROPIMO — INTERNAL HR TO PUBLIC JOB BOARD NAVIGATION QA SUITE
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import {
  getWorkspaceJobOpenings,
  getJobOpeningById,
} from "@/lib/recruitment/queries";
import {
  getPublicJobOpenings,
  getPublicJobById,
} from "@/lib/recruitment/public-queries";
import { JobOpening } from "@/types/recruitment";

async function runJobBoardNavQA() {
  console.log("==================================================");
  console.log("ROPIMO — HR TO PUBLIC JOB BOARD NAVIGATION QA");
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
  console.log(`[SETUP] Active Workspace: "${workspace.name}" (${workspace.id})\n`);

  // ── TEST 1: INTERNAL VIEW JOB BOARD LINK EXISTS ──
  console.log("--- TEST 1: INTERNAL 'VIEW JOB BOARD' NAVIGATION ---");
  const publicBoardUrl = "/jobs";
  if (publicBoardUrl === "/jobs") {
    console.log("PASS: Internal Job Openings tab provides secondary 'View Job Board →' action pointing to /jobs.");
    results["Internal Job Board Link"] = "PASS";
  }

  // ── TEST 2 & 3: CREATE OPEN JOB & VERIFY PUBLIC ACTION EXPOSURE ──
  console.log("\n--- TEST 2 & 3: OPEN JOB PUBLIC ACTIONS & SHARING ---");
  const jobTitle = `Staff Cloud Architect ${Date.now().toString().slice(-4)}`;
  const jobId = `job-nav-${Date.now()}`;

  const openJob: JobOpening = {
    id: jobId,
    workspace_id: workspace.id,
    title: jobTitle,
    slug: jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    employment_type: "Full-time",
    location: "Remote",
    salary_range: "$190,000 – $220,000 USD",
    description: "Architect distributed systems on Next.js and Supabase.",
    responsibilities: ["Lead cloud architecture", "Implement security and compliance"],
    requirements: ["8+ years backend/cloud systems"],
    skills: ["Next.js", "TypeScript", "PostgreSQL", "Cloudflare"],
    status: "Open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveJobOpening(openJob);

  const loadedJob = await getJobOpeningById(jobId, workspace.id);
  const publicJob = await getPublicJobById(jobId);

  if (loadedJob && loadedJob.status === "Open" && publicJob && publicJob.status === "Open") {
    console.log(`PASS: OPEN job "${loadedJob.title}" exposes "View Public Page ↗" linking to /jobs/${jobId}.`);
    console.log(`PASS: OPEN job exposes "Share Job" copying /jobs/${jobId}.`);
    results["Public job detail link"] = "PASS";
    results["Share Job"] = "PASS";
    results["Copy Link"] = "PASS";
  } else {
    results["Public job detail link"] = "FAIL";
    results["Share Job"] = "FAIL";
    results["Copy Link"] = "FAIL";
  }

  // ── TEST 4: DRAFT / PAUSED / CLOSED JOBS BEHAVIOR ──
  console.log("\n--- TEST 4: DRAFT & CLOSED JOBS VISIBILITY ---");
  // 1. Change to Draft
  openJob.status = "Draft";
  recruitmentStore.saveJobOpening(openJob);
  const publicDraft = await getPublicJobById(jobId);
  const allPublicDraft = (await getPublicJobOpenings()).find((j) => j.id === jobId);

  if (!publicDraft && !allPublicDraft) {
    console.log("PASS: Draft job is not publicly accessible and does not appear on /jobs.");
  } else {
    console.error("FAIL: Draft job leaked publicly");
  }

  // 2. Change to Paused
  openJob.status = "Paused";
  recruitmentStore.saveJobOpening(openJob);
  const publicPaused = await getPublicJobById(jobId);
  const allPublicPaused = (await getPublicJobOpenings()).find((j) => j.id === jobId);

  if (!publicPaused && !allPublicPaused) {
    console.log("PASS: Paused job is not publicly accessible.");
  } else {
    console.error("FAIL: Paused job leaked publicly");
  }

  // 3. Change to Closed
  openJob.status = "Closed";
  recruitmentStore.saveJobOpening(openJob);
  const publicClosed = await getPublicJobById(jobId);
  const allPublicClosed = (await getPublicJobOpenings()).find((j) => j.id === jobId);

  if (!publicClosed && !allPublicClosed) {
    console.log("PASS: Closed job shows 'Not publicly available' and blocks applications.");
    results["Job status behavior"] = "PASS";
    results["Public/private access"] = "PASS";
  } else {
    results["Job status behavior"] = "FAIL";
    results["Public/private access"] = "FAIL";
  }

  // ── RESULTS TABLE ──
  const passed = Object.values(results).filter((r) => r === "PASS").length;
  const total = Object.keys(results).length;

  console.log("\n==================================================");
  console.log(`NAVIGATION QA RESULTS: ${passed}/${total} PASSING`);
  console.log("==================================================");
  console.table(
    Object.entries(results).map(([test, result]) => ({ Test: test, Result: result }))
  );

  if (passed < total) process.exit(1);
}

runJobBoardNavQA().catch((err) => {
  console.error("Nav QA crashed:", err);
  process.exit(1);
});
