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
        // Clinical palette (student + teacher). Uses HSL component
        // variables so opacity modifiers compose: bg-clinical-primary/10.
        "clinical-bg": "hsl(var(--c-bg))",
        "clinical-fg": "hsl(var(--c-fg))",
        "clinical-card": "hsl(var(--c-card))",
        "clinical-primary": {
          DEFAULT: "hsl(var(--c-primary))",
          fg: "hsl(var(--c-primary-fg))",
          soft: "hsl(var(--c-primary-soft))",
          glow: "hsl(var(--c-primary-glow))",
        },
        "clinical-secondary": "hsl(var(--c-secondary))",
        "clinical-muted": {
          DEFAULT: "hsl(var(--c-muted))",
          fg: "hsl(var(--c-muted-fg))",
        },
        "clinical-accent": {
          DEFAULT: "hsl(var(--c-accent))",
          fg: "hsl(var(--c-accent-fg))",
        },
        "clinical-success": "hsl(var(--c-success))",
        "clinical-destructive": "hsl(var(--c-destructive))",
        "clinical-border": "hsl(var(--c-border))",
        "clinical-warn": {
          bg: "hsl(var(--c-warn-bg))",
          border: "hsl(var(--c-warn-border))",
          fg: "hsl(var(--c-warn-fg))",
        },
      },
      fontFamily: {
        serif: "var(--font-serif)",
        sans: "var(--font-sans)",
        "sans-clinical": "var(--font-sans-clinical)",
        mono: "var(--font-mono)",
      },
      backgroundImage: {
        "clinical-hero": "var(--c-gradient-hero)",
        "clinical-primary": "var(--c-gradient-primary)",
      },
      boxShadow: {
        "clinical-card": "var(--c-shadow-card)",
        "clinical-elegant": "var(--c-shadow-elegant)",
      },
      borderRadius: {
        DEFAULT: "2px",
        clinical: "var(--c-radius)",
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
