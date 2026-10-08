"use client";

import React from "react";

interface TagProps {
  children: React.ReactNode;
  className?: string;
  tilted?: boolean;
}

export function Tag({ children, className = "", tilted = false }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-3.5 py-1 rounded-full bg-[#EFECE0] text-[11.5px] font-bold text-neutral-800 tracking-wider uppercase select-none shadow-xs font-[family-name:var(--font-plus-jakarta)] ${
        tilted ? "-rotate-1" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}

export default Tag;
