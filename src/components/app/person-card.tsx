"use client";

import * as React from "react";
import Link from "next/link";
import { WorkspacePerson } from "@/types/people";
import { renderDepartmentIcon } from "./department-icons";
import { ArrowRightIcon } from "@/components/landing/icons";

export interface PersonCardProps {
  person: WorkspacePerson;
  canManage: boolean;
  onEdit: (person: WorkspacePerson) => void;
}

const ROLE_BADGES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  owner: { label: "Owner", bg: "bg-[#10251F]", text: "text-[#C7F34A]" },
  admin: { label: "Admin", bg: "bg-[#E7EADF]", text: "text-[#10251F]" },
  manager: { label: "Manager", bg: "bg-blue-50", text: "text-blue-800" },
  member: { label: "Member", bg: "bg-[#FAF9F5]", text: "text-[#65706A]" },
  guest: { label: "Guest", bg: "bg-gray-100", text: "text-gray-600" },
};

export function PersonCard({ person, canManage, onEdit }: PersonCardProps) {
  const displayName =
    person.full_name ||
    (person.email ? person.email.split("@")[0] : "Team Member");

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const roleBadge = ROLE_BADGES[person.role] || ROLE_BADGES.member;

  return (
    <div className="group flex flex-col justify-between rounded-[16px] border border-[#D8DDD4] bg-white p-5 sm:p-6 shadow-2xs hover:border-[#10251F]/40 hover:shadow-xs transition-all duration-200">
      <div>
        {/* Top Avatar & Role Badge */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/app/team/${person.user_id}`}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#10251F] text-sm font-bold text-[#F4F3EE] shadow-2xs">
              {initials}
            </div>

            <div>
              <h3 className="text-base font-bold tracking-tight text-[#18221E] hover:underline">
                {displayName}
              </h3>
              <p className="text-xs text-[#65706A] truncate max-w-[180px] sm:max-w-[220px]">
                {person.email}
              </p>
            </div>
          </Link>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${roleBadge.bg} ${roleBadge.text}`}
          >
            {roleBadge.label}
          </span>
        </div>

        {/* Job Title */}
        <div className="mt-4 pt-3 border-t border-[#D8DDD4]/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#65706A]">
            Job Title
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#18221E]">
            {person.job_title || (
              <span className="italic text-[#65706A]/70">No title set</span>
            )}
          </p>
        </div>

        {/* Assigned Departments */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#65706A] mb-1.5">
            Departments
          </p>
          {person.departments.length === 0 ? (
            <p className="text-xs italic text-[#65706A]/70">
              Not assigned to any department
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {person.departments.map((dept) => (
                <span
                  key={dept.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-medium text-[#18221E]"
                >
                  <span
                    style={{ backgroundColor: dept.color }}
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#F4F3EE] p-0.5"
                  >
                    {renderDepartmentIcon(dept.icon, 8)}
                  </span>
                  <span>{dept.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#D8DDD4]/60 text-xs">
        <Link
          href={`/app/team/${person.user_id}`}
          className="flex items-center gap-1 font-semibold text-[#18221E] hover:underline"
        >
          <span>View space</span>
          <ArrowRightIcon size={12} />
        </Link>

        {canManage && (
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="font-semibold text-[#65706A] hover:text-[#18221E] hover:underline focus:outline-none"
          >
            Edit Details
          </button>
        )}
      </div>
    </div>
  );
}
