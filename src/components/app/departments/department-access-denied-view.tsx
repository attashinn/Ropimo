"use client";

import * as React from "react";
import Link from "next/link";
import { Department } from "@/types/department";
import { Workspace } from "@/types/workspace";
import { renderDepartmentIcon } from "../department-icons";

export interface DepartmentAccessDeniedViewProps {
  department: Department;
  workspace: Workspace;
  leadName?: string | null;
}

export function DepartmentAccessDeniedView({
  department,
  workspace,
  leadName,
}: DepartmentAccessDeniedViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-[20px] border border-[#D8DDD4] bg-[#FAF9F5] shadow-sm">
          {renderDepartmentIcon(department.icon, 36)}
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] text-white shadow-sm">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>Private Department Workspace</span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-[#18221E]">
          Access Restricted: {department.name}
        </h1>

        <p className="text-xs text-[#65706A] leading-relaxed">
          You are not a member of the <span className="font-semibold text-[#18221E]">{department.name}</span> department.
          Only authorized department members, Department Leads, and Workspace Administrators can access this department workspace.
        </p>

        {leadName && (
          <div className="mt-4 rounded-[10px] border border-[#D8DDD4] bg-white p-3 text-xs text-[#18221E]">
            <span className="text-[#65706A]">Department Lead:</span>{" "}
            <span className="font-semibold">{leadName}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/app/departments"
          className="rounded-[10px] bg-[#10251F] px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#18221E] transition-colors"
        >
          ← Return to Departments
        </Link>
        <Link
          href="/app"
          className="rounded-[10px] border border-[#D8DDD4] bg-white px-5 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
        >
          Workspace Overview
        </Link>
      </div>
    </div>
  );
}
