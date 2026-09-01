import * as React from "react";

export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24 text-[#18221E]">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-[8px] bg-[#E7EADF]" />
          <div className="h-4 w-64 rounded-[6px] bg-[#E7EADF]/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-[8px] bg-[#E7EADF]" />
          <div className="h-9 w-28 rounded-[8px] bg-[#10251F]/20" />
        </div>
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
          <div className="h-6 w-36 rounded-[6px] bg-[#E7EADF]" />
          <div className="flex gap-1.5">
            <div className="h-8 w-8 rounded-[6px] bg-[#E7EADF]" />
            <div className="h-8 w-8 rounded-[6px] bg-[#E7EADF]" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
            <div key={idx} className="h-6 text-center text-xs font-semibold text-[#65706A]">
              {d}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-20 sm:h-24 rounded-[8px] border border-[#D8DDD4]/50 bg-[#FAF9F5] p-2"
            >
              <div className="h-3 w-4 rounded-[3px] bg-[#E7EADF]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
