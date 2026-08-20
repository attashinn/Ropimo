"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { slideUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

export interface MotionContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export function MotionContainer({
  children,
  className,
  variants = slideUp,
  initial = "hidden",
  animate = "visible",
  ...props
}: MotionContainerProps) {
  return (
    <motion.div
      variants={variants}
      initial={initial}
      animate={animate}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
