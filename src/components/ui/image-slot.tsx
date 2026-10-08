"use client";

import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";

export interface ImageSlotProps {
  /** Optional source path to real image. If provided, renders Next.js Image */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Label describing the image, e.g. "Product screenshot" */
  label?: string;
  /** Target dimensions for image, e.g. "1200x750" */
  dimensions?: string;
  /** Target image file path, e.g. "/images/dashboard.png" */
  path?: string;
  /** Full custom fallback label if preferred, e.g. "Product screenshot - 1200x750 - /images/dashboard.png" */
  customLabel?: string;
  /** Width in pixels when not using fill */
  width?: number;
  /** Height in pixels when not using fill */
  height?: number;
  /** If true, fills the parent container */
  fill?: boolean;
  /** Custom rounded corner class, defaults to rounded-[28px] */
  rounded?: string;
  /** Additional wrapper classes */
  className?: string;
  /** Priority loading flag */
  priority?: boolean;
}

export function ImageSlot({
  src,
  alt = "Preview image",
  label,
  dimensions,
  path,
  customLabel,
  width,
  height,
  fill = false,
  rounded = "rounded-[28px]",
  className = "",
  priority = false,
}: ImageSlotProps) {
  // If real image source is provided, render Next.js Image
  if (src) {
    return (
      <div
        className={`relative overflow-hidden ${rounded} ${className}`}
      >
        {fill ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            className="object-cover w-full h-full"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width ?? 1200}
            height={height ?? 750}
            priority={priority}
            className="w-full h-auto object-cover"
          />
        )}
      </div>
    );
  }

  // Format placeholder label
  const displayText =
    customLabel ||
    [label || "Screenshot", dimensions, path].filter(Boolean).join(" - ") ||
    "Image Slot - 1200x750 - /images/placeholder.png";

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 sm:p-10 bg-[#E9E6DA] border-2 border-dashed border-[#B8B4A6] text-[#4A4A48] select-none ${rounded} ${className}`}
    >
      <div className="flex flex-col items-center text-center gap-2.5 max-w-sm sm:max-w-md">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#DFDBCF] flex items-center justify-center text-[#5A5954] shadow-xs">
          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
        </div>
        <p className="text-[14px] sm:text-[15.5px] font-bold text-[#2D2D2C] tracking-tight leading-snug">
          {displayText}
        </p>
        <span className="text-[11px] sm:text-[11.5px] font-semibold text-[#7A7870] uppercase tracking-wider">
          Placeholder Slot
        </span>
      </div>
    </div>
  );
}

export default ImageSlot;
