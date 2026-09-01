"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RopimoFormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  columns?: 1 | 2 | 3;
  variant?: "card" | "plain" | "warm";
  separator?: boolean;
  className?: string;
}

export function RopimoFormSection({
  title,
  description,
  badge,
  action,
  children,
  footer,
  columns = 1,
  variant = "card",
  separator = true,
  className,
}: RopimoFormSectionProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  const containerVariants = {
    card: "rounded-[14px] border border-[#D8DDD4] bg-white p-5 sm:p-6 shadow-2xs",
    warm: "rounded-[14px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 sm:p-6 shadow-2xs",
    plain: "space-y-4",
  };

  return (
    <div className={cn(containerVariants[variant], className)}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-[#18221E]">
              {title}
            </h3>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#65706A] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {separator && variant !== "plain" && (
        <div className="my-5 border-t border-[#E7EADF]" />
      )}

      {/* Form Content Fields Grid */}
      <div className={cn("grid gap-4 sm:gap-5", columnClasses[columns])}>
        {children}
      </div>

      {/* Optional Footer */}
      {footer && (
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E7EADF] pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
