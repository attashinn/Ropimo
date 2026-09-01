"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Department } from "@/types/department";
import { EmploymentType, JobOpeningStatus } from "@/types/recruitment";
import { createJobOpeningAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  departments: Department[];
  onSuccess?: () => void;
}

export function CreateJobModal({
  isOpen,
  onClose,
  workspaceId,
  departments,
  onSuccess,
}: CreateJobModalProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(departments[0]?.id || "");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [location, setLocation] = React.useState("Remote");
  const [salaryRange, setSalaryRange] = React.useState("");
  const [applicationDeadline, setApplicationDeadline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [responsibilitiesStr, setResponsibilitiesStr] = React.useState("");
  const [requirementsStr, setRequirementsStr] = React.useState("");
  const [skillsStr, setSkillsStr] = React.useState("");
  const [status, setStatus] = React.useState<JobOpeningStatus>("Open");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const isValid = title.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    const responsibilities = responsibilitiesStr
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const requirements = requirementsStr
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await createJobOpeningAction({
        workspaceId,
        departmentId: departmentId || undefined,
        title: title.trim(),
        employmentType,
        location: location.trim(),
        salaryRange: salaryRange.trim() || undefined,
        applicationDeadline: applicationDeadline || undefined,
        description: description.trim() || undefined,
        responsibilities,
        requirements,
        skills,
        status,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create job opening.");
        setLoading(false);
        return;
      }

      setTitle("");
      setDescription("");
      setResponsibilitiesStr("");
      setRequirementsStr("");
      setSkillsStr("");
      setSalaryRange("");
      setLoading(false);
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3.5">
              <div>
                <h2 className="text-lg font-bold text-[#18221E]">Create Job Opening</h2>
                <p className="text-xs text-[#65706A]">
                  Post a new job opening for recruitment and applicant tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-[8px] bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Job Title */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Fullstack Engineer"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Department & Employment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              {/* Location & Salary Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote / San Francisco, CA"
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $120k – $150k USD"
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Application Deadline & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as JobOpeningStatus)}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="Open">Open</option>
                    <option value="Draft">Draft</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Job Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of the position, mission, and team culture..."
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Responsibilities (one per line)
                </label>
                <textarea
                  rows={3}
                  value={responsibilitiesStr}
                  onChange={(e) => setResponsibilitiesStr(e.target.value)}
                  placeholder="Design and implement distributed backend services&#10;Lead architectural design discussions"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Requirements (one per line)
                </label>
                <textarea
                  rows={3}
                  value={requirementsStr}
                  onChange={(e) => setRequirementsStr(e.target.value)}
                  placeholder="5+ years experience with React and TypeScript&#10;Deep understanding of SQL and database indexing"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Required Skills */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="React, TypeScript, Next.js, PostgreSQL, Tailwind CSS"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" disabled={!isValid || loading}>
                  {loading ? "Creating..." : "Create Job Opening"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
