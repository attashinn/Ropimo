"use client";

import React from "react";
import { Plus } from "lucide-react";

export function AddTaskBox() {
  return (
    <div
      className="bg-white rounded-[26px] p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-neutral-100 w-full font-[family-name:var(--font-plus-jakarta)]"
    >
      <div className="group/box rounded-[20px] bg-[#E3EDFB] hover:bg-[#D9E7F9] border-2 border-dashed border-[#1D6FE8] p-5 flex flex-col items-center justify-center gap-2.5 transition-colors duration-150 cursor-pointer">
        {/* Solid Blue Circle (40px) with Plus Icon */}
        <div className="w-10 h-10 rounded-full bg-[#1D6FE8] text-white flex items-center justify-center shadow-sm">
          <Plus className="w-5 h-5 stroke-[2.6]" />
        </div>

        {/* Label */}
        <span className="text-[15px] font-semibold text-[#111111] tracking-tight">
          Schedule a meeting
        </span>
      </div>
    </div>
  );
}

export default AddTaskBox;
