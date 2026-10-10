"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JobOpening, JobOpeningStatus } from "@/types/recruitment";
import { Department } from "@/types/department";
import { SearchIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import {
  updateJobOpeningStatusAction,
  duplicateJobOpeningAction,
  deleteJobOpeningAction,
} from "@/lib/recruitment/actions";

export interface JobOpeningsViewProps {
  workspaceId: string;
  workspaceSlug?: string;
  userRole: string;
  jobOpenings: JobOpening[];
  departments: Department[];
}

export function JobOpeningsView({
  workspaceId,
  workspaceSlug,
  userRole,
  jobOpenings,
  departments,
}: JobOpeningsViewProps) {
  const router = useRouter();
  const slug = workspaceSlug || workspaceId;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [peekJob, setPeekJob] = React.useState<JobOpening | null>(null);
  const [copiedJobId, setCopiedJobId] = React.useState<string | null>(null);
  const [menuOpenJobId, setMenuOpenJobId] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canManage = ["owner", "admin", "hr", "manager"].includes(userRole.toLowerCase());
  const canPublish = ["owner", "admin", "hr"].includes(userRole.toLowerCase());

  // Close row menu on document click
  React.useEffect(() => {
    const handleClickOutside = () => setMenuOpenJobId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter jobs
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
      const normStatus = (job.status || "draft").toLowerCase();
      const matchesStatus =
        selectedStatus === "all" ||
        normStatus === selectedStatus.toLowerCase() ||
        (selectedStatus === "Open" && (normStatus === "open" || normStatus === "published"));

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [jobOpenings, searchQuery, selectedDeptId, selectedStatus]);

  // Status dot and label helper
  const getStatusConfig = (status?: string | null) => {
    const s = (status || "draft").toLowerCase();
    if (s === "published" || s === "open") {
      return { dotColor: "bg-[#22C55E]", label: "Published", bg: "bg-[#EBF5EA] text-[#246244]" };
    }
    if (s === "paused") {
      return { dotColor: "bg-[#F59E0B]", label: "Paused", bg: "bg-[#FEF3C7] text-[#92400E]" };
    }
    if (s === "closed") {
      return { dotColor: "bg-[#EF4444]", label: "Closed", bg: "bg-[#FEE2E2] text-[#991B1B]" };
    }
    return { dotColor: "bg-[#9CA3AF]", label: "Draft", bg: "bg-[#F3F4F6] text-[#4B5563]" };
  };

  const calculateDaysOpen = (job: JobOpening) => {
    const dateStr = job.published_at || job.created_at;
    if (!dateStr) return 0;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const handleStatusChange = async (jobId: string, newStatus: JobOpeningStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const res = await updateJobOpeningStatusAction({
        workspaceId,
        jobOpeningId: jobId,
        status: newStatus,
      });
      if (res.success) {
        if (peekJob && peekJob.id === jobId) {
          setPeekJob({ ...peekJob, status: newStatus });
        }
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to update status.");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDuplicate = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const res = await duplicateJobOpeningAction({
        workspaceId,
        jobOpeningId: jobId,
      });
      if (res.success && res.data) {
        router.push(`/app/people/jobs/${res.data.id}/edit`);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to duplicate opening.");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft opening?")) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const res = await deleteJobOpeningAction({
        workspaceId,
        jobOpeningId: jobId,
      });
      if (res.success) {
        if (peekJob?.id === jobId) setPeekJob(null);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to delete opening.");
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleCopyLink = (job: JobOpening, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const publicUrl = `${window.location.origin}/careers/${slug}/${job.slug || job.id}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedJobId(job.id);
    setTimeout(() => setCopiedJobId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#666666]">
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job openings by title, department, or location..."
            className="w-full rounded-lg border border-[#E5E2D6] bg-white pl-9 pr-3.5 py-1.5 text-xs text-[#111111] placeholder:text-[#888888] focus:border-[#111111] focus:outline-none transition-colors shadow-2xs"
          />
        </div>

        {/* Filter Dropdowns & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <RopimoSelect
            value={selectedDeptId}
            onChange={(val) => setSelectedDeptId(val)}
            options={[
              { value: "all", label: "All departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <RopimoSelect
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "paused", label: "Paused" },
              { value: "closed", label: "Closed" },
            ]}
          />

          <Link
            href={`/careers/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC] transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>Public Careers Portal</span>
            <span>↗</span>
          </Link>

          {canManage && (
            <Link href="/app/people/jobs/new">
              <PrimaryButton size="sm">
                + New job opening
              </PrimaryButton>
            </Link>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-[#E5E2D6] bg-white shadow-2xs overflow-hidden">
        {filteredJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D6] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Location & mode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Applicants</th>
                  <th className="py-3 px-3">Days open</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D6]">
                {filteredJobs.map((job) => {
                  const statusCfg = getStatusConfig(job.status);
                  const daysOpen = calculateDaysOpen(job);
                  const normStatus = (job.status || "draft").toLowerCase();
                  const isDraft = normStatus === "draft";
                  const canDelete = isDraft && (!job.applicants_count || job.applicants_count === 0);

                  return (
                    <tr
                      key={job.id}
                      onClick={() => setPeekJob(job)}
                      className="cursor-pointer hover:bg-[#FAF9F5] transition-colors group"
                    >
                      {/* 1. Title */}
                      <td className="py-3 px-4 font-bold text-[#111111]">
                        <div>
                          <span className="text-[#111111] group-hover:underline">
                            {job.title}
                          </span>
                          {job.show_salary && (job.salary_min || job.salary_max) && (
                            <p className="text-[11px] text-[#666666] font-normal">
                              {job.currency || "$"}{job.salary_min?.toLocaleString()}
                              {job.salary_max ? ` – ${job.currency || "$"}${job.salary_max.toLocaleString()}` : "+"}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 2. Department */}
                      <td className="py-3 px-3 text-[#111111]">
                        {job.department_name ? (
                          <span className="rounded-md border border-[#E5E2D6] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#111111]">
                            {job.department_name}
                          </span>
                        ) : (
                          <span className="text-[#888888]">—</span>
                        )}
                      </td>

                      {/* 3. Location and Work Mode */}
                      <td className="py-3 px-3 text-[#666666]">
                        <p className="text-[#111111] font-medium">{job.location || "Remote"}</p>
                        <p className="text-[11px] text-[#888888] capitalize">{job.work_mode || "remote"}</p>
                      </td>

                      {/* 4. Status (Dot) */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          <span className="text-[#111111]">{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* 5. Applicants */}
                      <td className="py-3 px-3 font-semibold text-[#111111]">
                        {job.applicants_count || 0}
                      </td>

                      {/* 6. Days Open */}
                      <td className="py-3 px-3 text-[#666666]">
                        {normStatus === "draft" ? "—" : `${daysOpen}d`}
                      </td>

                      {/* 7. Row Actions Menu */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="relative inline-block text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenJobId(menuOpenJobId === job.id ? null : job.id);
                            }}
                            className="rounded-lg border border-[#E5E2D6] bg-white px-2 py-1 text-xs font-semibold text-[#111111] hover:bg-[#FAF9F5]"
                          >
                            •••
                          </button>

                          {menuOpenJobId === job.id && (
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[#E5E2D6] bg-white py-1 shadow-lg z-20 text-xs">
                              <Link
                                href={`/app/people/jobs/${job.id}/edit`}
                                className="block px-3.5 py-1.5 text-[#111111] hover:bg-[#FAF9F5] text-left font-medium"
                              >
                                Edit opening
                              </Link>

                              <button
                                type="button"
                                onClick={(e) => {
                                  setMenuOpenJobId(null);
                                  handleDuplicate(job.id, e);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-[#111111] hover:bg-[#FAF9F5]"
                              >
                                Duplicate
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  setMenuOpenJobId(null);
                                  handleCopyLink(job, e);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-[#111111] hover:bg-[#FAF9F5]"
                              >
                                {copiedJobId === job.id ? "✓ Link copied" : "Copy public link"}
                              </button>

                              {/* State transitions */}
                              {(normStatus === "published" || normStatus === "open") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setMenuOpenJobId(null);
                                    handleStatusChange(job.id, "paused", e);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 text-[#92400E] hover:bg-[#FEF3C7]"
                                >
                                  Pause opening
                                </button>
                              )}

                              {normStatus === "paused" && canPublish && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setMenuOpenJobId(null);
                                    handleStatusChange(job.id, "published", e);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 text-[#246244] hover:bg-[#EBF5EA]"
                                >
                                  Resume / Publish
                                </button>
                              )}

                              {(normStatus === "published" || normStatus === "open" || normStatus === "paused") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setMenuOpenJobId(null);
                                    handleStatusChange(job.id, "closed", e);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 text-red-600 hover:bg-red-50"
                                >
                                  Close opening
                                </button>
                              )}

                              {/* Delete (only drafts with 0 applicants) */}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setMenuOpenJobId(null);
                                    handleDelete(job.id, e);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 text-red-600 hover:bg-red-50 border-t border-[#E5E2D6] mt-1"
                                >
                                  Delete draft
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#888888] space-y-3">
            <p className="font-bold text-sm text-[#111111]">No job openings found</p>
            <p>
              {canManage
                ? "Click '+ New job opening' above to create and publish a role."
                : "No active job openings in this workspace."}
            </p>
          </div>
        )}
      </div>

      {/* 480PX SIDE PEEK DRAWER */}
      {peekJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div
            className="w-[480px] max-w-full h-full bg-white border-l border-[#E5E2D6] shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Peek Drawer Header */}
            <div className="p-5 border-b border-[#E5E2D6] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border border-[#E5E2D6] bg-[#FAF9F5]">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusConfig(peekJob.status).dotColor}`} />
                  <span className="text-[#111111]">{getStatusConfig(peekJob.status).label}</span>
                </span>
                <span className="text-xs text-[#888888]">• {calculateDaysOpen(peekJob)} days open</span>
              </div>

              <button
                type="button"
                onClick={() => setPeekJob(null)}
                className="h-7 w-7 rounded-lg border border-[#E5E2D6] flex items-center justify-center text-xs font-bold text-[#666666] hover:text-[#111111] hover:bg-[#FAF9F5]"
              >
                ✕
              </button>
            </div>

            {/* Peek Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">{peekJob.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                  <span>{peekJob.department_name || "General"}</span>
                  <span>•</span>
                  <span>{peekJob.location}</span>
                  <span>•</span>
                  <span className="capitalize">{peekJob.work_mode || "remote"}</span>
                  <span>•</span>
                  <span>{peekJob.employment_type}</span>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#E5E2D6] bg-[#FAF9F5]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Applicants</span>
                  <p className="text-lg font-extrabold text-[#111111]">{peekJob.applicants_count || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Headcount</span>
                  <p className="text-lg font-extrabold text-[#111111]">{peekJob.openings_count || 1}</p>
                </div>
              </div>

              {/* Public Link Card */}
              <div className="p-3.5 rounded-xl border border-[#E5E2D6] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Public Link</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#111111] truncate font-mono">
                    /careers/{slug}/{peekJob.slug || peekJob.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(peekJob)}
                    className="shrink-0 rounded-md border border-[#E5E2D6] px-2 py-1 text-[11px] font-semibold text-[#111111] hover:bg-[#FAF9F5]"
                  >
                    {copiedJobId === peekJob.id ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Description Preview */}
              {peekJob.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">Description</h3>
                  <div
                    className="prose prose-xs max-w-none text-xs text-[#333333] leading-relaxed line-clamp-6"
                    dangerouslySetInnerHTML={{ __html: peekJob.description }}
                  />
                </div>
              )}

              {/* Custom Questions List */}
              {peekJob.application_questions && peekJob.application_questions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E5E2D6]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                    Application Questions ({peekJob.application_questions.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {peekJob.application_questions.map((q, idx) => (
                      <li key={q.id || idx} className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] p-2.5 space-y-0.5">
                        <p className="font-semibold text-[#111111]">{q.question}</p>
                        <p className="text-[10px] text-[#888888]">
                          Type: {q.type.replace("_", " ")} {q.required ? "• Required" : "• Optional"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Peek Drawer Bottom Actions */}
            <div className="p-5 border-t border-[#E5E2D6] bg-white flex items-center justify-between gap-2">
              <Link
                href={`/app/people/jobs/${peekJob.id}/edit`}
                className="flex-1 text-center rounded-lg border border-[#E5E2D6] bg-white py-2 text-xs font-semibold text-[#111111] hover:bg-[#FAF9F5]"
              >
                Edit opening
              </Link>

              <button
                type="button"
                onClick={() => handleDuplicate(peekJob.id)}
                className="rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#FAF9F5]"
              >
                Duplicate
              </button>

              <a
                href={`/careers/${slug}/${peekJob.slug || peekJob.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[#111111] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#333333]"
              >
                View public ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
