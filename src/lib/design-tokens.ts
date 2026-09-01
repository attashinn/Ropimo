/**
 * Ropimo Design Tokens
 * Warm, editorial, calm, and human-designed SaaS design system.
 */

export const colors = {
  ink: "#10251F",
  inkHover: "#18342C",
  lime: "#C7F34A",
  limeHover: "#B7E63D",

  background: "#F4F3EE",
  surface: "#FFFFFF",
  softGreen: "#E7EADF",

  border: "#D8DDD4",
  borderDark: "#B8C0B2",

  text: "#18221E",
  mutedText: "#65706A",
  lightText: "#F4F3EE",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  full: "9999px",
} as const;

export const shadows = {
  subtle: "0 1px 2px rgba(16, 37, 31, 0.04)",
  card: "0 1px 3px rgba(16, 37, 31, 0.04), 0 6px 16px rgba(16, 37, 31, 0.02)",
  elevated: "0 4px 6px rgba(16, 37, 31, 0.04), 0 12px 24px rgba(16, 37, 31, 0.04)",
} as const;

export const transitions = {
  fast: {
    duration: 0.18,
    ease: [0.2, 0, 0, 1],
  },
  standard: {
    duration: 0.24,
    ease: [0.25, 0.1, 0.25, 1],
  },
} as const;
