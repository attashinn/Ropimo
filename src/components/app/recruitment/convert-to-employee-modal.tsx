"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate, CandidateApplication, EmploymentType } from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { convertCandidateToEmployeeAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface ConvertToEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate: Candidate;
  application?: CandidateApplication;
  departments: Department[];
  teamMembers?: WorkspacePerson[];
  onSuccess?: () => void;
}

export function ConvertToEmployeeModal({
  isOpen,
  onClose,
  workspaceId,
  candidate,
  application,
  departments,
  teamMembers = [],
  onSuccess,
}: ConvertToEmployeeModalProps) {
  const router = useRouter();

  const [employeeId, setEmployeeId] = React.useState(
    candidate.employee_id || `EMP-${Math.floor(100 + Math.random() * 900)}`
  );
  const [workEmail, setWorkEmail] = React.useState(candidate.email || "");
  const [personalEmail, setPersonalEmail] = React.useState(candidate.email || "");
  const [phone, setPhone] = React.useState(candidate.phone || "");
  const [jobTitle, setJobTitle] = React.useState(
    application?.job_opening?.title || candidate.latest_job_title || "Team Member"
  );
  const [departmentId, setDepartmentId] = React.useState(
    application?.job_opening?.department_id || candidate.hired_department_id || departments[0]?.id || ""
  );
  const [role, setRole] = React.useState<"member" | "manager" | "admin">("member");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    (application?.job_opening?.employment_type as EmploymentType) || "Full-time"
  );
  const [startDate, setStartDate] = React.useState(
    candidate.hired_start_date || new Date().toISOString().split("T")[0]
  );
  const [managerId, setManagerId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const appliedPosition =
    application?.job_opening?.title || candidate.latest_job_title || "Direct Application";
  const appliedDept =
    application?.job_opening?.department_name ||
    departments.find((d) => d.id === application?.job_opening?.department_id)?.name ||
    "General";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      setErrorMsg("Job Title is required.");
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg("Employee ID is required.");
      return;
    }
    if (!workEmail.trim()) {
      setErrorMsg("Work Email is required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await convertCandidateToEmployeeAction({
        workspaceId,
        candidateId: candidate.id,
        applicationId: application?.id || candidate.latest_application_id,
        fullName: candidate.full_name,
        workEmail: workEmail.trim(),
        personalEmail: personalEmail.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        employeeId: employeeId.trim(),
        departmentId: departmentId || undefined,
        role,
        employmentType,
        startDate,
        managerId: managerId || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to convert candidate to employee.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Convert Candidate to Employee</h2>
                <p className="text-xs text-[#65706A]">
                  Finalize employment details and activate employee membership.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Candidate Summary Card */}
            <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                    Candidate Details
                  </span>
                  <p className="font-bold text-sm text-[#18221E]">{candidate.full_name}</p>
                </div>
                <span className="rounded-full bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 px-2.5 py-0.5 text-[10px] font-bold">
                  Hired
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                <div>
                  <span className="text-[#65706A] block">Email:</span>
                  <span className="font-medium text-[#18221E] truncate block">{candidate.email}</span>
                </div>
                <div>
                  <span className="text-[#65706A] block">Phone:</span>
                  <span className="font-medium text-[#18221E]">{candidate.phone || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-[#65706A] block">Applied Position:</span>
                  <span className="font-medium text-[#18221E] truncate block">{appliedPosition}</span>
                </div>
                <div>
                  <span className="text-[#65706A] block">Department:</span>
                  <span className="font-medium text-[#18221E]">{appliedDept}</span>
                </div>
              </div>
            </div>

            {/* Employee Information Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-001"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Assigned Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="">No Department Assigned</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Workspace Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Reporting Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  >
                    <option value="">No Manager Assigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email} ({m.job_title || m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="candidate@gmail.com"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-4 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" disabled={loading} size="sm">
                  {loading ? "Converting Candidate..." : "Confirm & Convert to Employee"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
