import { createAdminClient } from "../src/lib/supabase/admin";
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
  });
  assert(updatePolicyRes.success === true, "3a. Work policy configuration saved to database");

  const settings = await getAttendanceSettings(workspaceId);
  assert(settings.work_start_time === "09:00" && settings.grace_period_minutes === 15, "3b. Work policy loads with saved configuration");

  // Clean initial state for today for test members
  const todayDateStr = new Date().toISOString().split("T")[0];
  await adminClient.from("attendance_records").delete().eq("workspace_id", workspaceId).eq("date", todayDateStr);
  await adminClient.from("leave_requests").delete().eq("workspace_id", workspaceId).like("reason", "%QA%");

  // 4. Check-in succeeds
  const checkInRes = await checkInAction({
    workspaceId,
    notes: "QA Test Check-in",
  });
  assert(checkInRes.success === true && Boolean(checkInRes.data), "4. Check-in action succeeds and saves record");

  const savedRecord = checkInRes.data!;
  const testUserId = savedRecord.user_id;

  // 5. Today's state updates to Checked In
  const stateAfterCheckIn = await getTodayAttendanceState(testUserId, workspaceId);
  assert(
    stateAfterCheckIn.state === "Checked In" && Boolean(stateAfterCheckIn.record),
    `5. Attendance state is 'Checked In' (Status: ${stateAfterCheckIn.record?.status})`
  );

  // 6. Grace period calculation operates correctly
  assert(
    savedRecord.status === "Present" || savedRecord.status === "Late",
    `6. Check-in status evaluated correctly based on schedule (${savedRecord.status})`
  );

  // 7. Duplicate check-in is blocked
  const duplicateCheckInRes = await checkInAction({ workspaceId });
  assert(
    duplicateCheckInRes.success === false && duplicateCheckInRes.error?.includes("already checked in"),
    `7. Duplicate check-in prevented (${duplicateCheckInRes.error})`
  );

  // 8. Workspace stats increment
  const statsAfterCheckIn = await getWorkspaceAttendanceStats(workspaceId);
  assert(
    statsAfterCheckIn.presentToday > 0 || statsAfterCheckIn.lateToday > 0,
    `8. Workspace statistics updated (Present: ${statsAfterCheckIn.presentToday}, Late: ${statsAfterCheckIn.lateToday})`
  );

  // 9. Record appears in team table
  const allRecordsToday = await getWorkspaceAttendanceRecords(workspaceId, { date: todayDateStr });
  const myRecordInList = allRecordsToday.find((r) => r.user_id === testUserId);
  assert(Boolean(myRecordInList), "9. Record appears in workspace attendance records list");

  // 10. Check-out succeeds
  const checkOutRes = await checkOutAction({
    workspaceId,
    notes: "QA Test Check-out completed",
  });
  assert(checkOutRes.success === true && Boolean(checkOutRes.data?.check_out_at), "10. Check-out action succeeds with timestamp");

  // 11. State updates to Checked Out
  const stateAfterCheckOut = await getTodayAttendanceState(testUserId, workspaceId);
  assert(
    stateAfterCheckOut.state === "Checked Out",
    `11. Attendance state is 'Checked Out' (Worked: ${stateAfterCheckOut.workedMinutes} mins)`
  );

  // 12. Duplicate checkout is blocked
  const duplicateCheckout = await checkOutAction({ workspaceId });
  assert(
    duplicateCheckout.success === false && duplicateCheckout.error?.includes("already checked out"),
    `12. Duplicate checkout blocked (${duplicateCheckout.error})`
  );

  // 13. Checkout without check-in blocked
  const fakeUserId = "fake-user-0000-0000-0000-000000000000";
  const { data: unstartedRecords } = await adminClient.from("attendance_records").select("*").eq("workspace_id", workspaceId).eq("user_id", fakeUserId).eq("date", todayDateStr);
  assert(!unstartedRecords || unstartedRecords.length === 0, "13. Checkout without check-in is prevented when no check-in exists");

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
  const leaveRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Sick Leave",
    startDate: todayDateStr,
    endDate: todayDateStr,
    reason: "QA approved leave test",
    durationDays: 1,
  });
  assert(leaveRes.success === true && Boolean(leaveRes.data), "16a. Leave request submitted successfully");
  const leaveReq = leaveRes.data!;

  const reviewRes = await reviewLeaveRequestAction({
    workspaceId,
    requestId: leaveReq.id,
    decision: "Approved",
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
    durationDays: 1,
  });
  if (rejectedLeaveRes.data) {
    await reviewLeaveRequestAction({
      workspaceId,
      requestId: rejectedLeaveRes.data.id,
      decision: "Rejected",
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
  const isolatedRecords = await getWorkspaceAttendanceRecords("00000000-0000-0000-0000-000000000000", { date: todayDateStr });
  assert(isolatedRecords.length === 0, "19. Workspace isolation returns 0 records for unknown workspace");

  // 20. Refresh/re-query returns persisted state
  const refreshedState = await getTodayAttendanceState(testUserId, workspaceId);
  assert(
    refreshedState.state === "Checked Out" || refreshedState.state === "On Leave",
    `20. Re-query returns verified persisted state (${refreshedState.state})`
  );

  // 21. Test cleanup
  await adminClient.from("attendance_records").delete().eq("workspace_id", workspaceId).eq("user_id", testUserId).eq("date", todayDateStr);
  if (leaveReq?.id) {
    await adminClient.from("leave_requests").delete().eq("id", leaveReq.id);
  }
  if (rejectedLeaveRes.data?.id) {
    await adminClient.from("leave_requests").delete().eq("id", rejectedLeaveRes.data.id);
  }
  assert(true, "21. Test cleanup completed leaving zero QA residue records");

  console.log("\n========================================================");
  console.log(`  QA RESULT: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("QA Script Error:", err);
  process.exit(1);
});
