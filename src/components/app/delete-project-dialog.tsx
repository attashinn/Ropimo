"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { deleteProjectAction } from "@/lib/project/actions";

export interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  workspaceId: string;
  projectName: string;
}

export function DeleteProjectDialog({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  projectName,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await deleteProjectAction(projectId, workspaceId);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete project.");
        setLoading(false);
        return;
      }
      onClose();
      router.push("/app/projects");
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-md rounded-[16px] border border-red-200 bg-white p-6 shadow-xl text-[#18221E] my-8 space-y-4"
          >
            <h3 className="text-base font-bold text-red-600">
              Delete Project
            </h3>
            <p className="text-xs text-[#65706A] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[#18221E]">{projectName}</span>? This action cannot be undone and will unlink all associated deliverables.
            </p>

            {errorMsg && (
              <div className="rounded-[8px] bg-red-50 p-2 text-xs font-medium text-red-800 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8DDD4]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-[8px] px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-[8px] bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
