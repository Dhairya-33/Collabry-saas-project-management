/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        /* ===============================
           BRAND / ACTION COLORS
           =============================== */
        brand: {
          primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-brand-secondary) / <alpha-value>)",
          accent: "rgb(var(--color-brand-accent) / <alpha-value>)",
        },

        /* ===============================
           BACKGROUNDS
           =============================== */
        background: {
          app: "rgb(var(--color-background-app) / <alpha-value>)",
          subtle: "rgb(var(--color-background-subtle) / <alpha-value>)",
        },

        /* ===============================
           SURFACES
           =============================== */
        surface: {
          base: "rgb(var(--color-surface-base) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
        },

        /* ===============================
           TEXT
           =============================== */
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },

        /* ===============================
           BORDERS & OUTLINES
           =============================== */
        border: {
          DEFAULT: "rgb(var(--color-border-default) / 0.06)",
          subtle: "rgb(var(--color-border-subtle) / 0.04)",
          focus: "rgb(var(--color-border-focus) / <alpha-value>)",
        },

        /* ===============================
           STATUS
           =============================== */
        status: {
          success: "rgb(var(--color-status-success) / <alpha-value>)",
          info: "rgb(var(--color-status-info) / <alpha-value>)",
          warning: "rgb(var(--color-status-warning) / <alpha-value>)",
          error: "rgb(var(--color-status-error) / <alpha-value>)",
        },
      },

      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },

      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.06)",
        card: "0 8px 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
