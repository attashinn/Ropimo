"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { WorkspacePerson } from "@/types/people";
import { DepartmentRole } from "@/types/department";
import { addDepartmentMemberAction } from "@/lib/department/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface AddDepartmentMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
  workspaceId: string;
  availablePeople: WorkspacePerson[];
  onSuccess?: () => void;
}

function AddDepartmentMemberForm({
  departmentId,
  departmentName,
  workspaceId,
  availablePeople,
  onClose,
  onSuccess,
}: {
  departmentId: string;
  departmentName: string;
  workspaceId: string;
  availablePeople: WorkspacePerson[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  const [selectedUserId, setSelectedUserId] = React.useState(
    availablePeople[0]?.user_id || ""
  );
  const [role, setRole] = React.useState<DepartmentRole>("member");
  const [jobTitle, setJobTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await addDepartmentMemberAction({
        departmentId,
        workspaceId,
        userId: selectedUserId,
        role,
        jobTitle: jobTitle?.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to add member.");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-full max-w-md rounded-[18px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-xl text-[#18221E] my-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#18221E]">
            Add to {departmentName}
          </h3>
          <p className="mt-0.5 text-xs text-[#65706A]">
            Assign an existing workspace member to this department workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] p-1.5 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors focus:outline-none"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {availablePeople.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#65706A]">
          All workspace members are already assigned to this department.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="selectMember"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Select Person
            </label>
            <select
              id="selectMember"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs font-medium text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            >
              {availablePeople.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.full_name || p.email} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="deptRole"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Department Role
            </label>
            <select
              id="deptRole"
              value={role}
              onChange={(e) => setRole(e.target.value as DepartmentRole)}
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs font-medium text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            >
              <option value="member">Member — Standard access to tasks & work</option>
              <option value="manager">Manager — Can create projects & assign tasks</option>
              <option value="lead">Department Lead — Full department leadership</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="deptRoleTitle"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Role Title (optional)
            </label>
            <input
              id="deptRoleTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer, Lead Product Designer"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DDD4]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] px-4 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              size="sm"
              disabled={loading || !selectedUserId}
            >
              {loading ? "Adding..." : "Add to Department"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export function AddDepartmentMemberModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  workspaceId,
  availablePeople,
  onSuccess,
}: AddDepartmentMemberModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          <AddDepartmentMemberForm
            departmentId={departmentId}
            departmentName={departmentName}
            workspaceId={workspaceId}
            availablePeople={availablePeople}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
