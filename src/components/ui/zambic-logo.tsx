import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ZambicLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  priority?: boolean;
  theme?: "dark" | "light" | "auto";
}

export function ZambicIcon({
  className,
  size = 28,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 218 218"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path d="M54.5013 108.998L54.1367 109L54.5014 109.002C24.4011 109.002 2.39311e-05 133.403 2.39311e-05 163.503H54.5002L54.5002 218C84.5814 218 108.97 193.629 109 163.555C109.03 193.629 133.419 218 163.5 218V163.503L218 163.503C218 133.403 193.599 109.002 163.499 109.002L163.863 109L163.499 108.998C193.599 108.998 218 84.5972 218 54.4969L163.5 54.4969L163.5 0C133.417 -3.94501e-06 109.027 24.3739 109 54.4508C108.974 24.3739 84.5833 1.315e-06 54.5002 0L54.5002 54.4969L0 54.4969C-2.63145e-06 84.5972 24.4011 108.998 54.5013 108.998Z" />
    </svg>
  );
}

export function ZambicLogo({
  className,
  size = 28,
  showText = true,
  theme = "light",
  priority = true,
}: ZambicLogoProps) {
  if (!showText) {
    return (
      <div className={cn("inline-flex items-center select-none", className)}>
        <ZambicIcon
          size={size}
          className={theme === "dark" ? "text-white" : "text-[#10251F]"}
        />
      </div>
    );
  }

  const logoSrc = theme === "dark" ? "/logo/white-logo.svg" : "/logo/black-logo.svg";

  return (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      <Image
        src={logoSrc}
        alt="Zambic"
        width={Math.round(size * 4.69)}
        height={size}
        className="h-auto w-auto max-h-[32px] object-contain"
        priority={priority}
      />
    </div>
  );
}

// Backward compatibility alias
export const RopimoLogo = ZambicLogo;
export type RopimoLogoProps = ZambicLogoProps;
