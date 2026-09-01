import * as React from "react";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24 text-[#18221E]">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-[8px] bg-[#E7EADF]" />
          <div className="h-4 w-80 rounded-[6px] bg-[#E7EADF]/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-[8px] bg-[#E7EADF]" />
          <div className="h-9 w-28 rounded-[8px] bg-[#10251F]/20" />
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-[4px] bg-[#E7EADF]" />
              <div className="h-7 w-7 rounded-[6px] bg-[#E7EADF]/60" />
            </div>
            <div className="h-8 w-16 rounded-[6px] bg-[#E7EADF]" />
          </div>
        ))}
      </div>

      {/* Main content table skeleton */}
      <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-4">
          <div className="h-5 w-36 rounded-[4px] bg-[#E7EADF]" />
          <div className="h-8 w-48 rounded-[6px] bg-[#E7EADF]/50" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between py-2 border-b border-[#D8DDD4]/40"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#E7EADF]" />
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded-[4px] bg-[#E7EADF]" />
                  <div className="h-3 w-20 rounded-[4px] bg-[#E7EADF]/60" />
                </div>
              </div>
              <div className="h-4 w-24 rounded-[4px] bg-[#E7EADF]/60" />
              <div className="h-6 w-16 rounded-full bg-[#E7EADF]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
