import * as React from "react";
import { Skeleton } from "@/components/app/ui";

export default function OverviewLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 max-w-5xl mx-auto w-full text-ink">
      {/* 1. Header skeleton: Good morning, [name] + date + right buttons */}
      <div className="flex items-baseline justify-between gap-4 pb-2">
        <div className="flex items-baseline gap-3">
          <Skeleton rounded="sm" className="h-6 w-44" />
          <Skeleton rounded="sm" className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton rounded="sm" className="h-8 w-24" />
          <Skeleton rounded="sm" className="h-8 w-24" />
        </div>
      </div>

      {/* 2. Stat Strip skeleton: 5 items separated by vertical hairlines */}
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-hairline border-y border-hairline py-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-2 space-y-1.5">
            <Skeleton rounded="sm" className="h-7 w-12" />
            <Skeleton rounded="sm" className="h-3.5 w-20" />
          </div>
        ))}
      </div>

      {/* 3. Two columns below (65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 pt-2">
        {/* Left Column (65%): My tasks */}
        <div className="lg:col-span-8 lg:pr-8 lg:border-r lg:border-hairline space-y-4">
          <div className="flex items-center justify-between pb-1">
            <Skeleton rounded="sm" className="h-4 w-20" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex items-center gap-5 border-b border-hairline pb-2.5">
            <Skeleton rounded="sm" className="h-4 w-16" />
            <Skeleton rounded="sm" className="h-4 w-16" />
            <Skeleton rounded="sm" className="h-4 w-20" />
          </div>

          {/* Group rows */}
          <div className="space-y-2 pt-2">
            <Skeleton rounded="sm" className="h-3 w-16 mb-2" />
            {[1, 2, 3, 4].map((r) => (
              <div
                key={r}
                className="h-11 flex items-center justify-between px-2 border-b border-hairline"
              >
                <div className="flex items-center gap-3">
                  <Skeleton rounded="full" className="h-4 w-4" />
                  <Skeleton rounded="sm" className="h-4 w-60" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton rounded="sm" className="h-3 w-16" />
                  <Skeleton rounded="sm" className="h-3 w-12" />
                </div>
              </div>
            ))}
            <Skeleton rounded="sm" className="h-8 w-24 mt-2" />
          </div>
        </div>

        {/* Right Column (35%): Up next + Needs attention */}
        <div className="lg:col-span-4 lg:pl-8 space-y-6 pt-6 lg:pt-0">
          {/* Up next skeleton */}
          <div className="space-y-3">
            <Skeleton rounded="sm" className="h-4 w-16" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton rounded="sm" className="h-3.5 w-12" />
                  <Skeleton rounded="sm" className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Needs attention skeleton */}
          <div className="space-y-3 pt-4 border-t border-hairline">
            <Skeleton rounded="sm" className="h-4 w-28" />
            <div className="space-y-2">
              <Skeleton rounded="sm" className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Activity skeleton */}
      <div className="pt-6 border-t border-hairline space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton rounded="sm" className="h-4 w-16" />
          <Skeleton rounded="sm" className="h-3.5 w-12" />
        </div>
        <div className="divide-y divide-hairline">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton rounded="full" className="h-5 w-5" />
              <Skeleton rounded="sm" className="h-4 w-72" />
              <Skeleton rounded="sm" className="h-3 w-14 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
