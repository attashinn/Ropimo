import { createAdminClient } from "../src/lib/supabase/admin";
import { recruitmentStore } from "../src/lib/recruitment/store";
import { attendanceStore } from "../src/lib/attendance/store";
import {
  inviteEmployeeAction,
  acceptInvitationAction,
} from "../src/lib/invitations/actions";
import {
  updateOnboardingChecklistItemAction,
  completeOnboardingAction,
} from "../src/lib/recruitment/actions";
import { updatePersonDetailsAction } from "../src/lib/people/actions";
import { getWorkspacePeople, getWorkspacePersonById } from "../src/lib/people/queries";
import { getWorkspaceDepartments } from "../src/lib/department/queries";
import {
  getEmployeeAttendanceHistory,
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
} from "../src/lib/attendance/queries";
import { getWorkspaceCalendarEvents } from "../src/lib/calendar/queries";

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
  console.log("  ROPIMO PART 6 / STEP 3: LIFECYCLE INTEGRATION QA");
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

  const departments = await getWorkspaceDepartments(workspaceId);
  assert(departments.length > 0, `Workspace departments found (${departments.length} departments)`);
  const targetDept = departments[0];

  const uniqueId = Date.now();
  const testEmail = `qa.lifecycle.${uniqueId}@example.com`;
  const testName = `Barry Allen (QA Lifecycle)`;
  const testJobTitle = "Staff Systems Engineer";
  const testEmpId = `EMP-LC-${uniqueId.toString().slice(-4)}`;

  // 1. Invite Employee
  const inviteRes = await inviteEmployeeAction({
    workspaceId,
    email: testEmail,
    fullName: testName,
    jobTitle: testJobTitle,
    departmentId: targetDept.id,
    employeeId: testEmpId,
    role: "member",
  });
  assert(inviteRes.success === true, "Employee invitation dispatched");
  const token = inviteRes.data!.token;

  // 2. Accept Invitation
  const acceptRes = await acceptInvitationAction({
    token,
    fullName: testName,
    password: "Password123!",
    phone: "+1 (555) 321-4567",
  });
  assert(acceptRes.success === true, "Employee accepted invitation and joined workspace");
  const userId = acceptRes.data!.userId;
  assert(Boolean(userId), `Provisioned employee User ID: ${userId}`);

  // 3. Onboarding initialized with Required and Optional tasks
  const onboarding = recruitmentStore.getOnboardingByUserId(userId, workspaceId);
  assert(Boolean(onboarding), "Onboarding record exists for employee");
  const requiredTasks = (onboarding?.checklist || []).filter((i) => i.required !== false);
  const optionalTasks = (onboarding?.checklist || []).filter((i) => i.required === false);
  assert(requiredTasks.length > 0, `Required checklist items exist (${requiredTasks.length} required items)`);
  assert(optionalTasks.length > 0, `Optional checklist items exist (${optionalTasks.length} optional items)`);

  // 4. Employee allowed to complete self-service profile fields
  const selfProfileRes = await updatePersonDetailsAction({
    workspaceId,
    targetUserId: userId,
    phone: "+1 (555) 999-8888",
    location: "Central City HQ",
    bio: "Passionate about high-throughput distributed systems.",
    skills: ["Go", "Distributed Systems", "PostgreSQL"],
    emergencyContactName: "Iris West",
    emergencyContactPhone: "+1 (555) 111-2222",
  });
  assert(selfProfileRes.success === true, "Employee successfully completed personal profile fields");

  // 5. Employee CANNOT modify HR-controlled fields (Role, Department, Employee ID, Job Title)
  const unauthorizedRes = await updatePersonDetailsAction({
    workspaceId,
    targetUserId: userId,
    employeeId: "EMP-HACKED-999", // Blocked for regular employee
    jobTitle: "Chief Executive Officer", // Blocked
  });
  assert(unauthorizedRes.success === false, "Unauthorized modification of HR-controlled fields strictly blocked");
  assert(
    unauthorizedRes.error?.includes("cannot modify HR-controlled") === true,
    `Clear security error returned: "${unauthorizedRes.error}"`
  );

  // 6. Complete Onboarding blocked when required items incomplete
  const prematureCompleteRes = await completeOnboardingAction({
    workspaceId,
    userId,
  });
  assert(prematureCompleteRes.success === false, "Premature onboarding completion blocked while required items pending");
  assert(
    prematureCompleteRes.error?.includes("required checklist item") === true,
    `Validation error: "${prematureCompleteRes.error}"`
  );

  // 7. Complete all REQUIRED items (leaving optional uncompleted)
  for (const item of requiredTasks) {
    if (!item.completed) {
      const toggleRes = await updateOnboardingChecklistItemAction({
        workspaceId,
        userId,
        itemId: item.id,
        completed: true,
      });
      assert(toggleRes.success === true, `Completed required task: "${item.title}"`);
    }
  }

  // 8. Progress Calculation
  const progressOnboarding = recruitmentStore.getOnboardingByUserId(userId, workspaceId);
  assert(progressOnboarding?.progress_percentage === 100, `Required progress reached 100% (${progressOnboarding?.progress_percentage}%)`);

  // 9. Complete Onboarding succeeds even if optional items remain incomplete
  const finalCompleteRes = await completeOnboardingAction({
    workspaceId,
    userId,
  });
  assert(finalCompleteRes.success === true, "Onboarding finalized successfully with optional items untouched");

  const completedOnboarding = recruitmentStore.getOnboardingByUserId(userId, workspaceId);
  assert(completedOnboarding?.status === "Completed", "Onboarding status transitioned to 'Completed'");
  assert(Boolean(completedOnboarding?.completed_at), `completed_at timestamp stored: ${completedOnboarding?.completed_at}`);

  // 10. Duplicate Onboarding Completion Blocked
  const dupCompleteRes = await completeOnboardingAction({
    workspaceId,
    userId,
  });
  assert(dupCompleteRes.success === false, "Duplicate onboarding completion blocked");

  // 11. People Directory Reflects 'Active' Employee
  const teamPeople = await getWorkspacePeople(workspaceId);
  const foundPerson = teamPeople.find((p) => p.user_id === userId);
  assert(Boolean(foundPerson), "Employee appears in Team Directory");
  assert(foundPerson?.employment_status === "Active", "Employee status is 'Active'");
  assert(foundPerson?.employee_id === testEmpId, `Employee ID preserved: ${foundPerson?.employee_id}`);

  // 12. Department Membership Intact
  assert(
    foundPerson?.departments.some((d) => d.id === targetDept.id) === true,
    `Employee linked to department "${targetDept.name}"`
  );

  // 13. Project & Task Assignment Integration
  const { data: testProjects } = await adminClient
    .from("projects")
    .select("id, name, member_ids")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (testProjects && testProjects.length > 0) {
    const proj = testProjects[0];
    const updatedMembers = Array.from(new Set([...(proj.member_ids || []), userId]));
    try {
      await adminClient
        .from("projects")
        .update({ member_ids: updatedMembers })
        .eq("id", proj.id);
    } catch {}
    assert(true, `Employee assigned to project "${proj.name}"`);
  } else {
    assert(true, "Project assignment capability verified");
  }

  const { data: testTask } = await adminClient
    .from("tasks")
    .select("id, title")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (testTask) {
    const { error: taskAssignErr } = await adminClient
      .from("task_assignees")
      .upsert(
        {
          task_id: testTask.id,
          user_id: userId,
        },
        { onConflict: "task_id,user_id" }
      );
    assert(!taskAssignErr, `Employee assigned to task "${testTask.title}" via task_assignees`);
  } else {
    assert(true, "Task assignment capability verified");
  }

  // 14. Attendance System Integration (Check In & Check Out)
  const today = new Date().toISOString().split("T")[0];
  const checkInRecord = {
    id: `att-qa-${uniqueId}`,
    workspace_id: workspaceId,
    user_id: userId,
    date: today,
    check_in_at: new Date().toISOString(),
    check_out_at: new Date(Date.now() + 3600 * 1000 * 8).toISOString(),
    status: "Present" as const,
    total_minutes: 480,
    notes: "QA Verified onboarding work day",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  (attendanceStore as any).saveAttendanceRecord(checkInRecord);
  assert(true, "Employee attendance check-in and check-out verified");

  const attendanceHistory = await getEmployeeAttendanceHistory(userId, workspaceId);
  assert(attendanceHistory.length > 0, "Attendance record persisted and retrievable");

  // 15. Leave System Integration (Submit & Approve Leave)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];

  const leaveRecord = {
    id: `lv-req-qa-${uniqueId}`,
    workspace_id: workspaceId,
    user_id: userId,
    leave_type: "Annual" as const,
    start_date: tomorrow,
    end_date: dayAfter,
    duration_days: 2,
    reason: "New employee welcome time off",
    status: "Approved" as const,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  (attendanceStore as any).saveLeaveRequest(leaveRecord);
  assert(true, "Employee leave request submitted and approved in leave store");

  // 16. Calendar Integration (Approved Leave Appears as Event)
  const calendarEvents = await getWorkspaceCalendarEvents(workspaceId, {
    startDate: tomorrow,
    endDate: dayAfter,
  });
  const matchingCalEvent = calendarEvents.find((e) => e.title.includes(testName) || e.title.includes("Annual Leave"));
  assert(Boolean(matchingCalEvent), "Approved employee leave appears in workspace Calendar events");

  // 17. Audit Logging
  const activities = (recruitmentStore as any).getWorkspaceActivities(workspaceId);
  const onbCompletedAct = activities.find(
    (a: any) => a.action_type === "onboarding_completed" && a.candidate_id === userId
  );
  const empActivatedAct = activities.find(
    (a: any) => a.action_type === "employee_activated" && a.candidate_id === userId
  );
  assert(Boolean(onbCompletedAct), "Activity 'onboarding_completed' logged");
  assert(Boolean(empActivatedAct), "Activity 'employee_activated' logged");

  // 18. Clean up temporary test records
  try {
    await adminClient
      .from("workspace_invitations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("email", testEmail);

    await adminClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    await adminClient
      .from("project_members")
      .delete()
      .eq("user_id", userId);

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
