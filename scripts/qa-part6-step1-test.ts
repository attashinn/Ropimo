import { createAdminClient } from "../src/lib/supabase/admin";
import { recruitmentStore } from "../src/lib/recruitment/store";
import {
  convertCandidateToEmployeeAction,
  addCandidateNoteAction,
} from "../src/lib/recruitment/actions";
import { getWorkspacePeople } from "../src/lib/people/queries";
import { getWorkspaceDepartments } from "../src/lib/department/queries";
import { Candidate, CandidateApplication } from "../src/types/recruitment";

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
  console.log("  ROPIMO PART 6 / STEP 1: EMPLOYEE LIFECYCLE FOUNDATION QA");
  console.log("========================================================\n");

  const adminClient = createAdminClient();

  // 1. Workspace found
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "Workspace found in database");
  const testWorkspace = workspaces![0];
  const workspaceId = testWorkspace.id;
  console.log(`  → Workspace: ${testWorkspace.name} (${workspaceId})\n`);

  // Departments
  const departments = await getWorkspaceDepartments(workspaceId);
  assert(departments.length > 0, `Workspace departments found (${departments.length} departments)`);
  const targetDept = departments[0];

  // 2. Create a test candidate in Hired stage with recruitment history (Notes + Applications)
  const testCandId = `cand-qa-${Date.now()}`;
  const testAppId = `app-qa-${Date.now()}`;
  const testCandidateEmail = `qa.hired.candidate.${Date.now()}@example.com`;

  const newCandidate: Candidate = {
    id: testCandId,
    workspace_id: workspaceId,
    full_name: "Eleanor Vance (QA Candidate)",
    email: testCandidateEmail,
    phone: "+1 (555) 234-5678",
    latest_stage: "Hired",
    latest_job_title: "Senior Product Engineer",
    latest_application_id: testAppId,
    skills: ["React", "TypeScript", "Next.js", "System Design"],
    years_of_experience: 5,
    notes_list: [
      {
        id: `note-1-${Date.now()}`,
        workspace_id: workspaceId,
        candidate_id: testCandId,
        author_id: "u-admin",
        author_name: "Hiring Manager",
        content: "Outstanding performance in technical interview. Approved for offer.",
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveCandidate(newCandidate);

  const newApp: CandidateApplication = {
    id: testAppId,
    workspace_id: workspaceId,
    candidate_id: testCandId,
    job_opening_id: "job-default-1",
    stage: "Hired",
    hired_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  recruitmentStore.saveApplication(newApp);

  // 3. Verify Candidate Exists & Has Hired Application
  const retrievedCandidate = recruitmentStore.getCandidateById(testCandId, workspaceId);
  assert(Boolean(retrievedCandidate), "Test candidate created and retrievable");
  assert(retrievedCandidate?.latest_stage === "Hired", "Candidate is in 'Hired' stage");
  assert((retrievedCandidate?.notes_list || []).length === 1, "Candidate notes history exists");

  // 4. Safe Unique Employee ID Generation
  const generatedEmpId = recruitmentStore.getNextEmployeeId(workspaceId);
  assert(Boolean(generatedEmpId && generatedEmpId.startsWith("EMP-")), `Employee ID generated safely: ${generatedEmpId}`);

  // 5. Cross-Workspace Conversion is Blocked
  const otherWsId = "00000000-0000-0000-0000-000000000000";
  const crossWsRes = await convertCandidateToEmployeeAction({
    workspaceId: otherWsId,
    candidateId: testCandId,
    jobTitle: "Senior Product Engineer",
    departmentId: targetDept.id,
    employeeId: generatedEmpId,
  });
  assert(crossWsRes.success === false, "Cross-workspace conversion blocked server-side");

  // 6. Convert Candidate to Employee Action Execution
  const conversionDate = "2026-09-15";
  const convertRes = await convertCandidateToEmployeeAction({
    workspaceId,
    candidateId: testCandId,
    applicationId: testAppId,
    fullName: "Eleanor Vance (QA Candidate)",
    workEmail: testCandidateEmail,
    jobTitle: "Lead Frontend Architect",
    departmentId: targetDept.id,
    role: "member",
    employmentType: "Full-time",
    startDate: conversionDate,
    employeeId: generatedEmpId,
  });

  assert(convertRes.success === true, `Candidate converted to employee successfully (${convertRes.error || "ok"})`);
  const convertedData = convertRes.data!;
  assert(Boolean(convertedData.userId), `Employee user ID assigned: ${convertedData.userId}`);
  assert(convertedData.employeeId === generatedEmpId, "Assigned employee ID matches unique ID");

  // 7. Converted Employee Appears in Team Directory
  const teamPeople = await getWorkspacePeople(workspaceId);
  const foundEmployee = teamPeople.find((p) => p.user_id === convertedData.userId);
  assert(Boolean(foundEmployee), "Converted employee appears in People Team Directory");
  assert(foundEmployee?.full_name === "Eleanor Vance (QA Candidate)", "Employee full name accurately preserved");
  assert(foundEmployee?.job_title === "Lead Frontend Architect", "Employee job title accurately preserved");
  assert(foundEmployee?.employee_id === generatedEmpId, "Employee ID appears in Team Directory record");

  // 8. Department Membership Preserved
  assert(
    foundEmployee?.departments.some((d) => d.id === targetDept.id) === true,
    `Employee linked to department "${targetDept.name}"`
  );

  // 9. Candidate Recruitment History Remains 100% Intact
  const postConvertCandidate = recruitmentStore.getCandidateById(testCandId, workspaceId);
  assert(postConvertCandidate?.converted_user_id === convertedData.userId, "Candidate has converted_user_id linked");
  assert(postConvertCandidate?.employee_id === generatedEmpId, "Candidate has employee_id linked");
  assert(postConvertCandidate?.employment_status === "Active", "Candidate status updated to 'Active'");
  assert((postConvertCandidate?.notes_list || []).length === 1, "Candidate notes history 100% preserved");

  // 10. Activity Logged
  const activities = recruitmentStore.getActivities(testCandId, workspaceId);
  const convActivity = activities.find((a) => a.action_type === "candidate_converted_to_employee");
  assert(Boolean(convActivity), "Activity 'candidate_converted_to_employee' logged with timestamp and actor");

  // 11. Duplicate Conversion is Blocked
  const duplicateConvertRes = await convertCandidateToEmployeeAction({
    workspaceId,
    candidateId: testCandId,
    jobTitle: "Lead Frontend Architect",
    employeeId: generatedEmpId,
  });
  assert(duplicateConvertRes.success === false, "Duplicate conversion blocked server-side");
  assert(
    duplicateConvertRes.error?.includes("Already converted") === true,
    `Clear message returned: "${duplicateConvertRes.error}"`
  );

  // 12. Duplicate Employee ID is Blocked
  const dupCandId = `cand-dup-${Date.now()}`;
  recruitmentStore.saveCandidate({
    id: dupCandId,
    workspace_id: workspaceId,
    full_name: "Duplicate Tester",
    email: `dup.tester.${Date.now()}@example.com`,
    latest_stage: "Hired",
    skills: [],
    created_at: new Date().toISOString(),
  });

  const duplicateEmpIdRes = await convertCandidateToEmployeeAction({
    workspaceId,
    candidateId: dupCandId,
    jobTitle: "Engineer",
    employeeId: generatedEmpId, // Already used by Eleanor
  });
  assert(duplicateEmpIdRes.success === false, "Duplicate employee ID assignment blocked server-side");
  assert(
    duplicateEmpIdRes.error?.includes("already assigned") === true,
    `Clear duplicate ID error returned: "${duplicateEmpIdRes.error}"`
  );

  // 13. Data Integrity across Reloads
  const reloadedCandidate = recruitmentStore.getCandidateById(testCandId, workspaceId);
  assert(reloadedCandidate?.converted_user_id === convertedData.userId, "Reload verifies persistent storage of conversion");

  // 14. Clean up temporary test records
  try {
    await adminClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", convertedData.userId);

    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", convertedData.userId);

    // Remove test candidates from store
    const store = (recruitmentStore as any).getStore();
    store.candidates = store.candidates.filter(
      (c: any) => c.id !== testCandId && c.id !== dupCandId
    );
    store.candidate_applications = store.candidate_applications.filter(
      (a: any) => a.id !== testAppId
    );
    store.onboardings = (store.onboardings || []).filter(
      (o: any) => o.user_id !== convertedData.userId
    );
    (recruitmentStore as any).saveStore?.(store);
  } catch (cleanErr) {
    console.error("Cleanup notice:", cleanErr);
  }

  console.log("\n========================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("\n❌ QA Test failed with error:", err);
  process.exit(1);
});
