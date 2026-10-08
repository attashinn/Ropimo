import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function SettingsLoading() {
  return (
    <div className="space-y-8 pb-20 text-ink">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <Skeleton rounded="sm" className="h-7 w-48" />
          <Skeleton rounded="sm" className="h-4 w-80" />
        </div>
        <Skeleton rounded="sm" className="h-9 w-28" />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[12px] border border-hairline bg-surface p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
            <Skeleton rounded="sm" className="h-5 w-5" />
            <Skeleton rounded="sm" className="h-5 w-36" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton rounded="sm" className="h-3 w-28" />
              <Skeleton rounded="sm" className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton rounded="sm" className="h-3 w-36" />
              <Skeleton rounded="sm" className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton rounded="sm" className="h-3 w-24" />
              <Skeleton rounded="sm" className="h-9 w-full" />
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-hairline bg-surface p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
            <Skeleton rounded="sm" className="h-5 w-5" />
            <Skeleton rounded="sm" className="h-5 w-36" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton rounded="sm" className="h-3 w-28" />
              <Skeleton rounded="sm" className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton rounded="sm" className="h-3 w-32" />
              <Skeleton rounded="sm" className="h-9 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
