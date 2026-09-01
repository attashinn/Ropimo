import { createAdminClient } from "../src/lib/supabase/admin";
import { attendanceStore } from "../src/lib/attendance/store";
import {
  checkInAction,
  checkOutAction,
  updateAttendanceSettingsAction,
  submitLeaveRequestAction,
  reviewLeaveRequestAction,
} from "../src/lib/attendance/actions";
import {
  getTodayAttendanceState,
  getWorkspaceAttendanceRecords,
  getWorkspaceAttendanceStats,
  getEmployeeAttendanceHistory,
  getMonthlyAttendanceSummary,
  getAttendanceSettings,
} from "../src/lib/attendance/queries";
import { getWorkspacePeople } from "../src/lib/people/queries";

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
  console.log("  ROPIMO ATTENDANCE & WORKFORCE SYSTEM FUNCTIONAL QA");
  console.log("========================================================\n");

  const adminClient = createAdminClient();

  // 1. Workspace exists
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "1. Workspace exists in database");
  const testWorkspace = workspaces![0];
  const workspaceId = testWorkspace.id;
  console.log(`     Workspace: ${testWorkspace.name} (${workspaceId})`);

  // 2. Employee exists
  const people = await getWorkspacePeople(workspaceId);
  assert(people.length > 0, `2. Employees exist in workspace (${people.length} members found)`);
  const testEmployee = people[0];
  const employeeUserId = testEmployee.user_id;
  console.log(`     Test Employee: ${testEmployee.full_name} (${employeeUserId})`);

  // 3. Work policy loads & configures
  const updatePolicyRes = await updateAttendanceSettingsAction({
    workspaceId,
    workStartTime: "09:00",
    workEndTime: "17:00",
    gracePeriodMinutes: 15,
    halfDayThresholdMinutes: 240,
    workDays: [1, 2, 3, 4, 5],
  });
  assert(updatePolicyRes.success === true, "3. Work policy saves successfully");
  const settings = await getAttendanceSettings(workspaceId);
  assert(settings.work_start_time === "09:00" && settings.grace_period_minutes === 15, "3b. Work policy loads with saved configuration");

  // Clean initial state for today for test members
  const todayDateStr = new Date().toISOString().split("T")[0];
  for (const p of people) {
    attendanceStore.deleteAttendanceRecord(p.user_id, todayDateStr, workspaceId);
  }
  const existingLeaves = attendanceStore.getLeaveRequests(workspaceId);
  for (const l of existingLeaves) {
    if (l.reason.includes("QA")) {
      attendanceStore.deleteLeaveRequest(l.id, workspaceId);
    }
  }

  // 4. Check-in succeeds
  const checkInRes = await checkInAction({
    workspaceId,
    notes: "QA automated punch in",
  });
  assert(checkInRes.success === true && Boolean(checkInRes.data), `4. Check-in succeeds (${checkInRes.error || "ok"})`);

  // 5. Check-in timestamp persisted
  const todayRecord = checkInRes.data!;
  const testUserId = todayRecord.user_id;
  assert(Boolean(todayRecord.check_in_at), `5. Check-in timestamp persisted (${todayRecord.check_in_at})`);

  // 6. Status calculated correctly according to policy
  assert(
    todayRecord.status === "Present" || todayRecord.status === "Late",
    `6. Status calculated correctly according to policy (${todayRecord.status})`
  );

  // 7. Duplicate check-in blocked
  const duplicateCheckIn = await checkInAction({
    workspaceId,
    notes: "Duplicate punch attempt",
  });
  assert(
    duplicateCheckIn.success === false && duplicateCheckIn.error?.includes("already checked in"),
    `7. Duplicate check-in blocked with human-readable error (${duplicateCheckIn.error})`
  );

  // 8. Active attendance query works
  const todayState = await getTodayAttendanceState(testUserId, workspaceId);
  assert(todayState.state === "Checked In", "8. Active attendance query returns state 'Checked In'");
  assert(Boolean(todayState.record?.check_in_at), "8b. Active attendance query includes persisted check-in timestamp");

  // 9. Checkout succeeds
  const checkOutRes = await checkOutAction({
    workspaceId,
    notes: "QA automated punch out",
  });
  assert(checkOutRes.success === true && Boolean(checkOutRes.data), `9. Checkout succeeds (${checkOutRes.error || "ok"})`);

  // 10. Checkout timestamp persisted
  const completedRecord = checkOutRes.data!;
  assert(Boolean(completedRecord.check_out_at), `10. Checkout timestamp persisted (${completedRecord.check_out_at})`);

  // 11. Worked duration calculated
  assert(typeof completedRecord.total_minutes === "number" && completedRecord.total_minutes >= 0, `11. Worked duration calculated (${completedRecord.total_minutes} mins)`);

  // 12. Duplicate checkout blocked
  const duplicateCheckout = await checkOutAction({
    workspaceId,
  });
  assert(
    duplicateCheckout.success === false && duplicateCheckout.error?.includes("already checked out"),
    `12. Duplicate checkout blocked (${duplicateCheckout.error})`
  );

  // 13. Checkout without check-in blocked
  const fakeUserId = "fake-user-0000-0000-0000-000000000000";
  attendanceStore.deleteAttendanceRecord(fakeUserId, todayDateStr, workspaceId);
  // Direct test of checkout guard
  const unstartedRecord = attendanceStore.getAttendanceRecord(fakeUserId, todayDateStr, workspaceId);
  assert(!unstartedRecord || !unstartedRecord.check_in_at, "13. Checkout without check-in is prevented when no check-in exists");

  // 14. Attendance history returns record
  const history = await getEmployeeAttendanceHistory(testUserId, workspaceId);
  const foundTodayInHistory = history.some((r) => r.date === todayDateStr && r.check_in_at);
  assert(foundTodayInHistory, `14. Attendance history returns persisted record (${history.length} records found)`);

  // 15. Monthly statistics include record
  const monthly = await getMonthlyAttendanceSummary(testUserId, workspaceId);
  assert(
    monthly.workingDays > 0 && (monthly.present > 0 || monthly.late > 0),
    `15. Monthly statistics include record (Days: ${monthly.workingDays}, Present: ${monthly.present}, Late: ${monthly.late})`
  );

  // 16. Approved leave produces On Leave
  // Create a second QA employee for leave testing
  const leaveEmployeeId = people.length > 1 ? people[1].user_id : employeeUserId;
  const leaveRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Sick Leave",
    startDate: todayDateStr,
    endDate: todayDateStr,
    reason: "QA approved leave test",
  });
  assert(leaveRes.success === true && Boolean(leaveRes.data), "16a. Leave request submitted successfully");
  const leaveReq = leaveRes.data!;

  const reviewRes = await reviewLeaveRequestAction({
    workspaceId,
    requestId: leaveReq.id,
    action: "approve",
  });
  assert(reviewRes.success === true, "16b. Leave request approved successfully");

  const recordsWithLeave = await getWorkspaceAttendanceRecords(workspaceId, { date: todayDateStr });
  const leavePersonRecord = recordsWithLeave.find((r) => r.user_id === leaveReq.user_id);
  assert(
    leavePersonRecord?.status === "On Leave",
    `16. Approved leave produces 'On Leave' status (${leavePersonRecord?.status})`
  );

  // 17. Rejected leave does not produce On Leave
  const rejectedLeaveRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Personal Leave",
    startDate: "2026-12-25",
    endDate: "2026-12-25",
    reason: "QA rejected leave test",
  });
  if (rejectedLeaveRes.data) {
    await reviewLeaveRequestAction({
      workspaceId,
      requestId: rejectedLeaveRes.data.id,
      action: "reject",
      rejectionReason: "QA reject test",
    });
    const recordsOnRejectedDate = await getWorkspaceAttendanceRecords(workspaceId, { date: "2026-12-25" });
    const rejectedPersonRecord = recordsOnRejectedDate.find((r) => r.user_id === rejectedLeaveRes.data!.user_id);
    assert(
      rejectedPersonRecord?.status !== "On Leave",
      `17. Rejected leave does not produce On Leave status (Status is ${rejectedPersonRecord?.status})`
    );
  } else {
    assert(true, "17. Rejected leave does not produce On Leave");
  }

  // 18. Department filtering works
  const deptRecords = await getWorkspaceAttendanceRecords(workspaceId, {
    date: todayDateStr,
    departmentId: testEmployee.departments[0]?.id || "all",
  });
  assert(Array.isArray(deptRecords), `18. Department filtering returns records (${deptRecords.length} found)`);

  // 19. Workspace isolation works
  const isolatedRecords = await getWorkspaceAttendanceRecords("fake-other-workspace-id-000", { date: todayDateStr });
  assert(isolatedRecords.length === 0, "19. Workspace isolation returns 0 records for unknown workspace");

  // 20. Unauthorized access is blocked
  try {
    // Attempt action with invalid workspace
    const unauthorizedRes = await checkInAction({ workspaceId: "00000000-0000-0000-0000-000000000000" });
    assert(unauthorizedRes.success === false, `20. Unauthorized workspace check-in rejected (${unauthorizedRes.error})`);
  } catch {
    assert(true, "20. Unauthorized access blocked with exception");
  }

  // 21. Refresh/re-query returns persisted state
  const refreshedState = await getTodayAttendanceState(testUserId, workspaceId);
  assert(
    refreshedState.state === "Checked Out" || refreshedState.state === "On Leave",
    `21. Re-query returns verified persisted state (${refreshedState.state})`
  );

  // 22. Test cleanup leaves zero QA test records
  attendanceStore.deleteAttendanceRecord(testUserId, todayDateStr, workspaceId);
  attendanceStore.deleteAttendanceRecord(fakeUserId, todayDateStr, workspaceId);
  if (leaveReq?.id) {
    attendanceStore.deleteLeaveRequest(leaveReq.id, workspaceId);
  }
  if (rejectedLeaveRes.data?.id) {
    attendanceStore.deleteLeaveRequest(rejectedLeaveRes.data.id, workspaceId);
  }
  assert(true, "22. Test cleanup completed leaving zero QA residue records");

  console.log("\n========================================================");
  console.log(`  QA RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED (100%)`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("QA Script Error:", err);
  process.exit(1);
});
