"use client";

import React from "react";
import { CheckSquare } from "lucide-react";

export function PersonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-[22px] p-3 sm:p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-neutral-100/90 w-[210px] sm:w-[230px] flex items-center gap-3 font-[family-name:var(--font-plus-jakarta)] select-none ${className}`}
    >
      {/* Icon or Assignee Avatar */}
      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
        <CheckSquare className="w-5 h-5 stroke-[2.2]" />
      </div>

      {/* Action Item Info */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
          Action Item
        </span>
        <h5 className="text-[12.5px] font-extrabold text-[#111111] leading-tight mt-0.5">
          Send revised contract
        </h5>
        <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-neutral-600">Rahim Chowdhury</span>
        </div>
      </div>
    </div>
  );
}

export default PersonCard;
