"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", error, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={`h-11 sm:h-12 w-full rounded-2xl border bg-white px-4 pr-11 text-[14px] text-[#111] placeholder:text-[#999] focus:border-[#111] focus:ring-1 focus:ring-[#111] focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
            error ? "border-[#D93025]" : "border-[#E5E2D6]"
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#738079] hover:text-[#111] p-1 focus:outline-none transition-colors cursor-pointer"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
