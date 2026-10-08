"use client";

import React from "react";
import { Clock } from "lucide-react";

export function HoursPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-full backdrop-blur-md bg-white/70 border border-white/90 px-4.5 py-2.5 flex items-center justify-between shadow-[0_6px_24px_rgba(0,0,0,0.08)] font-[family-name:var(--font-plus-jakarta)] select-none ${className}`}
    >
      <span className="text-[13px] sm:text-[14px] font-bold text-neutral-800 tracking-tight">
        Hours worked
      </span>

      <span className="inline-flex items-center gap-1.5 bg-[#FFE76A] text-[#111111] px-3 py-1 rounded-full text-[12px] font-extrabold shadow-xs">
        <Clock className="w-3.5 h-3.5 stroke-[2.4]" />
        <span>20h/weeks</span>
      </span>
    </div>
  );
}

export default HoursPill;
