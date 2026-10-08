import * as React from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-transparent text-ink-2 hover:text-ink hover:bg-hover active:bg-selected transition-colors duration-120 ease-out select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-ink ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
