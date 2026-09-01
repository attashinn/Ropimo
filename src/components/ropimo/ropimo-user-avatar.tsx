"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type PresenceStatus = "online" | "busy" | "away" | "offline";

export interface RopimoUserAvatarProps {
  name?: string;
  imageUrl?: string | null;
  initials?: string;
  size?: AvatarSize;
  presence?: PresenceStatus;
  className?: string;
  showBorder?: boolean;
}

const AVATAR_PALETTE = [
  { bg: "bg-[#EAF4E2]", text: "text-[#246244]", border: "border-[#D8DDD4]" },
  { bg: "bg-[#FEF6E4]", text: "text-[#B58500]", border: "border-[#F8E3B6]" },
  { bg: "bg-[#FDECE8]", text: "text-[#D9383A]", border: "border-[#F8CBC2]" },
  { bg: "bg-[#E7EADF]", text: "text-[#10251F]", border: "border-[#D8DDD4]" },
  { bg: "bg-[#EBF3FE]", text: "text-[#1E40AF]", border: "border-[#BFDBFE]" },
  { bg: "bg-[#F3E8FF]", text: "text-[#6B21A8]", border: "border-[#E9D5FF]" },
];

function getInitials(name?: string, explicitInitials?: string): string {
  if (explicitInitials) return explicitInitials.toUpperCase().slice(0, 2);
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name?: string) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

export function RopimoUserAvatar({
  name,
  imageUrl,
  initials,
  size = "md",
  presence,
  className,
  showBorder = true,
}: RopimoUserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const colorScheme = getColorForName(name);
  const displayInitials = getInitials(name, initials);

  const sizeClasses = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-xs font-semibold",
    md: "h-9 w-9 text-xs font-bold",
    lg: "h-11 w-11 text-sm font-bold",
    xl: "h-14 w-14 text-base font-bold",
  };

  const presenceDotSizes = {
    xs: "h-1.5 w-1.5 ring-1 ring-white",
    sm: "h-2 w-2 ring-1.5 ring-white",
    md: "h-2.5 w-2.5 ring-2 ring-white",
    lg: "h-3 w-3 ring-2 ring-white",
    xl: "h-3.5 w-3.5 ring-2 ring-white",
  };

  const presenceColors: Record<PresenceStatus, string> = {
    online: "bg-[#246244]",
    busy: "bg-[#D9383A]",
    away: "bg-[#D97706]",
    offline: "bg-[#8A958F]",
  };

  const hasImage = Boolean(imageUrl && !imageError);

  return (
    <div className={cn("relative inline-block shrink-0 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full font-medium tracking-wider shadow-2xs",
          sizeClasses[size],
          showBorder && (hasImage ? "border border-[#D8DDD4]" : colorScheme.border),
          !hasImage && colorScheme.bg,
          !hasImage && colorScheme.text
        )}
      >
        {hasImage ? (
          <img
            src={imageUrl!}
            alt={name || "User Avatar"}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{displayInitials}</span>
        )}
      </div>

      {presence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full",
            presenceDotSizes[size],
            presenceColors[presence]
          )}
          aria-label={`Status: ${presence}`}
        />
      )}
    </div>
  );
}

export interface RopimoAvatarGroupProps {
  users: Array<{
    id?: string;
    name: string;
    avatarUrl?: string | null;
    initials?: string;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function RopimoAvatarGroup({
  users,
  max = 4,
  size = "sm",
  className,
}: RopimoAvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remaining = users.length - max;

  const overflowSizes = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-xs",
    xl: "h-14 w-14 text-sm",
  };

  return (
    <div className={cn("flex items-center -space-x-2 overflow-hidden py-1", className)}>
      {visibleUsers.map((u, idx) => (
        <RopimoUserAvatar
          key={u.id || `${u.name}-${idx}`}
          name={u.name}
          imageUrl={u.avatarUrl}
          initials={u.initials}
          size={size}
          className="ring-2 ring-white"
        />
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full border border-[#D8DDD4] bg-[#F4F3EE] font-bold text-[#10251F] ring-2 ring-white shadow-2xs",
            overflowSizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
