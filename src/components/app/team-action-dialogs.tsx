"use client";

import * as React from "react";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { WorkspaceRole } from "@/types/permissions";
import {
  changeMemberRoleAction,
  changeMemberDepartmentsAction,
  setDepartmentLeadAction,
  deactivateMemberAction,
  removeMemberAction,
  getMemberOpenTasksAction,
} from "@/lib/people/actions";
import { toast } from "sonner";
import { X, AlertCircle, Check, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHANGE ROLE MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface ChangeRoleModalProps {
  person: WorkspacePerson;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES: { value: WorkspaceRole; label: string; desc: string }[] = [
  { value: "owner", label: "Owner", desc: "Full administrative, billing, and workspace destruction control." },
  { value: "admin", label: "Admin", desc: "Can manage departments, projects, and all members except owners." },
  { value: "hr", label: "HR", desc: "Can manage people, hiring, recruitment, leave, and files." },
  { value: "manager", label: "Manager", desc: "Powers apply to departments and projects they lead or manage." },
  { value: "member", label: "Member", desc: "Standard access to assigned projects, tasks, and company files." },
];

export function ChangeRoleModal({
  person,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = React.useState<WorkspaceRole>(
    (person.role as WorkspaceRole) || "member"
  );
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (selectedRole === person.role) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await changeMemberRoleAction({
        workspaceId,
        targetUserId: person.user_id || person.id,
        newRole: selectedRole,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update role");
      } else {
        toast.success(`Role updated to ${selectedRole}`);
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white border border-[#E9E6DA] p-5 shadow-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E6DA]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#111]">Change role</h3>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Select permissions level for {person.full_name || person.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex items-start gap-3 p-3 rounded-[8px] border transition-colors cursor-pointer ${
                selectedRole === r.value
                  ? "border-[#111] bg-[#F4F2EA]"
                  : "border-[#E9E6DA] hover:bg-[#FAF9F5]"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={selectedRole === r.value}
                onChange={() => setSelectedRole(r.value)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#111]">{r.label}</div>
                <div className="text-[12px] text-[#6B6B6B] leading-snug">{r.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] text-[13px] text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-[8px] bg-[#111] text-white text-[13px] font-medium hover:bg-black/90 transition-colors inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Confirm role change</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHANGE DEPARTMENTS MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface ChangeDepartmentsModalProps {
  person: WorkspacePerson;
  workspaceId: string;
  departments: Department[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeDepartmentsModal({
  person,
  workspaceId,
  departments,
  isOpen,
  onClose,
  onSuccess,
}: ChangeDepartmentsModalProps) {
  const initialDepts = (person.departments || []).map((d) => d.id);
  const [selectedDepts, setSelectedDepts] = React.useState<string[]>(initialDepts);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setSelectedDepts((person.departments || []).map((d) => d.id));
  }, [person]);

  if (!isOpen) return null;

  const toggleDept = (deptId: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await changeMemberDepartmentsAction({
        workspaceId,
        targetUserId: person.user_id || person.id,
        departmentIds: selectedDepts,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update departments");
      } else {
        toast.success("Department memberships updated");
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating departments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white border border-[#E9E6DA] p-5 shadow-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E6DA]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#111]">Change departments</h3>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Assign {person.full_name || person.email} to organizational departments
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
          {departments.length === 0 ? (
            <p className="text-[12px] text-[#9A9A9A] py-4 text-center">No departments available.</p>
          ) : (
            departments.map((dept) => {
              const checked = selectedDepts.includes(dept.id);
              return (
                <label
                  key={dept.id}
                  className={`flex items-center justify-between p-2.5 rounded-[8px] border transition-colors cursor-pointer ${
                    checked ? "border-[#111] bg-[#F4F2EA]" : "border-[#E9E6DA] hover:bg-[#FAF9F5]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDept(dept.id)}
                      className="rounded"
                    />
                    <span className="text-[13px] font-medium text-[#111] truncate">
                      {dept.name}
                    </span>
                  </div>
                  {checked && <Check className="h-3.5 w-3.5 text-[#111] shrink-0" />}
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] text-[13px] text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-[8px] bg-[#111] text-white text-[13px] font-medium hover:bg-black/90 transition-colors inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Save departments</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SET DEPARTMENT LEAD MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface SetDepartmentLeadModalProps {
  person: WorkspacePerson;
  workspaceId: string;
  departments: Department[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetDepartmentLeadModal({
  person,
  workspaceId,
  departments,
  isOpen,
  onClose,
  onSuccess,
}: SetDepartmentLeadModalProps) {
  const memberDepts = departments.filter((d) =>
    (person.departments || []).some((pd) => pd.id === d.id)
  );

  const [selectedDeptId, setSelectedDeptId] = React.useState<string>(
    memberDepts[0]?.id || departments[0]?.id || ""
  );
  const [isLead, setIsLead] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedDeptId) {
      toast.error("Please select a department");
      return;
    }

    setLoading(true);
    try {
      const res = await setDepartmentLeadAction({
        workspaceId,
        departmentId: selectedDeptId,
        targetUserId: person.user_id || person.id,
        isLead,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update department lead");
      } else {
        toast.success(isLead ? "Assigned as department lead" : "Removed as department lead");
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating department lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white border border-[#E9E6DA] p-5 shadow-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E6DA]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#111]">Department lead status</h3>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Assign or revoke lead role for {person.full_name || person.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-[#111] block mb-1">
              Select department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-[8px] border border-[#E9E6DA] bg-white text-[13px] text-[#111] outline-none focus:border-[#111]"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="leadState"
                checked={isLead}
                onChange={() => setIsLead(true)}
              />
              <span className="text-[13px] text-[#111]">Set as department lead (is_lead = true)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="leadState"
                checked={!isLead}
                onChange={() => setIsLead(false)}
              />
              <span className="text-[13px] text-[#111]">Remove department lead privileges</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] text-[13px] text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-[8px] bg-[#111] text-white text-[13px] font-medium hover:bg-black/90 transition-colors inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Update lead status</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DEACTIVATE MEMBER MODAL (With Open Tasks Reassign Prompt)
// ─────────────────────────────────────────────────────────────────────────────

interface DeactivateMemberModalProps {
  person: WorkspacePerson;
  workspaceId: string;
  allMembers: WorkspacePerson[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeactivateMemberModal({
  person,
  workspaceId,
  allMembers,
  isOpen,
  onClose,
  onSuccess,
}: DeactivateMemberModalProps) {
  const [openTasksCount, setOpenTasksCount] = React.useState<number | null>(null);
  const [reassignToUserId, setReassignToUserId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [fetchingTasks, setFetchingTasks] = React.useState(true);

  const availableMembers = allMembers.filter(
    (m) => (m.user_id || m.id) !== (person.user_id || person.id)
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setFetchingTasks(true);
    getMemberOpenTasksAction(workspaceId, person.user_id || person.id)
      .then((res) => {
        setOpenTasksCount(res.count);
      })
      .finally(() => {
        setFetchingTasks(false);
      });
  }, [isOpen, workspaceId, person]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await deactivateMemberAction({
        workspaceId,
        targetUserId: person.user_id || person.id,
        reassignToUserId: reassignToUserId || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to deactivate member");
      } else {
        toast.success(
          `Member deactivated.${
            reassignToUserId ? " Open tasks were reassigned." : ""
          }`
        );
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deactivating member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white border border-[#E9E6DA] p-5 shadow-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E6DA]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#D93025]">Deactivate member</h3>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Revoke workspace access for {person.full_name || person.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA]">
            <AlertCircle className="h-4 w-4 text-[#D93025] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#6B6B6B] leading-snug">
              A deactivated user cannot sign in or enter this workspace. Their profile and audit trail remain preserved.
            </p>
          </div>

          {fetchingTasks ? (
            <div className="py-2 text-[12px] text-[#9A9A9A] flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking assigned tasks...</span>
            </div>
          ) : openTasksCount && openTasksCount > 0 ? (
            <div className="space-y-2 p-3 rounded-[8px] border border-[#E9E6DA] bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#111]">
                  Open tasks ({openTasksCount})
                </span>
                <span className="text-[11px] text-[#D99A00] font-medium">Reassign required</span>
              </div>
              <p className="text-[12px] text-[#6B6B6B]">
                This member currently has {openTasksCount} active task(s). Select another team member to take them over:
              </p>
              <select
                value={reassignToUserId}
                onChange={(e) => setReassignToUserId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[8px] border border-[#E9E6DA] bg-white text-[13px] text-[#111] outline-none focus:border-[#111]"
              >
                <option value="">Leave unassigned</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.user_id || m.id}>
                    {m.full_name || m.email} ({m.role || "member"})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[12px] text-[#6B6B6B]">This member has 0 open tasks.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] text-[13px] text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-[8px] bg-[#D93025] text-white text-[13px] font-medium hover:bg-[#D93025]/90 transition-colors inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Deactivate user</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REMOVE MEMBER MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface RemoveMemberModalProps {
  person: WorkspacePerson;
  workspaceId: string;
  allMembers: WorkspacePerson[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveMemberModal({
  person,
  workspaceId,
  allMembers,
  isOpen,
  onClose,
  onSuccess,
}: RemoveMemberModalProps) {
  const [openTasksCount, setOpenTasksCount] = React.useState<number | null>(null);
  const [reassignToUserId, setReassignToUserId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [fetchingTasks, setFetchingTasks] = React.useState(true);

  const availableMembers = allMembers.filter(
    (m) => (m.user_id || m.id) !== (person.user_id || person.id)
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setFetchingTasks(true);
    getMemberOpenTasksAction(workspaceId, person.user_id || person.id)
      .then((res) => {
        setOpenTasksCount(res.count);
      })
      .finally(() => {
        setFetchingTasks(false);
      });
  }, [isOpen, workspaceId, person]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await removeMemberAction({
        workspaceId,
        targetUserId: person.user_id || person.id,
        reassignToUserId: reassignToUserId || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to remove member");
      } else {
        toast.success("Member removed from workspace");
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error removing member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white border border-[#E9E6DA] p-5 shadow-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E6DA]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#D93025]">Remove member</h3>
            <p className="text-[12px] text-[#6B6B6B] mt-0.5">
              Permanently remove {person.full_name || person.email} from workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1 text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] text-[12px] text-[#6B6B6B] leading-snug">
            This will permanently remove the member from all workspace departments and projects. This action is logged in the workspace audit log.
          </div>

          {!fetchingTasks && openTasksCount && openTasksCount > 0 && (
            <div className="space-y-2 p-3 rounded-[8px] border border-[#E9E6DA] bg-white">
              <span className="text-[13px] font-medium text-[#111]">
                Reassign open tasks ({openTasksCount})
              </span>
              <select
                value={reassignToUserId}
                onChange={(e) => setReassignToUserId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[8px] border border-[#E9E6DA] bg-white text-[13px] text-[#111] outline-none focus:border-[#111]"
              >
                <option value="">Leave unassigned</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.user_id || m.id}>
                    {m.full_name || m.email} ({m.role || "member"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] text-[13px] text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-[8px] bg-[#D93025] text-white text-[13px] font-medium hover:bg-[#D93025]/90 transition-colors inline-flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Permanently remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
