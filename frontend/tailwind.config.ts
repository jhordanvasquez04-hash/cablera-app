import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Configurables por empresa desde Configuración (y sus derivados calculados en vivo, ver index.css).
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        secondary: "var(--color-secondary)",

        // Paleta fija del sistema de diseño.
        bg: "#f4f5f7",
        surface: "#ffffff",
        "surface-subtle": "#f7f8fa",
        border: "#e4e7ec",
        "border-field": "#cfd4da",
        divider: "#ebedf0",
        "row-hover": "#f8f9fb",

        ink: "#16191d",
        "ink-2": "#464d56",
        "ink-3": "#5d646d",
        "ink-weak": "#6d747e",

        "primary-tint": "var(--color-primary-tint)",
        "primary-tint-strong": "var(--color-primary-tint-strong)",

        dark: "#16191d",
        "dark-border": "#3a4149",
        "dark-weak": "#aeb5bd",

        success: "#1f5c45",
        "success-bg": "#e9efec",
        warning: "#7c5312",
        "warning-bg": "#f7f0e0",
        error: "#8f2c22",
        "error-bg": "#f6eae8",
        "error-border": "#e3c9c6",
        "error-hover": "#75231b",
        "neutral-chip": "#464d56",
        "neutral-chip-bg": "#ebedf0",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.05)",
        header: "0 1px 0 rgba(16,24,40,.05)",
        modal: "0 20px 50px rgba(16,24,40,.25)",
        login: "0 24px 60px rgba(16,24,40,.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
