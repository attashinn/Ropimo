"use client";

import React from "react";
import { Users } from "lucide-react";

export function BookingCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-[22px] p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-neutral-100/90 w-[205px] sm:w-[225px] font-[family-name:var(--font-plus-jakarta)] select-none ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider block">
            Hiring Pipeline
          </span>
          <h4 className="text-[15.5px] font-extrabold text-[#111111] tracking-tight leading-tight mt-0.5">
            Senior Designer
          </h4>
        </div>

        {/* Tag icon */}
        <div className="w-6 h-6 rounded-md bg-[#FF6B3D] text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
          <Users className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Middle Row: Applicants count */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-100">
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold">
          14 applicants
        </span>
        <span className="text-[11px] text-neutral-500 font-semibold">
          3 shortlisted
        </span>
      </div>

      {/* Candidate Spotlight */}
      <div className="mt-2.5 p-2 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center gap-2">
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
          alt="Candidate"
          className="w-6 h-6 rounded-full object-cover shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-[#111] truncate block">
            Tanvir Ahmed
          </span>
          <span className="text-[9.5px] text-neutral-400 font-medium block">
            Interview tomorrow, 2 PM
          </span>
        </div>
      </div>
    </div>
  );
}

export default BookingCard;
