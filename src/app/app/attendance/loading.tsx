import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function AttendanceLoading() {
  return (
    <div className="space-y-6 pb-20 text-ink">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <Skeleton rounded="sm" className="h-7 w-48" />
          <Skeleton rounded="sm" className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton rounded="sm" className="h-9 w-28" />
          <Skeleton rounded="sm" className="h-9 w-28" />
        </div>
      </div>

      {/* KPI Row Skeleton */}
      <div className="rounded-[12px] border border-hairline bg-surface overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-hairline">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-5 flex items-start gap-3.5">
              <Skeleton rounded="sm" className="h-9 w-9 shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton rounded="sm" className="h-3 w-16" />
                <Skeleton rounded="sm" className="h-6 w-12" />
                <Skeleton rounded="sm" className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton rounded="sm" className="h-9 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton rounded="sm" className="h-8 w-28" />
          <Skeleton rounded="sm" className="h-8 w-24" />
        </div>
      </div>

      {/* Attendance Table Skeleton */}
      <div className="rounded-[12px] border border-hairline bg-surface overflow-hidden">
        <div className="h-10 bg-canvas/60 border-b border-hairline px-4 flex items-center justify-between">
          <Skeleton rounded="sm" className="h-3.5 w-32" />
          <Skeleton rounded="sm" className="h-3.5 w-24" />
          <Skeleton rounded="sm" className="h-3.5 w-20" />
          <Skeleton rounded="sm" className="h-3.5 w-16" />
        </div>
        <div className="divide-y divide-hairline">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="h-7 w-7" />
                <div className="space-y-1">
                  <Skeleton rounded="sm" className="h-3.5 w-32" />
                  <Skeleton rounded="sm" className="h-3 w-20" />
                </div>
              </div>
              <Skeleton rounded="sm" className="h-3.5 w-20" />
              <Skeleton rounded="sm" className="h-3.5 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton rounded="full" className="h-2 w-2" />
                <Skeleton rounded="sm" className="h-3.5 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
