"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RopimoMetricDelta {
  value: string | number;
  isPositive?: boolean;
  label?: string;
  neutral?: boolean;
}

export interface RopimoMetricTarget {
  current: number;
  max: number;
  label?: string;
}

export interface RopimoMetricProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  delta?: RopimoMetricDelta;
  target?: RopimoMetricTarget;
  helperText?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
  inline?: boolean;
  className?: string;
}

export function RopimoMetric({
  label,
  value,
  prefix,
  suffix,
  delta,
  target,
  helperText,
  size = "md",
  align = "left",
  inline = false,
  className,
}: RopimoMetricProps) {
  const sizeClasses = {
    sm: {
      label: "text-[10px]",
      value: "text-lg",
      delta: "text-[10px]",
    },
    md: {
      label: "text-[11px]",
      value: "text-2xl sm:text-3xl",
      delta: "text-[11px]",
    },
    lg: {
      label: "text-xs",
      value: "text-3xl sm:text-4xl",
      delta: "text-xs",
    },
  };

  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  const renderDelta = () => {
    if (!delta) return null;
    const isGood = delta.isPositive ?? true;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold",
          sizeClasses[size].delta,
          delta.neutral
            ? "text-[#65706A]"
            : isGood
            ? "text-[#246244]"
            : "text-[#D9383A]"
        )}
      >
        {!delta.neutral && (
          isGood ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )
        )}
        {delta.neutral && <Minus className="h-3 w-3" />}
        <span>{delta.value}</span>
        {delta.label && <span className="font-normal text-[#65706A] ml-0.5">{delta.label}</span>}
      </span>
    );
  };

  const renderTargetBar = () => {
    if (!target || target.max <= 0) return null;
    const percentage = Math.min(Math.max((target.current / target.max) * 100, 0), 100);

    return (
      <div className="w-full space-y-1.5 pt-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#65706A]">
          <span>{target.label || "Target progress"}</span>
          <span className="font-semibold text-[#18221E]">{Math.round(percentage)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7EADF]">
          <div
            className="h-full rounded-full bg-[#10251F] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (inline) {
    return (
      <div
        className={cn(
          "flex items-baseline gap-2",
          alignClasses[align],
          className
        )}
      >
        <span
          className={cn(
            "font-bold uppercase tracking-wider text-[#8A958F]",
            sizeClasses[size].label
          )}
        >
          {label}:
        </span>
        <span
          className={cn(
            "font-bold tracking-tight text-[#18221E]",
            sizeClasses[size].value
          )}
        >
          {prefix}
          {value}
          {suffix}
        </span>
        {renderDelta()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col space-y-1",
        alignClasses[align],
        className
      )}
    >
      <span
        className={cn(
          "font-bold uppercase tracking-widest text-[#8A958F]",
          sizeClasses[size].label
        )}
      >
        {label}
      </span>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-bold tracking-tight text-[#18221E]",
            sizeClasses[size].value
          )}
        >
          {prefix}
          {value}
          {suffix}
        </span>
        {renderDelta()}
      </div>

      {helperText && (
        <p className="text-xs text-[#65706A] leading-normal">{helperText}</p>
      )}

      {renderTargetBar()}
    </div>
  );
}
