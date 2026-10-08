"use client";

import React from "react";
import Link from "next/link";

interface BrandButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandButton({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
}: BrandButtonProps) {
  const baseClasses =
    "rounded-full font-bold tracking-tight inline-flex items-center justify-center transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none font-[family-name:var(--font-plus-jakarta)]";

  const sizeClasses = {
    sm: "px-5 py-2 text-[13px]",
    md: "px-7 py-3 text-[14px]",
    lg: "px-8 py-3.5 text-[15px]",
  };

  const variantClasses = {
    primary: "bg-[#111111] hover:bg-black text-white shadow-sm",
    secondary: "bg-[#EFECE0] hover:bg-[#E5E1D3] text-[#111111] shadow-xs",
    outline: "bg-transparent border border-neutral-300 hover:bg-neutral-100 text-[#111111]",
  };

  const combined = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combined}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={combined}>
      {children}
    </button>
  );
}

export default BrandButton;
