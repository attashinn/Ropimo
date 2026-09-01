"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SecondaryButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  arrowIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function SecondaryButton({
  children,
  href,
  onClick,
  className,
  type = "button",
  disabled = false,
  arrowIcon,
  size = "md",
}: SecondaryButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const sizeClasses = {
    sm: "pl-4 pr-1.5 py-1.5 text-xs gap-3 rounded-[10px]",
    md: "pl-5 pr-2 py-2 text-sm sm:text-base font-medium gap-3.5 rounded-[12px]",
    lg: "pl-6 pr-2.5 py-2.5 text-base sm:text-lg font-medium gap-4 rounded-[14px]",
  };

  const arrowBoxSizes = {
    sm: "h-7 w-7 rounded-[7px]",
    md: "h-8 w-8 sm:h-9 sm:w-9 rounded-[8px]",
    lg: "h-9 w-9 sm:h-10 sm:w-10 rounded-[10px]",
  };

  const defaultArrow = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#18221E"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  const innerContent = (
    <>
      <span className="tracking-tight text-[#18221E]">{children}</span>
      <motion.span
        animate={{
          x: isHovered ? 2 : 0,
          backgroundColor: isHovered ? "#DDE2D3" : "#E7EADF",
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "flex shrink-0 items-center justify-center bg-[#E7EADF] text-[#18221E]",
          arrowBoxSizes[size]
        )}
      >
        {arrowIcon || defaultArrow}
      </motion.span>
    </>
  );

  const buttonClasses = cn(
    "group inline-flex items-center justify-between border border-[#D8DDD4] bg-[#FFFFFF] text-[#18221E] transition-all duration-200 hover:border-[#B8C0B2] hover:bg-[#FAF9F5] active:bg-[#F4F3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none shadow-2xs",
    sizeClasses[size],
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={buttonClasses}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={buttonClasses}
    >
      {innerContent}
    </button>
  );
}
