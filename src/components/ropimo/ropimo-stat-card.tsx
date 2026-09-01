"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIcon, AppIconName } from "@/components/ui/app-icon";

export interface RopimoStatTrend {
  value: string | number;
  label?: string;
  direction?: "up" | "down" | "neutral";
  isPositive?: boolean;
}

export interface RopimoStatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: AppIconName | React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: RopimoStatTrend;
  badge?: React.ReactNode;
  sparklineData?: number[];
  href?: string;
  onClick?: () => void;
  variant?: "default" | "warm" | "lime" | "ink";
  className?: string;
}

export function RopimoStatCard({
  label,
  value,
  description,
  icon,
  iconBg,
  iconColor,
  trend,
  badge,
  sparklineData,
  href,
  onClick,
  variant = "default",
  className,
}: RopimoStatCardProps) {
  const isInteractive = Boolean(href || onClick);

  const variantClasses = {
    default: "bg-white border-[#D8DDD4] text-[#18221E]",
    warm: "bg-[#FAF9F5] border-[#D8DDD4] text-[#18221E]",
    lime: "bg-[#C7F34A] border-[#B7E63D] text-[#10251F]",
    ink: "bg-[#10251F] border-[#18342C] text-[#F4F3EE]",
  };

  const labelColorClasses = {
    default: "text-[#8A958F]",
    warm: "text-[#8A958F]",
    lime: "text-[#10251F]/70",
    ink: "text-[#A1B3AC]",
  };

  const descColorClasses = {
    default: "text-[#65706A]",
    warm: "text-[#65706A]",
    lime: "text-[#10251F]/80",
    ink: "text-[#D8DDD4]",
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return (
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[8px] border shrink-0 transition-transform group-hover:scale-105",
            iconBg || (variant === "ink" ? "bg-[#18342C] border-[#25463C]" : "bg-[#EAF4E2] border-[#D8DDD4]"),
            iconColor || (variant === "ink" ? "text-[#C7F34A]" : "text-[#246244]")
          )}
        >
          <AppIcon name={icon} size={18} />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-[8px] border shrink-0 transition-transform group-hover:scale-105",
          iconBg || (variant === "ink" ? "bg-[#18342C] border-[#25463C]" : "bg-[#EAF4E2] border-[#D8DDD4]"),
          iconColor || (variant === "ink" ? "text-[#C7F34A]" : "text-[#246244]")
        )}
      >
        {icon}
      </div>
    );
  };

  const renderTrend = () => {
    if (!trend) return null;
    const direction = trend.direction || (Number(trend.value) >= 0 ? "up" : "down");
    const isGood = trend.isPositive ?? (direction === "up");

    let trendBg = isGood ? "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]" : "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]";
    if (direction === "neutral") {
      trendBg = "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]";
    }

    if (variant === "ink") {
      trendBg = isGood ? "bg-[#18342C] text-[#C7F34A] border-[#25463C]" : "bg-[#381B1B] text-[#F87171] border-[#552727]";
    }

    return (
      <div className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", trendBg)}>
        {direction === "up" && <ArrowUpRight className="h-3 w-3" />}
        {direction === "down" && <ArrowDownRight className="h-3 w-3" />}
        {direction === "neutral" && <Minus className="h-3 w-3" />}
        <span>{trend.value}</span>
        {trend.label && <span className="font-normal opacity-80">{trend.label}</span>}
      </div>
    );
  };

  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 28;
    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(" ");

    const strokeColor = variant === "ink" ? "#C7F34A" : variant === "lime" ? "#10251F" : "#246244";

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const cardContent = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-[14px] border p-5 shadow-2xs transition-all duration-200",
        variantClasses[variant],
        isInteractive && "cursor-pointer hover:border-[#B8C0B2] hover:shadow-xs active:scale-[0.99]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span
            className={cn(
              "text-[11px] font-bold uppercase tracking-widest",
              labelColorClasses[variant]
            )}
          >
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {value}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          {renderIcon()}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/5 pt-3">
        {description && (
          <p className={cn("text-xs leading-relaxed truncate", descColorClasses[variant])}>
            {description}
          </p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {renderSparkline()}
          {renderTrend()}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
