import { createAdminClient } from "../src/lib/supabase/admin";
import { recruitmentStore, createDefaultOnboardingChecklist } from "../src/lib/recruitment/store";
import {
  hireCandidateAction,
  updateOnboardingChecklistItemAction,
  completeOnboardingAction,
  uploadEmployeeDocumentAction,
} from "../src/lib/recruitment/actions";
import {
  getWorkspacePeople,
  getWorkspacePersonById,
  getEmployeeOnboarding,
  getEmployeeRecruitmentHistory,
} from "../src/lib/people/queries";
import { getWorkspaceCandidates } from "../src/lib/recruitment/queries";

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, description: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [CHECK ${totalChecks}] ${description}`);
  } else {
    console.error(`  ✗ [CHECK ${totalChecks}] FAILED: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runQA() {
  console.log("\n========================================================");
  console.log("  ROPIMO PART 4: CANDIDATE → HIRE → EMPLOYEE → ONBOARDING QA");
  console.log("========================================================\n");

  const adminClient = createAdminClient();

  // 1. Find valid workspace
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name, slug")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "Find valid workspace");
  const testWorkspace = workspaces![0];
  const workspaceId = testWorkspace.id;
  console.log(`  → Workspace: ${testWorkspace.name} (${workspaceId})\n`);

  // 2. Fetch or create valid department
  const { data: depts } = await adminClient
    .from("departments")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .limit(1);

  let departmentId = depts && depts.length > 0 ? depts[0].id : "";
  if (!departmentId) {
    const { data: newDept } = await adminClient
      .from("departments")
      .insert({
        workspace_id: workspaceId,
        name: "Engineering",
        slug: "engineering",
        icon: "code",
        color: "#246244",
      })
      .select("id")
      .single();
    departmentId = newDept?.id || "";
  }
  assert(Boolean(departmentId), "Department exists or created for test");

  // 3. Create or find valid candidate and set stage to Hired
  const testCandidateId = `cand-qa-${Date.now()}`;
  const testCandidateEmail = `sarah.qa.${Date.now()}@example.com`;
  const candidateRecord = {
    id: testCandidateId,
    workspace_id: workspaceId,
    full_name: "Sarah Jenkins QA",
    email: testCandidateEmail,
    phone: "+1 555 234 5678",
    latest_job_title: "Senior Product Engineer",
    latest_stage: "Hired" as const,
    skills: ["React", "Next.js", "TypeScript", "Node.js"],
    created_at: new Date().toISOString(),
  };

  recruitmentStore.saveCandidate(candidateRecord);
  assert(
    recruitmentStore.getCandidateById(testCandidateId, workspaceId)?.latest_stage === "Hired",
    "Verify candidate exists in Hired stage"
  );

  // 4. Test Unique Employee ID Generation
  const generatedEmpId = recruitmentStore.getNextEmployeeId(workspaceId);
  assert(
    /^EMP-\d{3,}$/i.test(generatedEmpId),
    `Employee ID correctly generated format: ${generatedEmpId}`
  );

  // 5. Hire candidate via hireCandidateAction
  const hireResult = await hireCandidateAction({
    workspaceId,
    candidateId: testCandidateId,
    fullName: "Sarah Jenkins QA",
    workEmail: testCandidateEmail,
    jobTitle: "Senior Product Engineer",
    departmentId,
    employmentType: "Full-time",
    startDate: "2026-09-15",
    salary: "$120,000 / year",
    location: "San Francisco, CA",
    employeeId: generatedEmpId,
    role: "member",
  });

  if (!hireResult.success) {
    console.error("hireResult error detail:", hireResult.error);
  }

  assert(hireResult.success === true, `Hire candidate action succeeds (${hireResult.error || "ok"})`);
  const hiredUserId = hireResult.data?.userId;
  assert(Boolean(hiredUserId), `Hired employee user ID returned: ${hiredUserId}`);

  // 6. Check Employee Record created in workspace_members
  const { data: memberRecord } = await adminClient
    .from("workspace_members")
    .select("id, user_id, job_title, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", hiredUserId)
    .single();

  assert(Boolean(memberRecord), "Employee record exists in workspace_members");
  assert(memberRecord?.job_title === "Senior Product Engineer", "Job title correctly set in workspace_members");

  // 7. Candidate ↔ Employee relationship exists
  const updatedCandidate = recruitmentStore.getCandidateById(testCandidateId, workspaceId);
  assert(
    updatedCandidate?.converted_user_id === hiredUserId,
    "Candidate converted_user_id points to employee user ID"
  );
  assert(
    updatedCandidate?.employee_id === generatedEmpId,
    "Candidate record stores unique employee ID"
  );
  assert(
    updatedCandidate?.employment_status === "Pending",
    "Candidate initial employment status is Pending (Onboarding)"
  );

  // 8. Department membership created
  const { data: deptMembership } = await adminClient
    .from("department_members")
    .select("id, department_id, user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", hiredUserId)
    .eq("department_id", departmentId)
    .single();

  assert(Boolean(deptMembership), "Department membership row created in department_members");

  // 9. Workspace isolation & Duplicate Hiring Prevention (Idempotency)
  const duplicateHireResult = await hireCandidateAction({
    workspaceId,
    candidateId: testCandidateId,
    fullName: "Sarah Jenkins QA",
    workEmail: testCandidateEmail,
    jobTitle: "Senior Product Engineer",
    departmentId,
    employmentType: "Full-time",
    startDate: "2026-09-15",
    employeeId: generatedEmpId,
  });

  assert(duplicateHireResult.success === true, "Repeated hire action call succeeds idempotently");
  assert(
    duplicateHireResult.data?.userId === hiredUserId,
    "Repeated hire does NOT create duplicate users or memberships"
  );

  const { data: allMemberRows } = await adminClient
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", hiredUserId);

  assert(allMemberRows?.length === 1, "Exactly one workspace_members record exists for this employee");

  // 10. Onboarding record created
  const onboarding = recruitmentStore.getOnboardingByUserId(hiredUserId, workspaceId);
  assert(Boolean(onboarding), "Onboarding record created for employee");
  assert(onboarding?.status === "Documents Pending", "Onboarding initial status is Documents Pending");
  assert(
    onboarding?.checklist && onboarding.checklist.length >= 10,
    `Onboarding checklist created with ${onboarding?.checklist?.length} requirements across 4 sections`
  );

  // 11. Toggle Checklist items and verify persistence
  const targetItem = onboarding!.checklist.find((i) => !i.completed);
  assert(Boolean(targetItem), "Found incomplete checklist item to toggle");

  const toggleResult = await updateOnboardingChecklistItemAction({
    workspaceId,
    userId: hiredUserId,
    itemId: targetItem!.id,
    completed: true,
  });

  assert(toggleResult.success === true, "Checklist toggle action succeeds");
  const refetchedOnboarding = recruitmentStore.getOnboardingByUserId(hiredUserId, workspaceId);
  const toggledItem = refetchedOnboarding?.checklist.find((i) => i.id === targetItem!.id);
  assert(toggledItem?.completed === true, "Checklist item completion persists in storage");

  // 12. Upload document and check metadata
  const docResult = await uploadEmployeeDocumentAction({
    workspaceId,
    userId: hiredUserId,
    name: "Employment_Agreement_Signed.pdf",
    documentType: "Contract",
    fileUrl: `/api/storage/employees/${hiredUserId}/Employment_Agreement_Signed.pdf`,
    fileSize: 2048576,
  });

  assert(docResult.success === true, "Document upload action succeeds");
  const postDocOnboarding = recruitmentStore.getOnboardingByUserId(hiredUserId, workspaceId);
  const contractItem = postDocOnboarding?.checklist.find((i) => i.id === "chk-doc-3");
  assert(contractItem?.completed === true, "Document upload automatically verifies Contract checklist requirement");

  // 13. Query employee profile and recruitment history
  const people = await getWorkspacePeople(workspaceId);
  const person = people.find((p) => p.user_id === hiredUserId);
  assert(Boolean(person), "Employee appears in getWorkspacePeople query");
  assert(person?.employee_id === generatedEmpId, "Employee profile includes unique employee ID");
  assert(person?.candidate_id === testCandidateId, "Employee profile links to candidate ID");

  const recruitmentHistory = await getEmployeeRecruitmentHistory(hiredUserId, workspaceId);
  assert(Boolean(recruitmentHistory), "Employee recruitment history query succeeds");
  assert(
    recruitmentHistory?.candidate?.id === testCandidateId,
    "Recruitment history connects to original candidate profile"
  );

  // 14. Workspace Isolation Test
  const otherWsId = "00000000-0000-0000-0000-000000000000";
  const crossWsOnboarding = recruitmentStore.getOnboardingByUserId(hiredUserId, otherWsId);
  assert(crossWsOnboarding === null, "Workspace isolation: onboarding inaccessible across different workspaces");

  // 15. Complete Onboarding Action
  const completeResult = await completeOnboardingAction({
    workspaceId,
    userId: hiredUserId,
  });

  assert(completeResult.success === true, "Complete onboarding action succeeds");
  const finalOnboarding = recruitmentStore.getOnboardingByUserId(hiredUserId, workspaceId);
  assert(finalOnboarding?.status === "Completed", "Onboarding status transitioned to Completed");
  assert(finalOnboarding?.progress_percentage === 100, "Onboarding progress reaches 100%");

  const finalCandidate = recruitmentStore.getCandidateById(testCandidateId, workspaceId);
  assert(finalCandidate?.employment_status === "Active", "Candidate employment status upgraded to Active");
  assert(finalCandidate?.onboarding_status === "Completed", "Candidate onboarding status is Completed");

  // 16. Verify Activity Timeline
  const candidateActivities = recruitmentStore.getActivities(testCandidateId, workspaceId);
  const hasHireAct = candidateActivities.some((a) => a.action_type === "hiring_completed");
  const hasOnbAct = candidateActivities.some((a) => a.action_type === "onboarding_completed");
  assert(hasHireAct, "Activity timeline records hiring_completed event");
  assert(hasOnbAct, "Activity timeline records onboarding_completed event");

  // Cleanup QA test records safely
  await adminClient.from("department_members").delete().eq("user_id", hiredUserId);
  await adminClient.from("workspace_members").delete().eq("user_id", hiredUserId);

  console.log("\n========================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("\n❌ QA Test failed with error:", err);
  process.exit(1);
});
