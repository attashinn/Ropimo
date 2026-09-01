"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/types/leave";
import { Department } from "@/types/department";
import {
  cancelLeaveRequestAction,
  reviewLeaveRequestAction,
  submitLeaveRequestAction,
} from "@/lib/attendance/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import { DatePicker } from "@/components/ui/date-picker";

export interface LeaveDashboardViewProps {
  workspaceId: string;
  userRole: string;
  currentUserId: string;
  balances: LeaveBalance[];
  myRequests: LeaveRequest[];
  allRequests: LeaveRequest[];
  departments: Department[];
}

export function LeaveDashboardView({
  workspaceId,
  userRole,
  currentUserId,
  balances,
  myRequests,
  allRequests,
  departments,
}: LeaveDashboardViewProps) {
  const router = useRouter();
  const isDeptLead = departments.some((d) => d.lead_id === currentUserId);
  const isOwnerOrAdmin = ["owner", "admin", "manager"].includes(userRole);
  const canManage = isOwnerOrAdmin || isDeptLead;

  const leadDeptIds = React.useMemo(() => {
    return new Set(
      departments.filter((d) => d.lead_id === currentUserId).map((d) => d.id)
    );
  }, [departments, currentUserId]);

  const pendingRequests = React.useMemo(() => {
    return allRequests.filter((r) => {
      if (r.status !== "Pending") return false;
      if (isOwnerOrAdmin) return true;
      return r.person?.departments?.some((d) => leadDeptIds.has(d.id));
    });
  }, [allRequests, isOwnerOrAdmin, leadDeptIds]);

  const [activeTab, setActiveTab] = React.useState<"my_leaves" | "pending_approvals" | "team_leaves">(
    canManage && allRequests.some((r) => r.status === "Pending") ? "pending_approvals" : "my_leaves"
  );

  // Request Modal state
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<LeaveType>("Annual Leave");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = React.useState("");
  const [submittingRequest, setSubmittingRequest] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  // Reject Modal state
  const [rejectingRequest, setRejectingRequest] = React.useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);

  // Filter states
  const [filterDepartment, setFilterDepartment] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");

  const filteredTeamRequests = React.useMemo(() => {
    return allRequests.filter((r) => {
      const matchDept =
        filterDepartment === "all" ||
        r.department_name === filterDepartment ||
        r.person?.departments?.some((d) => d.name === filterDepartment || d.id === filterDepartment);
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchDept && matchStatus;
    });
  }, [allRequests, filterDepartment, filterStatus]);

  // Calculate working days duration preview
  const durationDays = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day >= 1 && day <= 5) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [startDate, endDate]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestError(null);

    try {
      const res = await submitLeaveRequestAction({
        workspaceId,
        leaveType,
        startDate,
        endDate,
        reason,
      });

      if (!res.success) {
        setRequestError(res.error || "Failed to submit leave request.");
        setSubmittingRequest(false);
        return;
      }

      setReason("");
      setRequestModalOpen(false);
      router.refresh();
    } catch {
      setRequestError("An unexpected error occurred.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setSubmittingReview(true);
    try {
      await reviewLeaveRequestAction({
        workspaceId,
        requestId,
        action: "approve",
      });
      router.refresh();
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectionReason.trim()) return;

    setSubmittingReview(true);
    try {
      await reviewLeaveRequestAction({
        workspaceId,
        requestId: rejectingRequest.id,
        action: "reject",
        rejectionReason: rejectionReason.trim(),
      });
      setRejectingRequest(null);
      setRejectionReason("");
      router.refresh();
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;
    await cancelLeaveRequestAction({
      workspaceId,
      requestId,
    });
    router.refresh();
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "Approved":
        return "bg-[#EAF4E2] text-[#246244] border-[#246244]/20";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Cancelled":
        return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8DDD4] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#18221E]">Leave Management</h1>
          <p className="text-xs text-[#65706A] mt-0.5">
            Request time off, monitor leave balances, and review team absence requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("my_leaves")}
              className={`rounded-[8px] px-3 py-1 transition-colors ${
                activeTab === "my_leaves"
                  ? "bg-[#10251F] text-white shadow-2xs"
                  : "text-[#65706A] hover:text-[#18221E]"
              }`}
            >
              My Leaves
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => setActiveTab("pending_approvals")}
                className={`rounded-[8px] px-3 py-1 transition-colors flex items-center gap-1.5 ${
                  activeTab === "pending_approvals"
                    ? "bg-[#10251F] text-white shadow-2xs"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                <span>Pending Approvals</span>
                {pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => setActiveTab("team_leaves")}
                className={`rounded-[8px] px-3 py-1 transition-colors ${
                  activeTab === "team_leaves"
                    ? "bg-[#10251F] text-white shadow-2xs"
                    : "text-[#65706A] hover:text-[#18221E]"
                }`}
              >
                Team History
              </button>
            )}
          </div>

          <PrimaryButton size="sm" onClick={() => setRequestModalOpen(true)}>
            + Request Leave
          </PrimaryButton>
        </div>
      </div>

      {/* 2. LEAVE BALANCES (4 TILES) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div
            key={b.leave_type}
            className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#18221E]">{b.leave_type}</span>
              <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[10px] font-semibold text-[#65706A]">
                {b.allocated > 0 ? `${b.allocated} Allocated` : "Standard"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#18221E]">{b.remaining}</span>
              <span className="text-xs text-[#65706A]">days remaining</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#65706A] pt-2 border-t border-[#D8DDD4]/50">
              <span>Used: {b.used} days</span>
              <span>Available: {b.remaining} days</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. TAB CONTENT */}

      {/* MY LEAVES TAB */}
      {activeTab === "my_leaves" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#D8DDD4] bg-[#FAF9F5]/70 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
              My Leave Requests
            </h3>
            <span className="text-[11px] text-[#65706A]">{myRequests.length} total requests</span>
          </div>

          {myRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D8DDD4] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DDD4]/60">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#18221E]">{req.leave_type}</td>
                      <td className="py-3.5 px-4 font-medium text-[#18221E]">
                        {req.start_date} → {req.end_date}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#18221E]">
                        {req.duration_days} {req.duration_days === 1 ? "day" : "days"}
                      </td>
                      <td className="py-3.5 px-4 text-[#65706A] max-w-xs truncate">
                        {req.reason}
                        {req.rejection_reason && (
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            Rejection Note: {req.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(req.status === "Pending" || req.status === "Approved") && (
                          <button
                            type="button"
                            onClick={() => handleCancel(req.id)}
                            className="rounded-[6px] border border-[#D8DDD4] px-2.5 py-1 text-[11px] font-semibold text-[#65706A] hover:text-rose-600 hover:border-rose-200 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8C9489]">
              No leave requests submitted yet. Click &quot;+ Request Leave&quot; to apply for time off.
            </div>
          )}
        </div>
      )}

      {/* PENDING APPROVALS TAB */}
      {activeTab === "pending_approvals" && canManage && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#D8DDD4] bg-[#FAF9F5]/70 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
              Pending Leave Approvals
            </h3>
            <span className="text-[11px] font-semibold text-amber-700">
              {pendingRequests.length} pending review
            </span>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D8DDD4] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Leave Type</th>
                    <th className="py-3 px-3">Dates</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DDD4]/60">
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#18221E]">
                        {req.person?.full_name || "Employee"}
                        <p className="text-[11px] font-normal text-[#65706A]">{req.person?.email}</p>
                      </td>
                      <td className="py-3.5 px-3 text-[#18221E]">
                        <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold">
                          {req.department_name || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#18221E]">{req.leave_type}</td>
                      <td className="py-3.5 px-3 text-[#18221E]">
                        {req.start_date} → {req.end_date}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-[#18221E]">
                        {req.duration_days} {req.duration_days === 1 ? "day" : "days"}
                      </td>
                      <td className="py-3.5 px-4 text-[#65706A] max-w-xs">{req.reason}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={submittingReview}
                            onClick={() => handleApprove(req.id)}
                            className="rounded-[6px] bg-[#10251F] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#1c3f35] transition-colors shadow-2xs"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            disabled={submittingReview}
                            onClick={() => setRejectingRequest(req)}
                            className="rounded-[6px] border border-rose-200 bg-white text-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8C9489]">
              No pending leave requests to review at this time.
            </div>
          )}
        </div>
      )}

      {/* TEAM HISTORY TAB */}
      {activeTab === "team_leaves" && canManage && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#D8DDD4] bg-[#FAF9F5]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
                Workspace Leave History
              </h3>
              <span className="text-[11px] text-[#65706A]">{filteredTeamRequests.length} matching entries</span>
            </div>

            <div className="flex items-center gap-2">
              {departments.length > 0 && (
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs text-[#18221E] focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs text-[#18221E] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredTeamRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D8DDD4] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Leave Type</th>
                    <th className="py-3 px-3">Dates</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DDD4]/60">
                  {filteredTeamRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#18221E]">
                        {req.person?.full_name || "Employee"}
                      </td>
                      <td className="py-3.5 px-3 text-[#18221E]">
                        <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold">
                          {req.department_name || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#18221E]">{req.leave_type}</td>
                      <td className="py-3.5 px-3 text-[#18221E]">
                        {req.start_date} → {req.end_date}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-[#18221E]">
                        {req.duration_days} {req.duration_days === 1 ? "day" : "days"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#65706A]">
                        {req.reviewer?.full_name ? (
                          <span>{req.reviewer.full_name}</span>
                        ) : req.reviewed_at ? (
                          <span>Admin Review</span>
                        ) : (
                          <span className="text-[#8A958F]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8C9489]">No matching leave records found.</div>
          )}
        </div>
      )}

      {/* 4. REQUEST LEAVE MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setRequestModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Request Time Off</h2>
                <p className="text-xs text-[#65706A]">
                  Submit a leave application for manager & HR review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="p-1 text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            {requestError && (
              <div className="rounded-[8px] bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Start Date *</label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="Select start date"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">End Date *</label>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="Select end date"
                  />
                </div>
              </div>

              {/* Calculated Duration pill */}
              <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-3 flex items-center justify-between">
                <span className="text-[#65706A]">Total Calculated Duration:</span>
                <span className="font-bold text-xs text-[#18221E]">
                  {durationDays} {durationDays === 1 ? "Working Day" : "Working Days"}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Reason / Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for this leave request..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs focus:border-[#10251F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="rounded-[8px] border border-[#D8DDD4] px-4 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <PrimaryButton size="sm" type="submit" disabled={submittingRequest || durationDays <= 0}>
                  {submittingRequest ? "Submitting..." : "Submit Leave Request"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. REJECT CONFIRMATION MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setRejectingRequest(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <h2 className="text-base font-bold text-[#18221E]">Reject Leave Request</h2>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="p-1 text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
              <p className="text-xs text-[#65706A]">
                Please explain why this request for <strong className="text-[#18221E]">{rejectingRequest.person?.full_name}</strong> is being rejected.
              </p>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Critical project sprint deadline, team coverage needed..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs focus:border-[#10251F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="rounded-[8px] border border-[#D8DDD4] px-4 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || !rejectionReason.trim()}
                  className="rounded-[8px] bg-rose-600 text-white px-4 py-2 text-xs font-bold hover:bg-rose-700 transition-colors shadow-2xs"
                >
                  {submittingReview ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
