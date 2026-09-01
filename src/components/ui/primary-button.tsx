"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface PrimaryButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  arrowIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function PrimaryButton({
  children,
  href,
  onClick,
  className,
  type = "button",
  disabled = false,
  arrowIcon,
  size = "md",
}: PrimaryButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const sizeClasses = {
    sm: "pl-3.5 pr-1.5 py-1.5 text-xs font-semibold gap-2.5 rounded-[8px] sm:rounded-[10px]",
    md: "pl-5 pr-2 py-2 text-sm sm:text-base font-medium gap-3.5 rounded-[12px]",
    lg: "pl-6 pr-2.5 py-2.5 text-base sm:text-lg font-medium gap-4 rounded-[14px]",
  };

  const arrowBoxSizes = {
    sm: "h-6 w-6 rounded-[6px]",
    md: "h-8 w-8 sm:h-9 sm:w-9 rounded-[8px]",
    lg: "h-9 w-9 sm:h-10 sm:w-10 rounded-[10px]",
  };

  const defaultArrow = (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10251F"
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
      <span className="tracking-tight text-[#F4F3EE]">{children}</span>
      <motion.span
        animate={{
          x: isHovered ? 2 : 0,
          backgroundColor: isHovered ? "#B7E63D" : "#C7F34A",
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "flex shrink-0 items-center justify-center bg-[#C7F34A]",
          arrowBoxSizes[size]
        )}
      >
        {arrowIcon || defaultArrow}
      </motion.span>
    </>
  );

  const buttonClasses = cn(
    "group inline-flex items-center justify-between bg-[#10251F] text-[#F4F3EE] transition-colors duration-200 hover:bg-[#18342C] active:bg-[#0C1B16] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none shadow-xs",
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
