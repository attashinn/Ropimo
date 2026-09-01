import * as React from "react";

export default function DepartmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24 text-[#18221E]">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-[8px] bg-[#E7EADF]" />
          <div className="h-4 w-72 rounded-[6px] bg-[#E7EADF]/60" />
        </div>
        <div className="h-9 w-36 rounded-[8px] bg-[#10251F]/20" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 space-y-2"
          >
            <div className="h-4 w-28 rounded-[4px] bg-[#E7EADF]" />
            <div className="h-8 w-12 rounded-[6px] bg-[#E7EADF]" />
          </div>
        ))}
      </div>

      {/* Department Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 space-y-4 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[10px] bg-[#E7EADF]" />
              <div className="space-y-1 flex-1">
                <div className="h-5 w-28 rounded-[4px] bg-[#E7EADF]" />
                <div className="h-3 w-40 rounded-[4px] bg-[#E7EADF]/60" />
              </div>
            </div>
            <div className="h-3 w-full rounded-[4px] bg-[#E7EADF]/40" />
            <div className="flex items-center justify-between pt-2 border-t border-[#D8DDD4]/40">
              <div className="h-4 w-20 rounded-[4px] bg-[#E7EADF]" />
              <div className="h-4 w-16 rounded-[4px] bg-[#E7EADF]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
