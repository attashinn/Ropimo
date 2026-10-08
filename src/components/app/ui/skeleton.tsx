import * as React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "full";
}

export function Skeleton({
  className = "",
  rounded = "sm",
  ...props
}: SkeletonProps) {
  const radiusClass = {
    sm: "rounded-lg",
    md: "rounded-[12px]",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={`animate-pulse bg-[#ECE9DD]/80 ${radiusClass} ${className}`}
      {...props}
    />
  );
}
