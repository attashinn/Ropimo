import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const heroButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-card text-foreground hover:bg-accent",
        ghost: "hover:bg-accent text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-md",
        sm: "h-9 px-3 rounded-md text-xs",
        lg: "h-11 px-6 rounded-lg",
        "icon-lg": "h-11 w-11 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface HeroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof heroButtonVariants> {
  nativeButton?: boolean;
  render?: React.ReactElement<any>;
}

export const Button = React.forwardRef<HTMLButtonElement, HeroButtonProps>(
  ({ className, variant, size, nativeButton = true, render, children, ...props }, ref) => {
    const combinedClassName = cn(heroButtonVariants({ variant, size, className }));

    if (render && React.isValidElement(render)) {
      const el = render as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
      return React.cloneElement(el, {
        className: cn(combinedClassName, el.props?.className),
        children: children ?? el.props?.children,
        ...(props as any),
      });
    }

    return (
      <button ref={ref} className={combinedClassName} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "HeroButton";
