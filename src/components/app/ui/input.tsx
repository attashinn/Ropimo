import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`h-8 w-full rounded-lg border border-hairline bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-3 transition-colors duration-120 ease-out focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50 disabled:bg-hover ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
