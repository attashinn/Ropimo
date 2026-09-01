"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { updateProjectAction } from "@/lib/project/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

const COLOR_OPTIONS = [
  { hex: "#10251F", label: "Forest Green" },
  { hex: "#2D4A3E", label: "Pine" },
  { hex: "#5C6B53", label: "Sage" },
  { hex: "#3B5249", label: "Moss" },
  { hex: "#1B2A23", label: "Dark Emerald" },
  { hex: "#4A5D4E", label: "Slate Green" },
];

function EditProjectForm({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description || "");
  const [status, setStatus] = React.useState<ProjectStatus>(project.status);
  const [color, setColor] = React.useState(project.color || "#10251F");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await updateProjectAction({
        projectId: project.id,
        workspaceId: project.workspace_id,
        name: name.trim(),
        description,
        status,
        color,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update project.");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-xl text-[#18221E] my-8"
    >
      <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
        <h3 className="text-lg font-bold text-[#18221E]">
          Edit Project
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] p-1 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
        >
          ✕
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-[8px] bg-red-50 p-3 text-xs font-medium text-red-800 border border-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1">
            Project Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-sm text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs font-medium text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1">
              Color
            </label>
            <div className="flex items-center gap-1.5 pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === c.hex
                      ? "border-[#10251F] scale-110 shadow-xs"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
          >
            Cancel
          </button>
          <PrimaryButton size="sm" type="submit" disabled={loading || !name.trim()}>
            {loading ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </div>
      </form>
    </motion.div>
  );
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
}: EditProjectModalProps) {
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

          <EditProjectForm project={project} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
