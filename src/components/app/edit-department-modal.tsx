"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Department } from "@/types/department";
import { updateDepartmentAction } from "@/lib/department/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import {
  DEPARTMENT_ICON_LIST,
  renderDepartmentIcon,
} from "./department-icons";

export interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { name: "Forest", hex: "#10251F" },
  { name: "Olive", hex: "#5C6B53" },
  { name: "Navy", hex: "#1D3557" },
  { name: "Terracotta", hex: "#A04B32" },
  { name: "Slate", hex: "#475569" },
  { name: "Ochre", hex: "#B48227" },
];

function EditDepartmentForm({
  department,
  onClose,
  onSuccess,
}: {
  department: Department;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  const [name, setName] = React.useState(department.name);
  const [description, setDescription] = React.useState(department.description || "");
  const [selectedIcon, setSelectedIcon] = React.useState(department.icon || "building");
  const [selectedColor, setSelectedColor] = React.useState(department.color || COLOR_OPTIONS[0].hex);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await updateDepartmentAction({
        departmentId: department.id,
        workspaceId: department.workspace_id,
        name: trimmedName,
        description,
        icon: selectedIcon,
        color: selectedColor,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update department. Please try again.");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-full max-w-lg rounded-[18px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-xl text-[#18221E] my-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#18221E]">
            Edit Department
          </h3>
          <p className="mt-0.5 text-xs text-[#65706A]">
            Update department details and visual styling.
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] p-1.5 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors focus:outline-none"
          aria-label="Close modal"
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Name with Live Icon Preview */}
        <div>
          <label
            htmlFor="editDepartmentName"
            className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
          >
            Department Name <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: selectedColor }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[#F4F3EE] shadow-2xs transition-colors"
            >
              {renderDepartmentIcon(selectedIcon, 20)}
            </div>
            <input
              id="editDepartmentName"
              type="text"
              required
              autoFocus
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development, Design, Video Production"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-sm text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="editDepartmentDescription"
            className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
          >
            Description (optional)
          </label>
          <textarea
            id="editDepartmentDescription"
            rows={2}
            maxLength={250}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Focus area, core responsibilities, and team mandate..."
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Icon Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            Department Icon
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DEPARTMENT_ICON_LIST.map((item) => {
              const IconComponent = item.icon;
              const isSelected = selectedIcon === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedIcon(item.key)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-[8px] border p-2 text-center transition-all ${
                    isSelected
                      ? "border-[#10251F] bg-[#10251F] text-[#F4F3EE] shadow-2xs"
                      : "border-[#D8DDD4] bg-[#FAF9F5] text-[#18221E] hover:bg-[#E7EADF]"
                  }`}
                >
                  <IconComponent size={16} />
                  <span className="text-[10px] font-medium truncate w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            Department Color
          </label>
          <div className="flex items-center gap-2.5">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setSelectedColor(color.hex)}
                title={color.name}
                style={{ backgroundColor: color.hex }}
                className={`h-7 w-7 rounded-[7px] transition-transform ${
                  selectedColor === color.hex
                    ? "ring-2 ring-[#10251F] ring-offset-2 scale-110 shadow-2xs"
                    : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
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
            disabled={!isValid || loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </div>
      </form>
    </motion.div>
  );
}

export function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  onSuccess,
}: EditDepartmentModalProps) {
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

          {/* Form Dialog */}
          <EditDepartmentForm
            department={department}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
