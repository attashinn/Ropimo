"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { deleteDepartmentAction } from "@/lib/department/actions";

export interface DeleteDepartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  workspaceId: string;
  departmentName: string;
}

export function DeleteDepartmentDialog({
  isOpen,
  onClose,
  departmentId,
  workspaceId,
  departmentName,
}: DeleteDepartmentDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await deleteDepartmentAction(departmentId, workspaceId);

      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete department.");
        setLoading(false);
        return;
      }

      onClose();
      router.push("/app/departments");
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-md rounded-[18px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-xl text-[#18221E] my-8"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700 mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 className="text-lg font-bold tracking-tight text-[#18221E]">
              Delete {departmentName}?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-[#65706A]">
              Are you sure you want to delete this department? This action cannot be undone.
            </p>

            {errorMsg && (
              <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#D8DDD4]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-[8px] bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Department"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
