import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--paper)",
          2: "var(--paper-2)",
          3: "var(--paper-3)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          mute: "var(--ink-mute)",
          fade: "var(--ink-fade)",
        },
        surface: "var(--surface)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        warning: "var(--warning)",
      },
      fontFamily: {
        serif: "var(--font-serif)",
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        DEFAULT: "2px",
      },
      letterSpacing: {
        label: "0.2em",
        "label-tight": "0.18em",
      },
      maxWidth: {
        read: "640px",
        case: "720px",
      },
      keyframes: {
        "femi-fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "femi-fade-in": "femi-fade-in 0.3s ease",
      },
    },
  },
  plugins: [],
};

export default config;
