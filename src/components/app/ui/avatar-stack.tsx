import * as React from "react";
import { Avatar, type AvatarProps, type AvatarSize } from "./avatar";

export type AvatarStackItem = Omit<AvatarProps, "size">;

export interface AvatarStackProps {
  items: AvatarStackItem[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarStack({
  items,
  max = 3,
  size = 24,
  className = "",
}: AvatarStackProps) {
  const visible = items.slice(0, max);
  const remaining = items.length - max;

  const sizeClass = {
    20: "h-5 w-5 text-[9px]",
    24: "h-6 w-6 text-[10px]",
    28: "h-7 w-7 text-[11px]",
  }[size];

  return (
    <div className={`inline-flex items-center -space-x-1.5 select-none ${className}`}>
      {visible.map((item, idx) => (
        <div
          key={idx}
          className="relative inline-block rounded-full ring-2 ring-surface"
        >
          <Avatar {...item} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`relative inline-flex items-center justify-center rounded-full bg-hover text-ink-2 font-medium ring-2 ring-surface ${sizeClass}`}
          title={`${remaining} more`}
        >
          <span className="leading-none">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
