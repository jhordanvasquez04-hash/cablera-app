import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Configurables por empresa desde Configuración (y sus derivados calculados en vivo, ver
        // index.css) — el mecanismo se mantiene tal cual: el default ahora es el azul marino de
        // Keysls, pero cada empresa sigue pudiendo elegir el suyo. Ver la nota en index.css.
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        secondary: "var(--color-secondary)",

        // Paleta de Keysls, adoptada como sistema de diseño de cablera (fusión).
        bg: "#F0F4F8",
        surface: "#ffffff",
        "surface-subtle": "#E4ECF4",
        border: "#C5D8EA",
        "border-field": "#A8C4DC",
        divider: "#D6E4F0",
        "row-hover": "#E4ECF4",

        ink: "#0D1B2A",
        "ink-2": "#2C4A6E",
        "ink-3": "#5A7A9A",
        "ink-weak": "#8AAABB",

        "primary-tint": "var(--color-primary-tint)",
        "primary-tint-strong": "var(--color-primary-tint-strong)",

        dark: "#0D1B2A",
        "dark-border": "#2C4A6E",
        "dark-weak": "#8AAABB",

        success: "#16A34A",
        "success-bg": "rgba(22,163,74,.08)",
        warning: "#D97706",
        "warning-bg": "rgba(217,119,6,.08)",
        error: "#DC2626",
        "error-bg": "rgba(220,38,38,.08)",
        "error-border": "#e3c9c6",
        "error-hover": "#b91c1c",
        "neutral-chip": "#2C4A6E",
        "neutral-chip-bg": "#E4ECF4",
      },
      fontFamily: {
        // Sin serif a propósito: Keysls no usa una — todo Inter, como el resto de su sistema.
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,27,42,.06)",
        header: "0 1px 0 rgba(13,27,42,.06)",
        modal: "0 20px 50px rgba(13,27,42,.25)",
        login: "0 24px 60px rgba(13,27,42,.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
