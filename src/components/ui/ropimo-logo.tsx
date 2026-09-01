import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface RopimoLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  priority?: boolean;
}

export function RopimoLogo({
  className,
  size = 28,
  showText = true,
  priority = true,
}: RopimoLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      <Image
        src="/logo/ropimo-logo.png"
        alt="Ropimo Logo"
        width={showText ? size * 4 : size}
        height={size}
        className="h-auto w-auto max-h-[32px] object-contain"
        priority={priority}
      />
    </div>
  );
}
