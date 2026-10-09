"use client";

import React from "react";

export function ConnectorLines() {
  return (
    <svg
      viewBox="0 0 1200 620"
      preserveAspectRatio="none"
      fill="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-10 hidden lg:block opacity-90"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left path 1: Ellyse -> Stokes */}
      <path
        d="M 90 150 L 90 260 Q 90 280 110 280 L 160 280"
        stroke="#B8B5A8"
        strokeWidth="1.75"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />

      {/* Left path 2: Stokes -> Alyssa */}
      <path
        d="M 230 330 L 230 440 Q 230 460 210 460 L 155 460"
        stroke="#B8B5A8"
        strokeWidth="1.75"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />

      {/* Right path 1: Sarah -> Starc */}
      <path
        d="M 1110 150 L 1110 260 Q 1110 280 1090 280 L 1040 280"
        stroke="#B8B5A8"
        strokeWidth="1.75"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />

      {/* Right path 2: Starc -> Conway */}
      <path
        d="M 970 330 L 970 440 Q 970 460 990 460 L 1045 460"
        stroke="#B8B5A8"
        strokeWidth="1.75"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default ConnectorLines;
