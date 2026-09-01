"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  WorkspacePerson,
  WorkspaceRole,
  EmploymentType,
  EmploymentStatus,
} from "@/types/people";
import { Department } from "@/types/department";
import { updatePersonDetailsAction } from "@/lib/people/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import { DatePicker } from "@/components/ui/date-picker";
import { renderDepartmentIcon } from "./department-icons";

export interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: WorkspacePerson;
  departments: Department[];
  canEditRole: boolean;
  onSuccess?: () => void;
}

function EditPersonForm({
  person,
  departments,
  canEditRole,
  onClose,
  onSuccess,
}: {
  person: WorkspacePerson;
  departments: Department[];
  canEditRole: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  const [fullName, setFullName] = React.useState(person.full_name || "");
  const [jobTitle, setJobTitle] = React.useState(person.job_title || "");
  const [phone, setPhone] = React.useState(person.phone || "");
  const [location, setLocation] = React.useState(person.location || "");
  const [employeeId, setEmployeeId] = React.useState(person.employee_id || "");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    person.employment_type || "Full-time"
  );
  const [employmentStatus, setEmploymentStatus] = React.useState<EmploymentStatus>(
    person.employment_status || "Active"
  );
  const [hireDate, setHireDate] = React.useState(
    person.hire_date ? new Date(person.hire_date).toISOString().split("T")[0] : ""
  );
  const [bio, setBio] = React.useState(person.bio || "");
  const [skillsStr, setSkillsStr] = React.useState((person.skills || []).join(", "));
  const [emergencyContactName, setEmergencyContactName] = React.useState(
    person.emergency_contact_name || ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState(
    person.emergency_contact_phone || ""
  );
  const [role, setRole] = React.useState<WorkspaceRole>(person.role);
  const [selectedDeptIds, setSelectedDeptIds] = React.useState<string[]>(
    person.departments.map((d) => d.id)
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const toggleDepartment = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await updatePersonDetailsAction({
        workspaceId: person.workspace_id,
        targetUserId: person.user_id,
        fullName,
        jobTitle,
        phone,
        location,
        employeeId,
        employmentType,
        employmentStatus,
        hireDate: hireDate ? new Date(hireDate).toISOString() : undefined,
        bio,
        skills,
        emergencyContactName,
        emergencyContactPhone,
        role: canEditRole ? role : undefined,
        departmentIds: selectedDeptIds,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update details.");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-full max-w-xl rounded-[18px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-xl text-[#18221E] my-8 max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#18221E]">
            Edit Employee Profile
          </h3>
          <p className="mt-0.5 text-xs text-[#65706A]">
            {person.email} • ID: {employeeId}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Full Name & Job Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="personFullName"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Full Name
            </label>
            <input
              id="personFullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Tashin Khan"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="personJobTitle"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Job Title
            </label>
            <input
              id="personJobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Founder & CEO, Head of Development"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Phone & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1712 345 678"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Dhaka, Bangladesh"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Employment Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contractor">Contractor</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Employment Status
            </label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Employee ID & Hire Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Employee ID
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-001"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Hire Date
            </label>
            <DatePicker
              value={hireDate}
              onChange={(val) => setHireDate(val)}
              placeholder="Select hire date"
            />
          </div>
        </div>

        {/* Bio / About */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            About / Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Overview of responsibilities, focus areas, and mandate..."
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none resize-none"
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            Skills (comma separated)
          </label>
          <input
            type="text"
            value={skillsStr}
            onChange={(e) => setSkillsStr(e.target.value)}
            placeholder="e.g. Leadership, Full Stack Development, Product Strategy"
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Emergency Contact Name
            </label>
            <input
              type="text"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="e.g. Zunairah Khan (Sister)"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              placeholder="+880 1812 345 678"
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Workspace Role (if permitted) */}
        {canEditRole && (
          <div>
            <label
              htmlFor="personRole"
              className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5"
            >
              Workspace Role
            </label>
            <select
              id="personRole"
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs font-medium text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
            >
              <option value="owner">Owner (Full office administrative control)</option>
              <option value="admin">Admin (Manage members, departments, settings)</option>
              <option value="manager">Manager (Manage department members & work)</option>
              <option value="member">Member (Regular team member)</option>
              <option value="guest">Guest (Restricted view)</option>
            </select>
          </div>
        )}

        {/* Department Multi-Select Checkboxes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            Department Membership
          </label>
          {departments.length === 0 ? (
            <p className="text-xs italic text-[#65706A]">
              No departments created in this workspace yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {departments.map((dept) => {
                const isSelected = selectedDeptIds.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept.id)}
                    className={`flex items-center gap-2.5 rounded-[10px] border p-2 text-left transition-all ${
                      isSelected
                        ? "border-[#10251F] bg-[#FAF9F5] shadow-2xs font-semibold"
                        : "border-[#D8DDD4] bg-white text-[#65706A] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    <span
                      style={{ backgroundColor: dept.color }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[#F4F3EE]"
                    >
                      {renderDepartmentIcon(dept.icon, 10)}
                    </span>
                    <span className="text-xs text-[#18221E] truncate flex-1">
                      {dept.name}
                    </span>
                    <span
                      className={`h-4 w-4 rounded-[4px] border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? "border-[#10251F] bg-[#10251F] text-white"
                          : "border-[#D8DDD4]"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </div>
      </form>
    </motion.div>
  );
}

export function EditPersonModal({
  isOpen,
  onClose,
  person,
  departments,
  canEditRole,
  onSuccess,
}: EditPersonModalProps) {
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

          <EditPersonForm
            person={person}
            departments={departments}
            canEditRole={canEditRole}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
