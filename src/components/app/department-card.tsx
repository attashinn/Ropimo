"use client";

import * as React from "react";
import Link from "next/link";
import { DepartmentWithStats } from "@/types/department";
import { renderDepartmentIcon } from "./department-icons";

export interface DepartmentCardProps {
  department: DepartmentWithStats;
  onEdit?: (department: DepartmentWithStats) => void;
  onDelete?: (department: DepartmentWithStats) => void;
  onAssignLead?: (department: DepartmentWithStats) => void;
}

const DEFAULT_COLOR_SCHEMES: Record<string, { bg: string; text: string }> = {
  code: { bg: "bg-[#10251F]", text: "text-[#C7F34A]" },
  design: { bg: "bg-[#EAF4E2]", text: "text-[#246244]" },
  video: { bg: "bg-[#FEF6E4]", text: "text-[#B58500]" },
  marketing: { bg: "bg-[#EEF2FF]", text: "text-[#4F46E5]" },
  hr: { bg: "bg-[#F0F9FF]", text: "text-[#0284C7]" },
  ops: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]" },
  sales: { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  finance: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  building: { bg: "bg-[#FAF9F5]", text: "text-[#18221E]" },
};

export function DepartmentCard({
  department,
  onEdit,
  onDelete,
  onAssignLead,
}: DepartmentCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const colorScheme =
    department.colorScheme ||
    DEFAULT_COLOR_SCHEMES[department.icon] ||
    DEFAULT_COLOR_SCHEMES.building;

  const renderedMembers = department.members || [];
  const displayAvatars = renderedMembers.slice(0, 3);
  const remainingCount = Math.max(0, department.memberCount - displayAvatars.length);

  return (
    <div className="group relative flex flex-col justify-between rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs hover:border-[#10251F]/30 hover:shadow-sm transition-[border-color,box-shadow] duration-150">
      <div>
        {/* Top: Icon + Name + Overflow Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] shadow-2xs ${colorScheme.bg} ${colorScheme.text}`}
            >
              {renderDepartmentIcon(department.icon, 18)}
            </div>

            <Link
              href={`/app/departments/${department.id}`}
              className="text-[15px] font-bold tracking-tight text-[#18221E] hover:text-[#10251F] hover:underline truncate"
            >
              {department.name}
            </Link>
          </div>

          {/* Three-dots menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors focus:outline-none"
              aria-label="Department options"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-44 rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-md">
                <Link
                  href={`/app/departments/${department.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[6px] px-3 py-2 text-xs font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
                >
                  View Details
                </Link>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(department);
                    }}
                    className="w-full text-left rounded-[6px] px-3 py-2 text-xs font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
                  >
                    Edit Department
                  </button>
                )}
                {onAssignLead && !department.leadName && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onAssignLead(department);
                    }}
                    className="w-full text-left rounded-[6px] px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    Assign Lead
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(department);
                    }}
                    className="w-full text-left rounded-[6px] px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete Department
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          className={`mt-3 text-xs leading-relaxed line-clamp-2 min-h-[36px] ${
            department.description ? "text-[#65706A]" : "italic text-[#65706A]/70"
          }`}
        >
          {department.description || "No description provided."}
        </p>

        {/* Subtle Divider */}
        <div className="my-3.5 border-t border-[#D8DDD4]" />

        {/* 3-Column Structured Information */}
        <div className="grid grid-cols-3 gap-2 text-left">
          {/* LEAD */}
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              Lead
            </span>
            {department.leadName ? (
              <p className="mt-0.5 truncate text-xs font-bold text-[#18221E]">
                {department.leadName}
              </p>
            ) : (
              <div className="mt-0.5">
                <p className="truncate text-xs text-[#65706A]">No lead</p>
                {onAssignLead ? (
                  <button
                    type="button"
                    onClick={() => onAssignLead(department)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline block truncate"
                  >
                    Assign lead →
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Assign lead →
                  </span>
                )}
              </div>
            )}
          </div>

          {/* MEMBERS */}
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              Members
            </span>
            <p className="mt-0.5 text-xs font-medium text-[#18221E]">
              {department.memberCount} {department.memberCount === 1 ? "person" : "people"}
            </p>
          </div>

          {/* ACTIVE WORK */}
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              Active Work
            </span>
            <p className="mt-0.5 text-xs font-medium text-[#18221E] leading-tight truncate">
              {department.projectCount} proj · {department.taskCount} tasks
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Avatars & Open Department Link */}
      <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#D8DDD4]/80">
        {/* Avatars */}
        <div className="flex items-center -space-x-1.5">
          {displayAvatars.map((member, i) => (
            <div
              key={member.id || i}
              title={member.name}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white shadow-2xs ${
                member.bg || "bg-[#10251F]"
              }`}
            >
              {member.initial}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E7EADF] text-[9px] font-bold text-[#10251F] ring-2 ring-white shadow-2xs">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Open Department Link */}
        <Link
          href={`/app/departments/${department.id}`}
          className="text-xs font-semibold text-[#18221E] hover:underline flex items-center gap-1"
        >
          <span>Open Department</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
