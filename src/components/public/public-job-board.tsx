"use client";

import * as React from "react";
import Link from "next/link";
import { PublicJobOpening } from "@/lib/recruitment/public-queries";
import { LogoIcon } from "@/components/landing/icons";
import { SearchIcon } from "@/components/app/nav-icons";
import { AppIcon } from "@/components/ui/app-icon";

export interface PublicJobBoardProps {
  initialJobs: PublicJobOpening[];
}

export function PublicJobBoard({ initialJobs }: PublicJobBoardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("all");
  const [selectedLocation, setSelectedLocation] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");

  const departments = React.useMemo(() => {
    const set = new Set<string>();
    initialJobs.forEach((j) => {
      if (j.department_name) set.add(j.department_name);
    });
    return Array.from(set);
  }, [initialJobs]);

  const locations = React.useMemo(() => {
    const set = new Set<string>();
    initialJobs.forEach((j) => {
      if (j.location) set.add(j.location);
    });
    return Array.from(set);
  }, [initialJobs]);

  const filteredJobs = React.useMemo(() => {
    return initialJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.department_name && job.department_name.toLowerCase().includes(q)) ||
        job.location.toLowerCase().includes(q) ||
        (job.description && job.description.toLowerCase().includes(q)) ||
        job.skills.some((s) => s.toLowerCase().includes(q));

      const matchesDept = selectedDept === "all" || job.department_name === selectedDept;
      const matchesLocation = selectedLocation === "all" || job.location === selectedLocation;
      const matchesType = selectedType === "all" || job.employment_type === selectedType;

      return matchesSearch && matchesDept && matchesLocation && matchesType;
    });
  }, [initialJobs, searchQuery, selectedDept, selectedLocation, selectedType]);

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#18221E] flex flex-col justify-between">
      {/* 1. PUBLIC HEADER */}
      <header className="border-b border-[#D8DDD4] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon size={28} />
            <span className="text-lg font-bold tracking-tight text-[#18221E]">Ropimo</span>
            <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[11px] font-semibold text-[#65706A]">
              Careers
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
            >
              Company Sign In →
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO AREA */}
      <main className="flex-1 pb-20">
        <div className="border-b border-[#D8DDD4] bg-white py-12 px-4 sm:px-6 shadow-2xs">
          <div className="mx-auto max-w-5xl space-y-3">
            <span className="rounded-full bg-[#EAF4E2] border border-[#246244]/20 px-3 py-1 text-xs font-bold text-[#246244] inline-block">
              We&apos;re Hiring
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#18221E]">
              Join our mission to shape the future of work
            </h1>
            <p className="text-sm text-[#65706A] max-w-2xl">
              Explore open opportunities across engineering, design, operations, and product. Build
              tools that empower high-performance teams worldwide.
            </p>
          </div>
        </div>

        {/* 3. SEARCH & FILTERS CONTAINER */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-[14px] border border-[#D8DDD4] shadow-2xs">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#65706A]">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search open positions by role, department, location, or skills..."
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-3.5 py-2 text-xs text-[#18221E] placeholder:text-[#65706A]/60 focus:border-[#10251F] focus:outline-none transition-colors"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] shadow-2xs focus:border-[#10251F] focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] shadow-2xs focus:border-[#10251F] focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contractor">Contractor</option>
                <option value="Intern">Intern</option>
              </select>

              {locations.length > 0 && (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] shadow-2xs focus:border-[#10251F] focus:outline-none"
                >
                  <option value="all">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 4. POSITIONS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-[#65706A] uppercase tracking-wider">
                Open Positions ({filteredJobs.length})
              </p>
            </div>

            {filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group block rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs hover:border-[#10251F] hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.department_name && (
                            <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#18221E]">
                              {job.department_name}
                            </span>
                          )}
                          <span className="text-xs text-[#65706A]">• {job.company_name}</span>
                        </div>

                        <h2 className="text-lg font-bold text-[#18221E] group-hover:text-[#246244] transition-colors">
                          {job.title}
                        </h2>

                        <div className="flex items-center gap-3 text-xs text-[#65706A] flex-wrap">
                          <span className="flex items-center gap-1">
                            <AppIcon name="map-pin" size={13} />
                            <span>{job.location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <AppIcon name="time" size={13} />
                            <span>{job.employment_type}</span>
                          </span>
                          {job.salary_range && (
                            <span className="flex items-center gap-1 font-semibold text-[#18221E]">
                              <AppIcon name="dollar" size={13} />
                              <span>{job.salary_range}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="rounded-[10px] bg-[#10251F] text-white px-4 py-2 text-xs font-semibold group-hover:bg-[#18342C] transition-colors shadow-2xs">
                          View Position →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-12 text-center text-xs text-[#8C9489] space-y-2">
                <p className="font-bold text-base text-[#18221E]">No open positions right now.</p>
                <p>Check back soon for new opportunities or try adjusting your search filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 5. PUBLIC FOOTER */}
      <footer className="border-t border-[#D8DDD4] bg-white py-8 px-4 text-center text-xs text-[#65706A]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={20} />
            <span className="font-bold text-[#18221E]">Ropimo</span>
            <span>— The All-in-One Workspace & Recruitment Platform</span>
          </div>
          <p>© {new Date().getFullYear()} Ropimo Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
