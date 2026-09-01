"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "ghost" | "outline" | "solid";
  size?: "sm" | "md" | "lg";
  ariaLabel: string;
}

export function IconButton({
  children,
  className,
  variant = "outline",
  size = "md",
  ariaLabel,
  disabled = false,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8 rounded-[8px]",
    md: "h-10 w-10 rounded-[10px]",
    lg: "h-12 w-12 rounded-[12px]",
  };

  const variantClasses = {
    ghost: "text-[#18221E] hover:bg-[#E7EADF]/60 active:bg-[#E7EADF]",
    outline:
      "border border-[#D8DDD4] bg-white text-[#18221E] hover:border-[#B8C0B2] hover:bg-[#FAF9F5] shadow-2xs active:bg-[#F4F3EE]",
    solid:
      "bg-[#10251F] text-[#F4F3EE] hover:bg-[#18342C] shadow-xs active:bg-[#0C1B16]",
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
