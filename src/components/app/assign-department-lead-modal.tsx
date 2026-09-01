"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { assignDepartmentLeadAction } from "@/lib/department/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import { DepartmentWithStats } from "@/types/department";

export interface AssignDepartmentLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentWithStats;
  workspaceId: string;
  onSuccess?: () => void;
}

export function AssignDepartmentLeadModal({
  isOpen,
  onClose,
  department,
  workspaceId,
  onSuccess,
}: AssignDepartmentLeadModalProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = React.useState<string>(
    department.members?.[0]?.id || ""
  );
  const [jobTitle, setJobTitle] = React.useState("Department Lead");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (department.members && department.members.length > 0) {
      setSelectedUserId(department.members[0].id);
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await assignDepartmentLeadAction(
        department.id,
        workspaceId,
        selectedUserId,
        jobTitle.trim() || "Department Lead"
      );

      if (!res.success) {
        setErrorMsg(res.error || "Failed to assign department lead.");
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

  if (!isOpen) return null;

  const hasMembers = department.members && department.members.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#10251F]/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E]"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#18221E]">
              Assign Department Lead
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p className="mt-1 text-xs text-[#65706A]">
            Select an existing member of <span className="font-bold text-[#18221E]">{department.name}</span> to appoint as Lead.
          </p>

          {errorMsg && (
            <div className="mt-3 rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
              {errorMsg}
            </div>
          )}

          {!hasMembers ? (
            <div className="mt-5 rounded-[12px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-5 text-center">
              <p className="text-xs text-[#65706A]">
                This department currently has no members.
              </p>
              <p className="mt-1 text-[11px] text-[#8A958F]">
                Add team members to <span className="font-semibold text-[#18221E]">{department.name}</span> in the department People tab first.
              </p>
              <div className="mt-4 flex justify-center">
                <a
                  href={`/app/departments/${department.id}`}
                  className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#18342C] transition-colors"
                >
                  Open {department.name}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#65706A] mb-1">
                  Select Department Member
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-medium text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
                >
                  {department.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#65706A] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Department Lead, Tech Lead"
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-[#F0EFEA]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] transition-colors"
                >
                  Cancel
                </button>
                <PrimaryButton
                  type="submit"
                  disabled={loading || !selectedUserId}
                  className="px-4 py-1.5 text-xs"
                >
                  {loading ? "Assigning..." : "Assign as Lead"}
                </PrimaryButton>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
