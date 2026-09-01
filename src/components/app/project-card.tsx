"use client";

import * as React from "react";
import Link from "next/link";
import { Project, ProjectStatus } from "@/types/project";
import { ArrowRightIcon } from "@/components/landing/icons";

export interface ProjectCardProps {
  project: Project;
}

const STATUS_BADGES: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  in_progress: {
    label: "In Progress",
    bg: "bg-[#EAF4E2]",
    text: "text-[#246244]",
    dot: "bg-[#246244]",
  },
  active: {
    label: "Active",
    bg: "bg-[#E7EADF]",
    text: "text-[#10251F]",
    dot: "bg-[#10251F]",
  },
  planning: {
    label: "Planning",
    bg: "bg-[#FAF9F5]",
    text: "text-[#65706A]",
    dot: "bg-[#B8C0B2]",
  },
  on_hold: {
    label: "On Hold",
    bg: "bg-[#FEF6E4]",
    text: "text-[#B58500]",
    dot: "bg-[#B58500]",
  },
  completed: {
    label: "Completed",
    bg: "bg-[#EAF4E2]",
    text: "text-[#246244]",
    dot: "bg-[#246244]",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-600",
  },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const badge = STATUS_BADGES[project.status] || STATUS_BADGES.active;
  const monogram = project.icon || (project.name ? project.name[0].toUpperCase() : "P");
  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="group flex flex-col justify-between rounded-[16px] border border-[#D8DDD4] bg-white p-5 sm:p-6 shadow-2xs hover:border-[#10251F]/40 hover:shadow-xs transition-all duration-200"
    >
      <div>
        {/* Top Monogram & Status */}
        <div className="flex items-center justify-between">
          <div
            style={{ backgroundColor: project.color || "#10251F" }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-[#F4F3EE] shadow-2xs group-hover:scale-105 transition-transform"
          >
            {monogram}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Project Name */}
        <h3 className="mt-4 text-base font-bold tracking-tight text-[#18221E] group-hover:text-[#10251F]">
          {project.name}
        </h3>

        {/* Description */}
        {project.description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#65706A]">
            {project.description}
          </p>
        ) : (
          <p className="mt-1.5 text-xs italic text-[#65706A]/70">
            No description provided.
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#D8DDD4]/70 text-[11px] text-[#65706A]">
        <span>Created {formattedDate}</span>
        <span className="flex items-center gap-1 font-semibold text-[#18221E] group-hover:translate-x-0.5 transition-transform">
          <span>Open</span>
          <ArrowRightIcon size={12} />
        </span>
      </div>
    </Link>
  );
}
