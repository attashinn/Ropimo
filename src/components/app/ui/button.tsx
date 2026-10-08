import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-120 ease-out select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-ink";

    const sizeStyles = {
      sm: "h-7 px-2.5 text-[12px]",
      md: "h-8 px-3 text-[13px]",
    }[size];

    const variantStyles = {
      primary: "bg-ink text-white hover:bg-black active:bg-neutral-900",
      secondary:
        "border border-hairline bg-surface text-ink hover:bg-hover active:bg-selected",
      ghost: "bg-transparent text-ink-2 hover:text-ink hover:bg-hover active:bg-selected",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
