import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function MeetingsLoading() {
  return (
    <div className="space-y-6 pb-20 text-ink">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <Skeleton rounded="sm" className="h-7 w-36" />
          <Skeleton rounded="sm" className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton rounded="sm" className="h-9 w-28" />
          <Skeleton rounded="sm" className="h-9 w-36" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-hairline bg-surface p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton rounded="sm" className="h-3 w-24" />
              <Skeleton rounded="full" className="h-5 w-5" />
            </div>
            <Skeleton rounded="sm" className="h-7 w-12" />
            <Skeleton rounded="sm" className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Tabs and Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 border-b border-hairline pb-2 sm:border-0 sm:pb-0">
          <Skeleton rounded="sm" className="h-4 w-20" />
          <Skeleton rounded="sm" className="h-4 w-16" />
          <Skeleton rounded="sm" className="h-4 w-20" />
        </div>
        <Skeleton rounded="sm" className="h-9 w-60" />
      </div>

      {/* Meetings Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-hairline bg-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <Skeleton rounded="sm" className="h-11 w-11 shrink-0" />
              <div className="space-y-2">
                <Skeleton rounded="sm" className="h-4 w-52" />
                <Skeleton rounded="sm" className="h-3 w-72" />
                <div className="flex items-center gap-3">
                  <Skeleton rounded="sm" className="h-3 w-24" />
                  <Skeleton rounded="sm" className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Skeleton rounded="full" className="h-6 w-16" />
              <Skeleton rounded="sm" className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
