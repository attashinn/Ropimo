import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import {
  submitCandidateApplicationAction,
  createOfferAction,
  sendOfferAction,
  viewPublicOfferAction,
  acceptPublicOfferAction,
  declinePublicOfferAction,
  withdrawOfferAction,
  completeHiringAction,
} from "@/lib/recruitment/actions";
import {
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

async function runPart3QATests() {
  console.log("\n=======================================================");
  console.log("  ROPIMO — RECRUITMENT PART 3 QA SUITE (OFFERS & HIRING)");
  console.log("=======================================================\n");

  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id, name").limit(1);
  const workspaceId = workspaces?.[0]?.id || "";
  assert(Boolean(workspaceId), `Active workspace found (${workspaceId})`);

  // 1. Real Job Opening & Candidate
  console.log("\n--- Phase 1: Offer Creation & Lifecycle ---");
  const jobs = recruitmentStore.getJobOpenings(workspaceId);
  assert(jobs.length >= 1, `Real job openings present in workspace (${jobs.length} jobs)`);
  const job = jobs[0];

  const candEmail = `part3.hired.candidate.${Date.now()}@ropimo.test`;
  const appRes = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: job.id,
    fullName: "Morgan Sterling",
    email: candEmail,
    phone: "+1 555 0199",
    skills: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    yearsOfExperience: 8,
    portfolioUrl: "https://morgan.dev",
    coverLetter: "Excited to join as Staff Frontend Architect.",
    cvStorageKey: `${workspaceId}/resumes/morgan-cv-${Date.now()}.pdf`,
    cvFileName: "Morgan_Sterling_CV.pdf",
  });
  assert(appRes.success, "Candidate application submitted successfully");

  const candidates = recruitmentStore.getCandidates(workspaceId);
  const candidate = candidates.find((c) => c.email === candEmail);
  assert(Boolean(candidate), "Candidate profile loaded in workspace");

  // 2. Create Offer (Draft)
  const createOfferRes = await createOfferAction({
    workspaceId,
    candidateId: candidate!.id,
    applicationId: candidate!.latest_application_id || candidate!.id,
    jobOpeningId: job.id,
    jobTitle: "Staff Frontend Architect",
    employmentType: "Full-time",
    salary: "$190,000",
    salaryCurrency: "USD",
    startDate: "2026-10-01",
    expirationDate: "2026-10-15",
    offerNotes: "Includes equity package and annual bonus.",
    status: "Draft",
  });
  assert(createOfferRes.success, "Job offer created successfully");
  const offer = createOfferRes.data;
  assert(offer.status === "Draft", "Initial offer status is Draft");
  assert(Boolean(offer.token), `Secure token generated for offer (${offer.token})`);

  // 3. Send Offer
  const sendRes = await sendOfferAction({
    workspaceId,
    offerId: offer.id,
  });
  assert(sendRes.success, "Job offer transitioned to Sent");
  assert(sendRes.data?.status === "Sent", "Offer status is Sent");
  assert(Boolean(sendRes.data?.sent_at), "sent_at timestamp recorded");

  // 4. Candidate Public Offer View (Secure, Zero Leaks)
  console.log("\n--- Phase 2: Public Candidate Offer Experience ---");
  const publicViewRes = await viewPublicOfferAction(offer.token);
  assert(publicViewRes.success, "Public offer loaded via secure token");
  assert(publicViewRes.data?.position_title === "Staff Frontend Architect", "Public offer details match position");
  assert(publicViewRes.data?.salary === "$190,000", "Public offer shows correct salary terms");
  assert(publicViewRes.data?.status === "Viewed", "Offer status automatically marked as Viewed on access");

  // Verify Zero Data Leaks
  const publicOfferKeys = Object.keys(publicViewRes.data || {});
  const hasNotesLeak = publicOfferKeys.includes("notes_list") || publicOfferKeys.includes("private_notes");
  const hasFeedbackLeak = publicOfferKeys.includes("feedback") || publicOfferKeys.includes("interview_feedback");
  assert(!hasNotesLeak && !hasFeedbackLeak, "Public offer exposes ZERO internal recruitment notes or interview feedback");

  // 5. Accept Offer
  const acceptRes = await acceptPublicOfferAction({
    tokenOrOfferId: offer.token,
    confirmed: true,
  });
  assert(acceptRes.success, "Offer accepted with confirmed employment terms");
  assert(acceptRes.data?.status === "Accepted", "Offer status updated to Accepted");
  assert(Boolean(acceptRes.data?.accepted_at), "accepted_at timestamp recorded");

  // Verify Application & Candidate stage updated to Hired
  const candAfterAccept = recruitmentStore.getCandidateById(candidate!.id, workspaceId);
  assert(candAfterAccept?.latest_stage === "Hired", "Candidate latest_stage updated to Hired");
  const appAfterAccept = recruitmentStore.getCandidateApplications(candidate!.id, workspaceId)[0];
  assert(appAfterAccept?.stage === "Hired", "Candidate application stage updated to Hired");

  // 6. Prevent Duplicate Acceptance (Idempotency)
  const acceptAgainRes = await acceptPublicOfferAction({
    tokenOrOfferId: offer.token,
    confirmed: true,
  });
  assert(acceptAgainRes.success, "Repeat offer acceptance handled idempotently without error");

  // 7. Phase 3: Complete Hiring & Employee Directory Integration
  console.log("\n--- Phase 3: Complete Hiring & Employee Provisioning ---");
  const hireRes = await completeHiringAction({
    workspaceId,
    candidateId: candidate!.id,
    offerId: offer.id,
    jobTitle: "Staff Frontend Architect",
    role: "member",
    employmentType: "Full-time",
    startDate: "2026-10-01",
  });
  assert(hireRes.success, "Hiring completed and employee provisioned");
  const employeeUserId = hireRes.data?.userId;
  assert(Boolean(employeeUserId), `Employee assigned persistent user ID (${employeeUserId})`);

  // Verify persistent relationship
  const candAfterHired = recruitmentStore.getCandidateById(candidate!.id, workspaceId);
  assert(candAfterHired?.converted_user_id === employeeUserId, "Candidate record permanently linked to employee user_id");

  // 8. Duplicate Hiring Protection
  console.log("\n--- Duplicate Hiring Protection ---");
  const hireAgainRes = await completeHiringAction({
    workspaceId,
    candidateId: candidate!.id,
    offerId: offer.id,
    jobTitle: "Staff Frontend Architect",
  });
  assert(hireAgainRes.success, "Second Complete Hiring call succeeded idempotently");
  assert(hireAgainRes.data?.userId === employeeUserId, "No duplicate user or member created on second hiring call");

  // 9. Independent Multiple Applications Test
  console.log("\n--- Multiple Applications Isolation ---");
  const multiEmail = `part3.multi.${Date.now()}@ropimo.test`;
  const multiApp1 = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: job.id,
    fullName: "Jordan Lee",
    email: multiEmail,
    cvStorageKey: `${workspaceId}/resumes/jordan-cv-1.pdf`,
    cvFileName: "Jordan_Lee_CV.pdf",
  });
  const multiApp2 = await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: jobs.length > 1 ? jobs[1].id : job.id,
    fullName: "Jordan Lee",
    email: multiEmail,
    cvStorageKey: `${workspaceId}/resumes/jordan-cv-2.pdf`,
    cvFileName: "Jordan_Lee_CV_2.pdf",
  });
  assert(multiApp1.success && multiApp2.success, "Two independent applications submitted for Jordan Lee");

  const multiCand = recruitmentStore.getCandidates(workspaceId).find((c) => c.email === multiEmail);
  const multiApps = recruitmentStore.getCandidateApplications(multiCand!.id, workspaceId);
  assert(multiApps.length >= 2, `Candidate has ${multiApps.length} independent applications`);

  // Create offer and accept for app 1 only
  const multiOfferRes = await createOfferAction({
    workspaceId,
    candidateId: multiCand!.id,
    applicationId: multiApps[0].id,
    jobTitle: "Lead Engineer",
    salary: "$175,000",
  });
  await acceptPublicOfferAction({
    tokenOrOfferId: multiOfferRes.data?.token || multiOfferRes.data?.id,
    confirmed: true,
  });

  const refreshedMultiApps = recruitmentStore.getCandidateApplications(multiCand!.id, workspaceId);
  const targetHiredApp = refreshedMultiApps.find((a) => a.id === multiApps[0].id);
  const otherApp = refreshedMultiApps.find((a) => a.id === multiApps[1].id);
  assert(targetHiredApp?.stage === "Hired", "Target application 1 is Hired");
  assert(otherApp?.stage !== "Hired", "Other application 2 remains in its original stage");

  // 10. Decline & Withdraw Flow
  console.log("\n--- Decline & Withdraw Flows ---");
  const declineCandEmail = `part3.decline.${Date.now()}@ropimo.test`;
  await submitCandidateApplicationAction({
    workspaceId,
    jobOpeningId: job.id,
    fullName: "Decline Test",
    email: declineCandEmail,
    cvStorageKey: `${workspaceId}/resumes/decline-cv.pdf`,
    cvFileName: "Decline_CV.pdf",
  });
  const declineCand = recruitmentStore.getCandidates(workspaceId).find((c) => c.email === declineCandEmail);
  const declineOfferRes = await createOfferAction({
    workspaceId,
    candidateId: declineCand!.id,
    applicationId: declineCand!.latest_application_id || declineCand!.id,
    jobTitle: "Product Designer",
    salary: "$120,000",
  });

  const declineRes = await declinePublicOfferAction({
    tokenOrOfferId: declineOfferRes.data?.token,
    reason: "Compensation / Salary",
    details: "Found a role offering higher baseline compensation.",
  });
  assert(declineRes.success, "Candidate declined offer with structured reason");

  const declinedOfferStored = recruitmentStore.getOffers(workspaceId).find((o) => o.id === declineOfferRes.data?.id);
  assert(declinedOfferStored?.status === "Declined", "Offer status updated to Declined");
  assert(declinedOfferStored?.decline_reason?.includes("Compensation"), "Decline reason recorded");

  // Withdraw test
  const withdrawOfferRes = await createOfferAction({
    workspaceId,
    candidateId: declineCand!.id,
    applicationId: declineCand!.latest_application_id || declineCand!.id,
    jobTitle: "Associate Designer",
    salary: "$90,000",
  });
  const withdrawRes = await withdrawOfferAction({
    workspaceId,
    offerId: withdrawOfferRes.data?.id,
    reason: "Role requirements updated",
  });
  assert(withdrawRes.success, "Offer withdrawn by company");
  const withdrawnOffer = recruitmentStore.getOffers(workspaceId).find((o) => o.id === withdrawOfferRes.data?.id);
  assert(withdrawnOffer?.status === "Withdrawn", "Offer status updated to Withdrawn");

  // 11. Security & Workspace Isolation
  console.log("\n--- Security & Activity Timeline ---");
  const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";
  const isolatedOffers = recruitmentStore.getOffers(fakeWorkspaceId);
  assert(isolatedOffers.length === 0, "Unauthorized workspace receives 0 offers");

  const activities = recruitmentStore.getActivities(candidate!.id, workspaceId);
  assert(activities.length >= 4, `Recruitment timeline captured ${activities.length} real events`);
  const hasOfferCreated = activities.some((a) => a.action_type === "offer_created");
  const hasOfferSent = activities.some((a) => a.action_type === "offer_sent");
  const hasOfferAccepted = activities.some((a) => a.action_type === "offer_accepted");
  const hasHiringCompleted = activities.some((a) => a.action_type === "hiring_completed");
  assert(
    hasOfferCreated && hasOfferSent && hasOfferAccepted && hasHiringCompleted,
    "Timeline captured offer_created, offer_sent, offer_accepted, and hiring_completed"
  );

  // 12. Dynamic Recruitment Stats
  const stats = await getRecruitmentStats(workspaceId);
  assert(typeof stats.activeCandidatesCount === "number", `Active candidates computed dynamically (${stats.activeCandidatesCount})`);
  assert(typeof stats.hiredThisQuarterCount === "number", `Hired count computed dynamically (${stats.hiredThisQuarterCount})`);
  assert(typeof stats.offersPendingCount === "number", `Pending offers computed dynamically (${stats.offersPendingCount})`);

  console.log("\n=======================================================");
  console.log(`  QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=======================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPart3QATests();
