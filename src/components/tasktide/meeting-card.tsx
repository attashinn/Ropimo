"use client";

import React from "react";
import { Video } from "lucide-react";

export function MeetingCard({ className = "" }: { className?: string }) {
  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
  ];

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-[22px] p-4 sm:p-4.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-neutral-100/90 w-[220px] sm:w-[240px] font-[family-name:var(--font-plus-jakarta)] select-none ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11.5px] font-medium text-neutral-400 block tracking-tight">
            Design System
          </span>
          <h4 className="text-[16px] font-extrabold text-[#111111] tracking-tight leading-tight mt-0.5">
            Weekly Ops Sync
          </h4>
        </div>

        {/* Zoom blue video icon button */}
        <div className="w-7 h-7 rounded-full bg-[#2D8CFF] text-white flex items-center justify-center shrink-0 shadow-xs">
          <Video className="w-4 h-4 stroke-[2.4]" />
        </div>
      </div>

      {/* Middle Row: Avatars + Time */}
      <div className="flex items-center justify-between mt-3.5">
        <div className="flex items-center -space-x-2">
          {avatars.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="team member"
              className="w-[26px] h-[26px] rounded-full object-cover ring-2 ring-white"
            />
          ))}
        </div>
        <span className="text-[12.5px] font-semibold text-neutral-600">
          09.30 - 11.20
        </span>
      </div>

      {/* Bottom Row: Link + Join Button */}
      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[120px]">
          zoom/ksjud-ksiw9
        </span>
        <button
          type="button"
          className="h-6 px-3 bg-[#F0EFEA] hover:bg-[#E6E5DF] text-[#111111] text-[11px] font-bold rounded-full transition-colors cursor-pointer"
        >
          Join
        </button>
      </div>
    </div>
  );
}

export default MeetingCard;
