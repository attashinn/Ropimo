import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#111111",
          cream: "#EFECE0",
          offwhite: "#FAF9F6",
          peach: "#FFCFC2",
          orange: "#FF6B3D",
          blue: "#3B63F0",
          green: "#7ED08A",
          yellow: "#FFE76A",
          lightblue: "#E3EDFB",
        },
        canvas: "var(--app-canvas)",
        surface: "var(--app-surface)",
        hairline: "var(--app-hairline)",
        hover: "var(--app-hover)",
        selected: "var(--app-selected)",
        ink: "var(--app-ink)",
        "ink-2": "var(--app-ink-2)",
        "ink-3": "var(--app-ink-3)",
        status: {
          done: "var(--app-status-done)",
          progress: "var(--app-status-progress)",
          overdue: "var(--app-status-overdue)",
          none: "var(--app-status-none)",
        },
        accent: {
          green: "var(--app-accent-green)",
          yellow: "var(--app-accent-yellow)",
          peach: "var(--app-accent-peach)",
          blue: "var(--app-accent-blue)",
          orange: "var(--app-accent-orange)",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      borderRadius: {
        "3xl": "28px",
        "4xl": "32px",
      },
      boxShadow: {
        soft: "0 20px 50px -20px rgba(0, 0, 0, 0.15)",
        card: "0 12px 36px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
