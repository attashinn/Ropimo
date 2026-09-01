"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JobOpening, JobOpeningStatus } from "@/types/recruitment";
import { Department } from "@/types/department";
import { SearchIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { CreateJobModal } from "./create-job-modal";
import { ApplyJobModal } from "./apply-job-modal";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { updateJobOpeningStatusAction } from "@/lib/recruitment/actions";

export interface JobOpeningsViewProps {
  workspaceId: string;
  userRole: string;
  jobOpenings: JobOpening[];
  departments: Department[];
}

export function JobOpeningsView({
  workspaceId,
  userRole,
  jobOpenings,
  departments,
}: JobOpeningsViewProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [applyModalJob, setApplyModalJob] = React.useState<JobOpening | null>(null);
  const [copiedJobId, setCopiedJobId] = React.useState<string | null>(null);

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  const filteredJobs = React.useMemo(() => {
    return jobOpenings.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.department_name && job.department_name.toLowerCase().includes(q)) ||
        job.location.toLowerCase().includes(q) ||
        (job.description && job.description.toLowerCase().includes(q));

      const matchesDept = selectedDeptId === "all" || job.department_id === selectedDeptId;
      const matchesStatus = selectedStatus === "all" || job.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [jobOpenings, searchQuery, selectedDeptId, selectedStatus]);

  const handleStatusChange = async (jobId: string, newStatus: JobOpeningStatus) => {
    await updateJobOpeningStatusAction({
      workspaceId,
      jobOpeningId: jobId,
      status: newStatus,
    });
    router.refresh();
  };

  const handleCopyJobLink = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/jobs/${jobId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedJobId(jobId);
      setTimeout(() => setCopiedJobId(null), 2000);
    }
  };

  const getStatusBadgeColor = (status: JobOpeningStatus) => {
    switch (status) {
      case "Open":
        return "bg-[#EAF4E2] text-[#246244] border-[#246244]/20";
      case "Draft":
        return "bg-stone-100 text-stone-700 border-stone-200";
      case "Paused":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Closed":
        return "bg-red-50 text-red-700 border-red-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#65706A]">
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job openings by title, department, or location..."
            className="w-full rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-3.5 py-1.5 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:outline-none transition-colors shadow-2xs"
          />
        </div>

        {/* Controls Right */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <RopimoSelect
            value={selectedDeptId}
            onChange={(val) => setSelectedDeptId(val)}
            options={[
              { value: "all", label: "All Departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          {/* Status Filter */}
          <RopimoSelect
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Open", label: "Open" },
              { value: "Draft", label: "Draft" },
              { value: "Paused", label: "Paused" },
              { value: "Closed", label: "Closed" },
            ]}
          />

          {/* Secondary Action: View Public Job Board */}
          <Link
            href="/jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>View Job Board</span>
            <span>→</span>
          </Link>

          {/* Primary Action: Create Job Opening */}
          {canManage && (
            <PrimaryButton size="sm" onClick={() => setCreateModalOpen(true)}>
              + Create Job Opening
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* Jobs List / Table */}
      <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
        {filteredJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5]/70 text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  <th className="py-3 px-4">Position Title</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Type & Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Applicants</th>
                  <th className="py-3 px-3">Interviews</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DDD4]/60">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#18221E]">
                      <div>
                        <Link
                          href={`/app/people/jobs/${job.id}`}
                          className="font-bold text-[#18221E] hover:text-[#246244] transition-colors"
                        >
                          {job.title}
                        </Link>
                        {job.salary_range && (
                          <p className="text-[11px] text-[#65706A] font-normal">{job.salary_range}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[#18221E]">
                      {job.department_name ? (
                        <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold">
                          {job.department_name}
                        </span>
                      ) : (
                        <span className="text-[#65706A]">General</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[#65706A]">
                      <p className="text-[#18221E] font-medium">{job.employment_type}</p>
                      <p className="text-[11px]">{job.location}</p>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeColor(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-[#18221E]">
                      {job.applicants_count || 0}
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-[#18221E]">
                      {job.interviews_count || 0}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Public Link & Sharing actions for OPEN jobs */}
                        {job.status === "Open" ? (
                          <>
                            <a
                              href={`/jobs/${job.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-[6px] border border-[#D8DDD4] bg-white px-2 py-1 text-[11px] font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                              title="View public career page"
                            >
                              View Public Page ↗
                            </a>

                            <button
                              type="button"
                              onClick={(e) => handleCopyJobLink(job.id, e)}
                              className="rounded-[6px] border border-[#D8DDD4] bg-white px-2 py-1 text-[11px] font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                              title="Copy public link to clipboard"
                            >
                              {copiedJobId === job.id ? "✓ Link Copied" : "Share Job"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setApplyModalJob(job)}
                              className="rounded-[6px] bg-[#10251F] text-white px-2.5 py-1 text-xs font-semibold hover:bg-[#18342C] transition-colors"
                            >
                              Apply
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-[#8C9489] italic pr-1">
                            Not published
                          </span>
                        )}

                        {/* Status Manager Dropdown */}
                        {canManage && (
                          <select
                            value={job.status}
                            onChange={(e) =>
                              handleStatusChange(job.id, e.target.value as JobOpeningStatus)
                            }
                            className="rounded-[6px] border border-[#D8DDD4] bg-white px-2 py-1 text-xs text-[#18221E] focus:outline-none"
                          >
                            <option value="Open">Open</option>
                            <option value="Draft">Draft</option>
                            <option value="Paused">Paused</option>
                            <option value="Closed">Closed</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#8C9489] space-y-2">
            <p className="font-bold text-sm text-[#18221E]">No job openings found</p>
            <p>
              {canManage
                ? "Click '+ Create Job Opening' above to publish a position."
                : "No active job openings in this workspace."}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {createModalOpen && (
        <CreateJobModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          workspaceId={workspaceId}
          departments={departments}
          onSuccess={() => router.refresh()}
        />
      )}

      {applyModalJob && (
        <ApplyJobModal
          isOpen={Boolean(applyModalJob)}
          onClose={() => setApplyModalJob(null)}
          workspaceId={workspaceId}
          jobOpening={applyModalJob}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
