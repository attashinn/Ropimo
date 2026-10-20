"use client";

import * as React from "react";
import Link from "next/link";
import { PublicWorkspace, PublicJobOpening } from "@/lib/recruitment/public-queries";
import { LogoIcon } from "@/components/landing/icons";

export interface CareersPortalViewProps {
  workspace: PublicWorkspace;
  jobs: PublicJobOpening[];
}

export function CareersPortalView({ workspace, jobs }: CareersPortalViewProps) {
  const [search, setSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("all");
  const [selectedWorkMode, setSelectedWorkMode] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");

  // Extract unique departments
  const departments = React.useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department_name) set.add(j.department_name);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filter jobs
  const filteredJobs = React.useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.department_name && j.department_name.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q));

      const matchesDept =
        selectedDept === "all" ||
        (j.department_name && j.department_name.toLowerCase() === selectedDept.toLowerCase());

      const matchesWorkMode =
        selectedWorkMode === "all" ||
        (j.work_mode && j.work_mode.toLowerCase() === selectedWorkMode.toLowerCase());

      const matchesType =
        selectedType === "all" ||
        (j.employment_type && j.employment_type.toLowerCase() === selectedType.toLowerCase());

      return matchesSearch && matchesDept && matchesWorkMode && matchesType;
    });
  }, [jobs, search, selectedDept, selectedWorkMode, selectedType]);

  // Group filtered jobs by department
  const groupedJobs = React.useMemo(() => {
    const map = new Map<string, PublicJobOpening[]>();
    filteredJobs.forEach((job) => {
      const deptName = job.department_name || "General";
      if (!map.has(deptName)) map.set(deptName, []);
      map.get(deptName)!.push(job);
    });
    return map;
  }, [filteredJobs]);

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-between selection:bg-[#111111] selection:text-white">
      {/* 1. BRANDED HEADER */}
      <header className="border-b border-[#E5E2D6] bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {workspace.logo_url ? (
              <img
                src={workspace.logo_url}
                alt={workspace.name}
                className="h-8 w-8 rounded-lg object-cover border border-[#E5E2D6]"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold text-sm tracking-tight">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-sm font-bold tracking-tight text-[#111111]">{workspace.name}</span>
              <span className="ml-2 rounded-full bg-[#FAF9F5] border border-[#E5E2D6] px-2 py-0.5 text-[10px] font-semibold text-[#666666]">
                Careers
              </span>
            </div>
          </div>

          <div className="text-xs text-[#666666]">
            {jobs.length} open {jobs.length === 1 ? "position" : "positions"}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto pt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
              Join the team at {workspace.name}
            </h1>
            <p className="text-sm text-[#666666] leading-relaxed">
              We are building high-impact products with dedicated teams across the globe. Explore our open roles and find your next opportunity.
            </p>
          </div>

          {/* 3. SEARCH & FILTERS BAR */}
          <div className="rounded-xl border border-[#E5E2D6] bg-white p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role, department, or location..."
                className="w-full rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#111111] placeholder-[#888888] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-[#888888] hover:text-[#111111]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {departments.length > 0 && (
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          {/* 4. OPENINGS GROUPED BY DEPARTMENT */}
          {groupedJobs.size === 0 ? (
            <div className="rounded-xl border border-[#E5E2D6] bg-white p-12 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-[#F6F4EC] flex items-center justify-center text-[#666666]">
                🔍
              </div>
              <h3 className="text-sm font-bold text-[#111111]">No positions found</h3>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                No open positions matched your current search filters. Try clearing filters or check back later.
              </p>
              {(search || selectedDept !== "all" || selectedWorkMode !== "all" || selectedType !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedDept("all");
                    setSelectedWorkMode("all");
                    setSelectedType("all");
                  }}
                  className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedJobs.entries()).map(([deptName, deptJobs]) => (
                <div key={deptName} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#E5E2D6] pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                      {deptName}
                    </h2>
                    <span className="rounded-full bg-[#FAF9F5] border border-[#E5E2D6] px-2 py-0.2 text-[10px] font-semibold text-[#666666]">
                      {deptJobs.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {deptJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/careers/${workspace.slug}/${job.slug || job.id}`}
                        className="group rounded-xl border border-[#E5E2D6] bg-white p-4.5 hover:border-[#111111] hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-[#111111] group-hover:text-[#000000] transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                            <span>{job.location}</span>
                            <span>•</span>
                            <span className="capitalize">{job.work_mode || "remote"}</span>
                            <span>•</span>
                            <span>{job.employment_type}</span>
                            {job.show_salary && (job.salary_min || job.salary_max) && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-[#111111]">
                                  {job.currency || "$"}{job.salary_min?.toLocaleString()}
                                  {job.salary_max ? ` – ${job.currency || "$"}${job.salary_max.toLocaleString()}` : "+"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-[#111111] group-hover:translate-x-0.5 transition-transform self-end sm:self-center">
                          <span>View role</span>
                          <span>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="border-t border-[#E5E2D6] bg-white py-6 px-4 text-center text-xs text-[#666666]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111111]">{workspace.name}</span>
            <span>— Careers Portal</span>
          </div>
          <p className="text-[11px] text-[#888888]">Powered by Zambic</p>
        </div>
      </footer>
    </div>
  );
}
