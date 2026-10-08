"use client";

import React from "react";

export interface FloatingAvatarProps {
  name: string;
  imageSrc: string;
  bgColor: "yellow" | "blue" | "green";
  pillType: "white" | "blue";
  pillPlacement: "left" | "right";
  hasCursor?: boolean;
  cursorPlacement?: "top-left" | "top-right";
  className?: string;
  floatDuration?: number;
  floatDelay?: number;
}

const bgColors = {
  yellow: "bg-[#FFD93D]",
  blue: "bg-[#3B63F0]",
  green: "bg-[#7ED957]",
};

export function FloatingAvatar({
  name,
  imageSrc,
  bgColor,
  pillType,
  pillPlacement,
  hasCursor = false,
  cursorPlacement = "top-right",
  className = "",
}: FloatingAvatarProps) {
  return (
    <div
      className={`absolute z-20 flex items-center select-none ${className}`}
    >
      <div
        className={`relative flex items-center ${
          pillPlacement === "left" ? "flex-row-reverse" : "flex-row"
        } gap-2`}
      >
        {/* Avatar Circle Container */}
        <div
          className="w-[66px] h-[66px] sm:w-[74px] sm:h-[74px] rounded-full p-[3px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.09)] shrink-0"
        >
          <div
            className={`w-full h-full rounded-full ${bgColors[bgColor]} overflow-hidden relative flex items-center justify-center`}
          >
            {/* Portrait Image */}
            <img
              src={imageSrc}
              alt={name}
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          </div>
        </div>

        {/* Pill Label */}
        <div className="relative shrink-0">
          <div
            className={`px-3 py-1 rounded-full text-[13px] font-semibold tracking-tight shadow-[0_4px_14px_rgba(0,0,0,0.06)] font-[family-name:var(--font-plus-jakarta)] ${
              pillType === "blue"
                ? "bg-[#3B63F0] text-white shadow-[#3B63F0]/20"
                : "bg-white text-[#111111]"
            }`}
          >
            {name}
          </div>

          {/* Collaborative Cursor Arrow */}
          {hasCursor && (
            <div
              className={`absolute pointer-events-none ${
                cursorPlacement === "top-right"
                  ? "-top-3 -right-3"
                  : "-top-3 -left-3"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm text-[#3B63F0]"
                style={{
                  transform:
                    cursorPlacement === "top-right"
                      ? "rotate(-45deg)"
                      : "rotate(45deg)",
                }}
              >
                <path
                  d="M3 3L10.5 21L13.5 13.5L21 10.5L3 3Z"
                  fill="#3B63F0"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FloatingAvatar;
