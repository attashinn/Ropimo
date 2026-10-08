"use client";

import React from "react";
import { Clock } from "lucide-react";

export function StatPillsOverlay() {
  const rows = [
    {
      label: "Hours logged",
      pills: [
        {
          text: "38h/week",
          bg: "bg-[#FFE76A]",
          textColor: "text-[#111111]",
        },
      ],
    },
    {
      label: "Meetings",
      pills: [
        {
          text: "6h",
          bg: "bg-[#7ED08A]",
          textColor: "text-[#111111]",
        },
        {
          text: "4h",
          bg: "bg-[#7ED08A]",
          textColor: "text-[#111111]",
        },
      ],
    },
    {
      label: "Open tasks",
      pills: [
        {
          text: "12",
          bg: "bg-[#FF6B3D]",
          textColor: "text-white",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-2 w-full font-[family-name:var(--font-plus-jakarta)]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="h-[46px] sm:h-[48px] bg-white rounded-full px-4 sm:px-5 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-neutral-100/80"
        >
          <span className="text-[13px] sm:text-[14px] font-semibold text-[#111111] tracking-tight">
            {row.label}
          </span>

          <div className="flex items-center gap-1.5">
            {row.pills.map((pill, pillIdx) => (
              <span
                key={pillIdx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold ${pill.bg} ${pill.textColor} shadow-xs select-none`}
              >
                <Clock className="w-3 h-3 stroke-[2.2] shrink-0" />
                <span>{pill.text}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { StatPillsOverlay as StatPill };
export default StatPillsOverlay;
