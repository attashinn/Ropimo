import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getJobOpeningById } from "@/lib/recruitment/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { ShareJobButton } from "@/components/app/recruitment/share-job-button";

export const metadata = {
  title: "Job Opening Details — Ropimo",
};

export default async function JobDetailPage(props: {
  params: Promise<{ jobId: string }>;
}) {
  const params = await props.params;
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    notFound();
  }

  const [job, departments] = await Promise.all([
    getJobOpeningById(params.jobId, workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-24 text-[#18221E]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link href="/app" className="hover:text-[#18221E]">
          {workspace?.name || "Workspace"}
        </Link>
        <span>/</span>
        <Link href="/app/people" className="hover:text-[#18221E]">
          People
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#18221E]">{job.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#18221E]">{job.title}</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                job.status === "Open"
                  ? "bg-[#EAF4E2] text-[#246244] border-[#246244]/20"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}
            >
              {job.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#65706A]">
            {job.department_name || "General Department"} • {job.employment_type} • {job.location}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ShareJobButton jobId={job.id} isPublic={job.status === "Open"} />
          <Link
            href="/app/people"
            className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
          >
            ← Back to People
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Total Applicants
          </span>
          <p className="text-2xl font-bold tracking-tight text-[#18221E] mt-1">
            {job.applicants_count || 0}
          </p>
        </div>

        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Interviews Conducted
          </span>
          <p className="text-2xl font-bold tracking-tight text-[#18221E] mt-1">
            {job.interviews_count || 0}
          </p>
        </div>

        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
            Compensation Range
          </span>
          <p className="text-lg font-bold tracking-tight text-[#18221E] mt-1">
            {job.salary_range || "Not specified"}
          </p>
        </div>
      </div>

      {/* Job Details Content */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-6 text-xs text-[#18221E]">
        {job.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#18221E]">About the Role</h3>
            <p className="text-xs text-[#65706A] leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>
        )}

        {job.responsibilities && job.responsibilities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#18221E]">Key Responsibilities</h3>
            <ul className="list-disc list-inside space-y-1 text-[#65706A]">
              {job.responsibilities.map((resp, i) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#18221E]">Requirements & Qualifications</h3>
            <ul className="list-disc list-inside space-y-1 text-[#65706A]">
              {job.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.skills && job.skills.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#18221E]">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-xs font-semibold text-[#18221E]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
