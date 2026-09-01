"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { AppIcon, AppIconName } from "@/components/ui/app-icon";

export interface RopimoEmptyStateProps {
  icon?: AppIconName | React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  variant?: "dashed" | "card" | "minimal" | "subtle";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
}

export function RopimoEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  variant = "dashed",
  size = "md",
  children,
  className,
}: RopimoEmptyStateProps) {
  const containerVariants = {
    dashed: "border border-dashed border-[#D8DDD4] bg-[#FAFAF8]",
    card: "border border-[#D8DDD4] bg-white shadow-2xs",
    subtle: "border border-[#E7EADF] bg-[#FAF9F5]",
    minimal: "bg-transparent border-none shadow-none",
  };

  const sizeClasses = {
    sm: "min-h-[220px] p-6",
    md: "min-h-[340px] p-8 sm:p-12",
    lg: "min-h-[460px] p-12 sm:p-16",
  };

  const renderIcon = () => {
    if (!icon) return null;
    const iconContent =
      typeof icon === "string" ? <AppIcon name={icon} size={22} /> : icon;

    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-[#F4F3EE] text-[#10251F] shadow-2xs">
        {iconContent}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] text-center",
        containerVariants[variant],
        sizeClasses[size],
        className
      )}
    >
      {renderIcon()}

      <h3 className="mt-4 text-base font-bold tracking-tight text-[#18221E]">
        {title}
      </h3>

      {description && (
        <div className="mt-1.5 max-w-[320px] text-xs sm:text-sm text-[#65706A] leading-relaxed">
          {description}
        </div>
      )}

      {(actionLabel || secondaryActionLabel || children) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryActionLabel && (
            secondaryActionHref ? (
              <SecondaryButton size="sm" href={secondaryActionHref}>
                {secondaryActionLabel}
              </SecondaryButton>
            ) : (
              <SecondaryButton size="sm" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </SecondaryButton>
            )
          )}

          {actionLabel && (
            actionHref ? (
              <PrimaryButton size="sm" href={actionHref}>
                {actionLabel}
              </PrimaryButton>
            ) : (
              <PrimaryButton size="sm" onClick={onAction}>
                {actionLabel}
              </PrimaryButton>
            )
          )}

          {children}
        </div>
      )}
    </div>
  );
}
