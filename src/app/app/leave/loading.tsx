import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function LeaveLoading() {
  return (
    <div className="space-y-6 pb-20 text-ink">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <Skeleton rounded="sm" className="h-7 w-56" />
          <Skeleton rounded="sm" className="h-4 w-80" />
        </div>
        <Skeleton rounded="sm" className="h-9 w-32" />
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-hairline bg-surface p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton rounded="sm" className="h-3 w-20" />
              <Skeleton rounded="full" className="h-5 w-5" />
            </div>
            <Skeleton rounded="sm" className="h-7 w-14" />
            <Skeleton rounded="sm" className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-6 border-b border-hairline pb-3">
        <Skeleton rounded="sm" className="h-4 w-24" />
        <Skeleton rounded="sm" className="h-4 w-28" />
      </div>

      {/* Leave Requests Table Skeleton */}
      <div className="rounded-[12px] border border-hairline bg-surface overflow-hidden">
        <div className="h-10 bg-canvas/60 border-b border-hairline px-4 flex items-center justify-between">
          <Skeleton rounded="sm" className="h-3.5 w-32" />
          <Skeleton rounded="sm" className="h-3.5 w-24" />
          <Skeleton rounded="sm" className="h-3.5 w-24" />
          <Skeleton rounded="sm" className="h-3.5 w-16" />
        </div>
        <div className="divide-y divide-hairline">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton rounded="sm" className="h-4 w-36" />
                <Skeleton rounded="sm" className="h-3 w-48" />
              </div>
              <Skeleton rounded="sm" className="h-3.5 w-24" />
              <Skeleton rounded="sm" className="h-3.5 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton rounded="full" className="h-2 w-2" />
                <Skeleton rounded="sm" className="h-3.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
