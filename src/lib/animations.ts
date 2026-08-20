import type { Variants, Transition } from "motion/react";

/**
 * Common transition presets for SaaS UI
 */
export const transitions = {
  spring: {
    type: "spring",
    stiffness: 260,
    damping: 20,
  } as Transition,
  smooth: {
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1.0],
  } as Transition,
  slow: {
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1],
  } as Transition,
};

/**
 * Reusable animation variants
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.smooth,
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};
