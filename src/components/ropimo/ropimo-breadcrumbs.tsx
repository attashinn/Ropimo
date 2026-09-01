"use client";

import * as React from "react";
import Link from "next/link";
import { Home, MoreHorizontal, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
  icon?: React.ReactNode;
}

export interface RopimoBreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  separator?: React.ReactNode;
  maxVisible?: number;
  className?: string;
}

export function RopimoBreadcrumbs({
  items,
  showHome = false,
  homeHref = "/app",
  separator = <span className="text-[#B8C0B2] select-none font-light">/</span>,
  maxVisible = 4,
  className,
}: RopimoBreadcrumbsProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!items || items.length === 0) return null;

  const shouldCollapse = items.length > maxVisible && !isExpanded;

  let displayItems = items;
  if (shouldCollapse) {
    displayItems = [items[0], items[items.length - 2], items[items.length - 1]];
  }

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-xs text-[#65706A]",
        className
      )}
    >
      {showHome && (
        <div className="flex items-center gap-1.5">
          <Link
            href={homeHref}
            className="flex items-center text-[#65706A] hover:text-[#18221E] transition-colors"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {separator}
        </div>
      )}

      {shouldCollapse && (
        <>
          {/* First item */}
          <Link
            href={items[0].href || "#"}
            className="font-medium text-[#65706A] hover:text-[#18221E] transition-colors truncate max-w-[140px]"
          >
            {items[0].label}
          </Link>
          {separator}

          {/* Ellipsis button to expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A] hover:bg-[#E7EADF] hover:text-[#18221E] transition-colors"
            aria-label="Show all breadcrumbs"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
          {separator}

          {/* Remaining items */}
          {items.slice(items.length - 2).map((item, index) => {
            const isLast = index === 1;
            const isCurrent = item.isCurrent ?? isLast;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && separator}
                {item.href && !isCurrent ? (
                  <Link
                    href={item.href}
                    className="font-medium text-[#65706A] hover:text-[#18221E] transition-colors truncate max-w-[160px] sm:max-w-[220px]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate max-w-[180px] sm:max-w-[260px]",
                      isCurrent
                        ? "font-bold text-[#18221E]"
                        : "font-medium text-[#65706A]"
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </>
      )}

      {!shouldCollapse &&
        items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.isCurrent ?? isLast;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && separator}

              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 font-medium text-[#65706A] hover:text-[#18221E] transition-colors truncate max-w-[160px] sm:max-w-[220px]"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1 truncate max-w-[180px] sm:max-w-[260px]",
                    isCurrent
                      ? "font-bold text-[#18221E]"
                      : "font-medium text-[#65706A]"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </React.Fragment>
          );
        })}
    </nav>
  );
}
