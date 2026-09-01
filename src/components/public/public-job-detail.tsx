"use client";

import * as React from "react";
import Link from "next/link";
import { PublicJobOpening } from "@/lib/recruitment/public-queries";
import { LogoIcon } from "@/components/landing/icons";
import { AppIcon } from "@/components/ui/app-icon";

export interface PublicJobDetailProps {
  job: PublicJobOpening;
}

export function PublicJobDetail({ job }: PublicJobDetailProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#18221E] flex flex-col justify-between">
      {/* 1. PUBLIC HEADER */}
      <header className="border-b border-[#D8DDD4] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/jobs" className="flex items-center gap-2.5">
            <LogoIcon size={26} />
            <span className="text-lg font-bold tracking-tight text-[#18221E]">Ropimo</span>
            <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[11px] font-semibold text-[#65706A]">
              Careers
            </span>
          </Link>

          <Link
            href="/jobs"
            className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
          >
            ← View all jobs
          </Link>
        </div>
      </header>

      {/* 2. MAIN DETAIL CONTENT */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* JOB HEADER CARD */}
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {job.department_name && (
                    <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-xs font-semibold text-[#18221E]">
                      {job.department_name}
                    </span>
                  )}
                  <span className="text-xs text-[#65706A]">at {job.company_name}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18221E]">
                  {job.title}
                </h1>

                <div className="flex items-center gap-3 text-xs text-[#65706A] flex-wrap pt-1">
                  <span className="flex items-center gap-1">
                    <AppIcon name="map-pin" size={13} />
                    <span>{job.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <AppIcon name="time" size={13} />
                    <span>{job.employment_type}</span>
                  </span>
                  {job.salary_range && (
                    <span className="flex items-center gap-1 font-bold text-[#18221E]">
                      <AppIcon name="dollar" size={13} />
                      <span>{job.salary_range}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs transition-colors"
                >
                  {copied ? "✓ Copied Link" : "Share Position"}
                </button>

                <Link
                  href={`/jobs/${job.id}/apply`}
                  className="rounded-[10px] bg-[#10251F] text-white px-5 py-2 text-xs font-bold hover:bg-[#18342C] shadow-2xs transition-colors"
                >
                  Apply Now →
                </Link>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: DESCRIPTION, RESPONSIBILITIES, REQUIREMENTS */}
            <div className="lg:col-span-8 space-y-6">
              {/* About the role */}
              {job.description && (
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-7 shadow-2xs space-y-3 text-xs text-[#18221E]">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#65706A]">
                    About the Role
                  </h2>
                  <div className="text-xs text-[#18221E] leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-7 shadow-2xs space-y-3.5 text-xs text-[#18221E]">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#65706A]">
                    What You&apos;ll Do
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-[#18221E] leading-relaxed">
                    {job.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-7 shadow-2xs space-y-3.5 text-xs text-[#18221E]">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#65706A]">
                    What We&apos;re Looking For
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-[#18221E] leading-relaxed">
                    {job.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-7 shadow-2xs space-y-3 text-xs text-[#18221E]">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#65706A]">
                    Relevant Technologies & Skills
                  </h2>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1 text-xs font-semibold text-[#18221E]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: COMPENSATION & SUMMARY */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4 text-xs">
                <h3 className="text-sm font-bold text-[#18221E]">Position Overview</h3>

                <div className="space-y-3 divide-y divide-[#D8DDD4]/60">
                  <div className="pt-2 first:pt-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                      Department
                    </span>
                    <p className="font-semibold text-[#18221E] mt-0.5">
                      {job.department_name || "General"}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                      Location
                    </span>
                    <p className="font-semibold text-[#18221E] mt-0.5">{job.location}</p>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                      Employment Type
                    </span>
                    <p className="font-semibold text-[#18221E] mt-0.5">{job.employment_type}</p>
                  </div>

                  {job.salary_range && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                        Compensation
                      </span>
                      <p className="font-bold text-[#246244] mt-0.5">{job.salary_range}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A] block">
                      Status
                    </span>
                    <span className="inline-block mt-0.5 rounded-full bg-[#EAF4E2] border border-[#246244]/20 px-2 py-0.5 text-[10px] font-bold text-[#246244]">
                      Accepting Applications
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/jobs/${job.id}/apply`}
                    className="block w-full text-center rounded-[10px] bg-[#10251F] text-white py-2.5 text-xs font-bold hover:bg-[#18342C] shadow-2xs transition-colors"
                  >
                    Apply for this Position →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CTA BANNER */}
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-8 shadow-2xs text-center space-y-4">
            <h3 className="text-xl font-extrabold text-[#18221E]">Ready to apply?</h3>
            <p className="text-xs text-[#65706A] max-w-md mx-auto">
              Take the next step in your career. Submit your resume and join our team.
            </p>
            <div>
              <Link
                href={`/jobs/${job.id}/apply`}
                className="inline-block rounded-[10px] bg-[#10251F] text-white px-6 py-2.5 text-xs font-bold hover:bg-[#18342C] shadow-2xs transition-colors"
              >
                Apply for this Position →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 3. PUBLIC FOOTER */}
      <footer className="border-t border-[#D8DDD4] bg-white py-8 px-4 text-center text-xs text-[#65706A]">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={20} />
            <span className="font-bold text-[#18221E]">Ropimo</span>
            <span>— Careers & Open Positions</span>
          </div>
          <p>© {new Date().getFullYear()} Ropimo Inc.</p>
        </div>
      </footer>
    </div>
  );
}
