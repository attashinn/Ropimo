"use client";

import React from "react";

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingCard({
  children,
  className = "",
}: FloatingCardProps) {
  return (
    <div
      className={`bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-neutral-100/90 select-none font-[family-name:var(--font-plus-jakarta)] ${className}`}
    >
      {children}
    </div>
  );
}

export default FloatingCard;
