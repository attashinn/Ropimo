"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { RopimoBreadcrumbs, BreadcrumbItem } from "./ropimo-breadcrumbs";

export interface RopimoPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[] | React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  filters?: React.ReactNode;
  meta?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function RopimoPageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  action,
  secondaryAction,
  filters,
  meta,
  backHref,
  className,
}: RopimoPageHeaderProps) {
  const renderBreadcrumbs = () => {
    if (!breadcrumbs) return null;
    if (Array.isArray(breadcrumbs)) {
      return <RopimoBreadcrumbs items={breadcrumbs} className="mb-2" />;
    }
    return <div className="mb-2">{breadcrumbs}</div>;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-[#D8DDD4] pb-5 pt-1",
        className
      )}
    >
      {renderBreadcrumbs()}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E] truncate">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {description && (
              <div className="text-xs sm:text-sm text-[#65706A] leading-relaxed">
                {description}
              </div>
            )}

            {meta && <div className="mt-2 flex items-center gap-3 pt-1">{meta}</div>}
          </div>
        </div>

        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:pt-0.5">
            {secondaryAction}
            {action}
          </div>
        )}
      </div>

      {filters && <div className="mt-1 pt-2 border-t border-[#E7EADF]">{filters}</div>}
    </div>
  );
}
