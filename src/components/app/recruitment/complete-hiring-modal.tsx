"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate, EmploymentType, JobOffer } from "@/types/recruitment";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { hireCandidateAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface CompleteHiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate: Candidate;
  departments: Department[];
  teamMembers?: WorkspacePerson[];
  offer?: JobOffer;
  onSuccess?: () => void;
}

export function CompleteHiringModal({
  isOpen,
  onClose,
  workspaceId,
  candidate,
  departments,
  teamMembers = [],
  offer,
  onSuccess,
}: CompleteHiringModalProps) {
  const router = useRouter();

  // Required Fields
  const [fullName, setFullName] = React.useState(candidate.full_name || "");
  const [workEmail, setWorkEmail] = React.useState(candidate.email || "");
  const [jobTitle, setJobTitle] = React.useState(
    offer?.job_title || candidate.latest_job_title || "Team Member"
  );
  const [departmentId, setDepartmentId] = React.useState(
    offer?.department_id || departments[0]?.id || ""
  );
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    offer?.employment_type || "Full-time"
  );
  const [startDate, setStartDate] = React.useState(
    offer?.start_date || new Date().toISOString().split("T")[0]
  );

  // Optional Fields
  const [personalEmail, setPersonalEmail] = React.useState("");
  const [phone, setPhone] = React.useState(candidate.phone || "");
  const [salary, setSalary] = React.useState(offer?.salary || "");
  const [location, setLocation] = React.useState(candidate.location || "");
  const [managerId, setManagerId] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState(
    candidate.employee_id || ""
  );
  const [role, setRole] = React.useState<"member" | "manager" | "admin">("member");

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await hireCandidateAction({
        workspaceId,
        candidateId: candidate.id,
        applicationId: candidate.latest_application_id,
        offerId: offer?.id,
        fullName: fullName.trim(),
        workEmail: workEmail.trim(),
        jobTitle: jobTitle.trim(),
        departmentId: departmentId || undefined,
        employmentType,
        startDate,
        salary: salary.trim() || undefined,
        location: location.trim() || undefined,
        phone: phone.trim() || undefined,
        managerId: managerId || undefined,
        employeeId: employeeId.trim() || undefined,
        role,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to complete hiring.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      router.refresh();
      if (res.data?.userId) {
        router.push(`/app/people/onboarding/${res.data.userId}`);
      }
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
            className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Hire Candidate</h2>
                <p className="text-xs text-[#65706A]">
                  Confirm details to create official employee record and initiate onboarding.
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
              <div className="rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Candidate & Position Context Badge */}
            <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#18221E]">{candidate.full_name}</span>
                <span className="rounded-full bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 px-2 py-0.5 text-[10px] font-bold">
                  Current Stage: Hired
                </span>
              </div>
              <p className="text-[11px] text-[#65706A]">
                Applied Position: <span className="font-semibold text-[#18221E]">{candidate.latest_job_title || "Team Member"}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="border-b border-[#D8DDD4]/40 pb-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#65706A] mb-3">
                  Required Employee Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Employee Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Job Title *</label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Department *</label>
                    <select
                      value={departmentId}
                      required
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Employment Type *</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Official Start Date *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#65706A] mb-3">
                  Additional Details (Optional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Employee ID</label>
                    <input
                      type="text"
                      placeholder="Auto-generated (e.g. EMP-001)"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Reporting Lead / Manager</label>
                    <select
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Salary / Compensation</label>
                    <input
                      type="text"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g. $95,000 / year"
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA / Remote"
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Workspace Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs focus:border-[#10251F] focus:outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] border border-[#D8DDD4] px-4 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] transition-colors"
                >
                  Cancel
                </button>
                <PrimaryButton size="sm" type="submit" disabled={loading}>
                  {loading ? "Hiring Candidate..." : "Confirm & Hire Employee"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
