"use client";

import React from "react";

export function StatsRow() {
  return (
    <section className="relative w-full bg-[#FAF9F6] py-16 sm:py-24 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center divide-y md:divide-y-0 md:divide-x divide-dashed divide-neutral-300/80">
          {/* Stat 1 */}
          <div className="flex flex-col items-center text-center px-4 sm:px-8 py-6 w-full">
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-[800] tracking-[-0.035em] text-[#111111] leading-none mb-3">
              2,400+
            </div>
            <p className="text-[14px] sm:text-[15.5px] font-semibold text-[#6B6B6B] max-w-[200px] leading-snug">
              teams
            </p>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center text-center px-4 sm:px-8 py-6 w-full">
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-[800] tracking-[-0.035em] text-[#111111] leading-none mb-3">
              9 hrs
            </div>
            <p className="text-[14px] sm:text-[15.5px] font-semibold text-[#6B6B6B] max-w-[200px] leading-snug">
              saved per person every week
            </p>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center text-center px-4 sm:px-8 py-6 w-full">
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-[800] tracking-[-0.035em] text-[#111111] leading-none mb-3">
              4.8
            </div>
            <p className="text-[14px] sm:text-[15.5px] font-semibold text-[#6B6B6B] max-w-[200px] leading-snug">
              average rating
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsRow;
