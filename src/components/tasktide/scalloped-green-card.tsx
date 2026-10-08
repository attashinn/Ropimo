"use client";

import React from "react";
import { MeetingCard } from "./meeting-card";
import { PersonCard } from "./person-card";

export function ScallopedGreenCard() {
  return (
    <div className="relative w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* SVG Scalloped Green Background with 5 top & 5 bottom lobes */}
      <svg
        viewBox="0 0 340 340"
        className="absolute inset-0 w-full h-full drop-shadow-[0_16px_44px_rgba(126,208,138,0.28)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="
            M 0 28
            C 16 2, 52 2, 68 28
            C 84 2, 120 2, 136 28
            C 152 2, 188 2, 204 28
            C 220 2, 256 2, 272 28
            C 288 2, 324 2, 340 28
            L 340 312
            C 324 338, 288 338, 272 312
            C 256 338, 220 338, 204 312
            C 188 338, 152 338, 136 312
            C 120 338, 84 338, 68 312
            C 52 338, 16 338, 0 312
            Z
          "
          fill="#7ED08A"
        />
      </svg>

      {/* Smiling man in blue denim shirt with head popping up above card */}
      <div className="absolute inset-x-0 bottom-0 top-[-34px] flex items-end justify-center overflow-visible pointer-events-none">
        <div className="relative w-[90%] h-[108%] overflow-hidden rounded-b-[48px] flex items-end justify-center">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
            alt="Smiling man in blue shirt"
            className="w-full h-full object-cover object-top scale-105"
          />
        </div>
      </div>

      {/* Floating Card A (Team Meeting - Top Right) */}
      <div className="absolute -top-4 -right-4 sm:-right-8 lg:-right-10 z-20">
        <MeetingCard />
      </div>

      {/* Floating Card B (Danielle Price - Bottom Right) */}
      <div className="absolute bottom-6 -right-2 sm:-right-6 lg:-right-8 z-20">
        <PersonCard />
      </div>
    </div>
  );
}

export default ScallopedGreenCard;
