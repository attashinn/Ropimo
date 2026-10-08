"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextMarqueeProps {
  children: React.ReactNode;
  duration?: number;
  gap?: string;
  repeat?: number;
  className?: string;
}

export function TextMarquee({
  children,
  duration = 20,
  gap = "1rem",
  repeat = 3,
  className,
}: TextMarqueeProps) {
  return (
    <div className={cn("overflow-hidden whitespace-nowrap flex select-none", className)}>
      <div
        className="flex shrink-0 animate-marquee items-center"
        style={{
          animationDuration: `${duration}s`,
          gap,
        }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <React.Fragment key={i}>{children}</React.Fragment>
        ))}
      </div>
      <div
        aria-hidden
        className="flex shrink-0 animate-marquee items-center"
        style={{
          animationDuration: `${duration}s`,
          gap,
        }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <React.Fragment key={`clone-${i}`}>{children}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
