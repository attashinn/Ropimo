import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 pb-20 text-ink max-w-4xl">
      {/* Profile Header Skeleton */}
      <div className="rounded-[12px] border border-hairline bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton rounded="full" className="h-16 w-16 shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton rounded="sm" className="h-6 w-36" />
              <Skeleton rounded="full" className="h-5 w-16" />
            </div>
            <Skeleton rounded="sm" className="h-3.5 w-48" />
          </div>
        </div>
        <Skeleton rounded="sm" className="h-9 w-28" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-6 border-b border-hairline pb-2.5">
        <Skeleton rounded="sm" className="h-4 w-16" />
        <Skeleton rounded="sm" className="h-4 w-20" />
        <Skeleton rounded="sm" className="h-4 w-24" />
        <Skeleton rounded="sm" className="h-4 w-16" />
      </div>

      {/* Form Card Skeleton */}
      <div className="rounded-[12px] border border-hairline bg-surface p-6 space-y-5">
        <Skeleton rounded="sm" className="h-5 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton rounded="sm" className="h-3 w-20" />
            <Skeleton rounded="sm" className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton rounded="sm" className="h-3 w-24" />
            <Skeleton rounded="sm" className="h-9 w-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton rounded="sm" className="h-3 w-16" />
          <Skeleton rounded="sm" className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
