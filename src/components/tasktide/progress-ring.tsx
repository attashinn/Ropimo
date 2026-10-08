"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

interface ProgressRingProps {
  percentage?: number;
  label?: string;
}

export function ProgressRing({
  percentage = 80,
  label = "Sprint completion",
}: ProgressRingProps) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.91
  const targetOffset = circumference * (1 - percentage / 100);

  return (
    <div
      className="relative bg-white rounded-[26px] p-5 sm:p-6 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-neutral-100 flex flex-col items-start font-[family-name:var(--font-plus-jakarta)]"
    >
      {/* Top right icon button */}
      <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F3F2EE] hover:bg-[#EAE8E2] flex items-center justify-center text-[#111111] transition-colors">
        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
      </div>

      {/* SVG Progress Ring */}
      <div className="relative w-[86px] h-[86px] flex items-center justify-center">
        <svg
          viewBox="0 0 90 90"
          className="w-full h-full -rotate-90 transform"
        >
          {/* Background Track (light peach) */}
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke="#FFE8DF"
            strokeWidth="10"
          />
          {/* Static Foreground Arc (orange #FF6B3D) */}
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke="#FF6B3D"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
          />
        </svg>

        {/* Center Percentage Label */}
        <span className="absolute inset-0 flex items-center justify-center text-[18px] font-extrabold text-[#111111] tracking-tight">
          {percentage}%
        </span>
      </div>

      {/* Text under ring */}
      <div className="mt-3.5 text-[16px] font-bold text-[#111111] tracking-tight">
        {label}
      </div>
    </div>
  );
}

export default ProgressRing;
