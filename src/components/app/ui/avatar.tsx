import * as React from "react";
import Image from "next/image";

export type AvatarSize = 20 | 24 | 28;
export type AvatarAccent = "green" | "yellow" | "peach" | "blue" | "orange";
export type BrandAccent = AvatarAccent;

export interface AvatarProps {
  name?: string;
  initials?: string;
  src?: string;
  size?: AvatarSize;
  accent?: AvatarAccent;
  className?: string;
}

const ACCENTS: Record<AvatarAccent, { bg: string; text: string }> = {
  green: { bg: "bg-accent-green", text: "text-[#10251F]" },
  yellow: { bg: "bg-accent-yellow", text: "text-[#2A2300]" },
  peach: { bg: "bg-accent-peach", text: "text-[#3D140B]" },
  blue: { bg: "bg-accent-blue", text: "text-white" },
  orange: { bg: "bg-accent-orange", text: "text-white" },
};

const ACCENT_KEYS: AvatarAccent[] = ["green", "yellow", "peach", "blue", "orange"];

function getInitials(name?: string, fallback: string = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDeterministicAccent(name?: string): AvatarAccent {
  if (!name) return "green";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ACCENT_KEYS.length;
  return ACCENT_KEYS[index];
}

export function Avatar({
  name,
  initials,
  src,
  size = 24,
  accent,
  className = "",
}: AvatarProps) {
  const resolvedAccent = accent || getDeterministicAccent(name || initials);
  const colorScheme = ACCENTS[resolvedAccent];
  const displayInitials = initials || getInitials(name);

  const sizeClass = {
    20: "h-5 w-5 text-[9px]",
    24: "h-6 w-6 text-[10px]",
    28: "h-7 w-7 text-[11px]",
  }[size];

  if (src) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClass} ${className}`}
      >
        <Image
          src={src}
          alt={name || "Avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none ${sizeClass} ${colorScheme.bg} ${colorScheme.text} ${className}`}
      title={name}
      aria-label={name || "Avatar"}
    >
      <span className="leading-none">{displayInitials}</span>
    </div>
  );
}
