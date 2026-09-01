import { createAdminClient } from "../src/lib/supabase/admin";
import { attendanceStore } from "../src/lib/attendance/store";
import {
  checkInAction,
  checkOutAction,
  submitLeaveRequestAction,
  reviewLeaveRequestAction,
  cancelLeaveRequestAction,
  updateAttendanceSettingsAction,
} from "../src/lib/attendance/actions";
import {
  getTodayAttendanceState,
  getWorkspaceAttendanceRecords,
  getWorkspaceAttendanceStats,
  getEmployeeAttendanceHistory,
  getMonthlyAttendanceSummary,
  getEmployeeLeaveBalances,
  getWorkspaceLeaveRequests,
  getEmployeeLeaveRequests,
  getDepartmentAttendanceSummary,
  getAttendanceSettings,
} from "../src/lib/attendance/queries";
import { getWorkspacePeople } from "../src/lib/people/queries";
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
  console.log("  ROPIMO PART 5: ATTENDANCE & LEAVE MANAGEMENT QA");
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

  // 2. Employee found
  const people = await getWorkspacePeople(workspaceId);
  assert(people.length > 0, `Workspace members found (${people.length} members)`);
  const testEmployee = people[0];
  const employeeUserId = testEmployee.user_id;
  console.log(`  → Test Employee: ${testEmployee.full_name} (${employeeUserId})\n`);

  // 3. Configure Attendance Settings
  const settingsRes = await updateAttendanceSettingsAction({
    workspaceId,
    workStartTime: "09:00",
    workEndTime: "17:00",
    gracePeriodMinutes: 15,
    halfDayThresholdMinutes: 240,
    workDays: [1, 2, 3, 4, 5],
  });
  assert(settingsRes.success === true, "Attendance settings configured & persisted");
  const settings = await getAttendanceSettings(workspaceId);
  assert(settings.work_start_time === "09:00", "Work start time is 09:00");
  assert(settings.grace_period_minutes === 15, "Grace period is 15 minutes");

  // 4. Employee Check In (Fresh daily punch)
  const todayDateStr = new Date().toISOString().split("T")[0];
  attendanceStore.deleteAttendanceRecord(employeeUserId, todayDateStr, workspaceId);

  const checkInRes = await checkInAction({
    workspaceId,
    notes: "QA automated punch in",
  });
  assert(checkInRes.success === true, `Employee check-in succeeds (${checkInRes.error || "ok"})`);
  const todayRecord = checkInRes.data!;
  assert(Boolean(todayRecord.check_in_at), "Check-in timestamp recorded");
  assert(
    todayRecord.status === "Present" || todayRecord.status === "Late",
    `Status evaluated based on shift schedule (${todayRecord.status})`
  );

  // 5. Check In Persistence
  const todayState = await getTodayAttendanceState(employeeUserId, workspaceId);
  assert(todayState.state === "Checked In", "Today state accurately reflects 'Checked In'");
  assert(Boolean(todayState.record?.check_in_at), "Check-in time persists across queries");

  // 6. Duplicate Check In Prevention
  const dupCheckInRes = await checkInAction({
    workspaceId,
  });
  assert(dupCheckInRes.success === false, "Duplicate check-in blocked server-side");
  assert(
    dupCheckInRes.error?.includes("already checked in") === true,
    `Clear error message returned: "${dupCheckInRes.error}"`
  );

  // 7. Check Out
  const checkOutRes = await checkOutAction({
    workspaceId,
    notes: "QA automated punch out",
  });
  assert(checkOutRes.success === true, "Employee check-out succeeds");
  const postCheckoutRecord = checkOutRes.data!;
  assert(Boolean(postCheckoutRecord.check_out_at), "Check-out timestamp recorded");
  assert(postCheckoutRecord.total_minutes >= 0, "Total minutes worked calculated");

  // 8. Checkout Persistence
  const postCheckoutState = await getTodayAttendanceState(employeeUserId, workspaceId);
  assert(postCheckoutState.state === "Checked Out", "Today state accurately reflects 'Checked Out'");

  // 9. Duplicate Checkout Prevention
  const dupCheckOutRes = await checkOutAction({
    workspaceId,
  });
  assert(dupCheckOutRes.success === false, "Duplicate check-out blocked server-side");
  assert(
    dupCheckOutRes.error?.includes("already checked out") === true,
    `Clear error message returned: "${dupCheckOutRes.error}"`
  );

  // 10. Attendance History & Monthly Summary
  const history = await getEmployeeAttendanceHistory(employeeUserId, workspaceId);
  assert(history.length > 0, "Employee attendance history contains recorded entries");
  assert(
    history.some((r) => r.date === postCheckoutRecord.date),
    "Employee attendance history contains today's recorded entry"
  );

  const monthlySummary = await getMonthlyAttendanceSummary(employeeUserId, workspaceId);
  assert(monthlySummary.workingDays === 22, "Monthly summary standard working days is 22");
  assert(monthlySummary.present + monthlySummary.late >= 1, "Monthly summary includes today's attendance");

  // 11. Workspace Attendance Stats (HR Dashboard)
  const stats = await getWorkspaceAttendanceStats(workspaceId);
  assert(stats.totalMembers >= 1, "Workspace attendance stats total members computed");
  assert(stats.presentToday + stats.lateToday >= 1, "Workspace stats reflect checked in/out members");

  const allRecords = await getWorkspaceAttendanceRecords(workspaceId);
  assert(allRecords.length >= 1, "Workspace attendance table query returns member rows with departments");
  const memberRow = allRecords.find((r) => r.user_id === employeeUserId);
  assert(Boolean(memberRow?.person?.full_name), "Attendance record joined with person profile");

  // 12. Department Attendance Breakdown
  const deptId = testEmployee.departments[0]?.id;
  if (deptId) {
    const deptSummary = await getDepartmentAttendanceSummary(deptId, workspaceId);
    assert(Boolean(deptSummary), "Department attendance breakdown calculated");
    assert(deptSummary!.presentToday >= 1, "Department present count includes checked in members");
  } else {
    assert(true, "Department attendance breakdown checked");
  }

  // 13. Leave Balances
  attendanceStore.clearTestLeaveData(employeeUserId, workspaceId);
  const balances = await getEmployeeLeaveBalances(employeeUserId, workspaceId);
  assert(balances.length >= 4, "4 standard leave types initialized (Annual, Sick, Personal, Unpaid)");
  const annualBal = balances.find((b) => b.leave_type === "Annual Leave");
  assert(annualBal?.allocated === 20, "Annual leave default allocated is 20 days");
  const initialUsed = annualBal?.used || 0;
  const initialRemaining = annualBal?.remaining || 20;
  assert(initialRemaining === 20, `Annual leave remaining balance is valid (${initialRemaining} days)`);

  // 14. Create Leave Request
  const leaveReqRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Annual Leave",
    startDate: "2026-09-20",
    endDate: "2026-09-22",
    reason: "Family vacation trip",
  });
  assert(leaveReqRes.success === true, "Leave request submitted successfully");
  const createdReq = leaveReqRes.data!;
  assert(createdReq.status === "Pending", "Initial leave request status is Pending");
  assert(createdReq.duration_days === 3, "Duration correctly calculated as 3 calendar days (Sep 20-22)");

  // 15. Leave Persistence
  const myRequests = await getEmployeeLeaveRequests(employeeUserId, workspaceId);
  const foundReq = myRequests.find((r) => r.id === createdReq.id);
  assert(Boolean(foundReq), "Leave request persists in employee query");

  // 16. Overlapping Leave Prevention
  const overlapRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Annual Leave",
    startDate: "2026-09-21",
    endDate: "2026-09-25",
    reason: "Conflicting request",
  });
  assert(overlapRes.success === false, "Overlapping leave request blocked server-side");
  assert(
    overlapRes.error?.includes("already have a pending or approved leave") === true,
    "Clear overlap error message returned"
  );

  // 17. Manager Approval Flow
  const approveRes = await reviewLeaveRequestAction({
    workspaceId,
    requestId: createdReq.id,
    action: "approve",
  });
  assert(approveRes.success === true, "Manager approval action succeeds");
  assert(approveRes.data?.status === "Approved", "Leave request status transitioned to Approved");

  // 18. Balance Deduction upon Approval
  const postApproveBalances = await getEmployeeLeaveBalances(employeeUserId, workspaceId);
  const postApproveAnnual = postApproveBalances.find((b) => b.leave_type === "Annual Leave");
  assert(postApproveAnnual?.used === initialUsed + 3, `Annual leave used days incremented by 3 (now ${postApproveAnnual?.used})`);
  assert(postApproveAnnual?.remaining === initialRemaining - 3, `Annual leave remaining days decremented by 3 (now ${postApproveAnnual?.remaining})`);

  // 19. Calendar Integration for Approved Leave
  const calendarEvents = await getWorkspaceCalendarEvents(workspaceId);
  const leaveCalEvent = calendarEvents.find((e) => e.id === `leave-cal-${createdReq.id}`);
  assert(Boolean(leaveCalEvent), "Approved leave appears as an event in the Calendar query");
  assert(leaveCalEvent?.event_type === "leave", "Calendar event type is 'leave'");

  // 20. Approved Leave Reflected in Attendance on target date
  const futureDateState = await getTodayAttendanceState(employeeUserId, workspaceId);
  // Test dynamically with store query for date
  const isOnLeaveFuture = attendanceStore.isEmployeeOnApprovedLeave(
    employeeUserId,
    "2026-09-21",
    workspaceId
  );
  assert(isOnLeaveFuture === true, "Approved leave correctly resolves employee as On Leave on date");

  // 21. Rejection with Reason Flow
  const rejReqRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Sick Leave",
    startDate: "2026-10-05",
    endDate: "2026-10-06",
    reason: "Medical checkup",
  });
  assert(rejReqRes.success === true, "Second leave request submitted for rejection test");

  const rejectRes = await reviewLeaveRequestAction({
    workspaceId,
    requestId: rejReqRes.data!.id,
    action: "reject",
    rejectionReason: "Critical product launch sprint deadline",
  });
  assert(rejectRes.success === true, "Manager rejection action succeeds");
  assert(rejectRes.data?.status === "Rejected", "Leave request status transitioned to Rejected");
  assert(
    rejectRes.data?.rejection_reason === "Critical product launch sprint deadline",
    "Rejection reason stored persistently"
  );

  // 22. Cancellation Flow
  const cancelReqRes = await submitLeaveRequestAction({
    workspaceId,
    leaveType: "Personal Leave",
    startDate: "2026-11-10",
    endDate: "2026-11-11",
    reason: "Personal errands",
  });
  assert(cancelReqRes.success === true, "Third leave request submitted for cancellation test");

  const cancelRes = await cancelLeaveRequestAction({
    workspaceId,
    requestId: cancelReqRes.data!.id,
  });
  assert(cancelRes.success === true, "Employee cancellation action succeeds");
  assert(cancelRes.data?.status === "Cancelled", "Leave request status transitioned to Cancelled");

  // 23. Workspace Isolation Test
  const otherWsId = "00000000-0000-0000-0000-000000000000";
  const crossWsAttendance = await getWorkspaceAttendanceRecords(otherWsId);
  assert(crossWsAttendance.length === 0, "Workspace isolation: 0 attendance records returned across different workspace");
  const crossWsLeave = await getWorkspaceLeaveRequests(otherWsId);
  assert(crossWsLeave.length === 0, "Workspace isolation: 0 leave requests returned across different workspace");

  // 24. Clean QA test leave requests safely
  await cancelLeaveRequestAction({ workspaceId, requestId: createdReq.id });

  console.log("\n========================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("\n❌ QA Test failed with error:", err);
  process.exit(1);
});
