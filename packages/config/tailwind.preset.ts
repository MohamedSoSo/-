import type { Config } from "tailwindcss";

// Shared design tokens across all 4 apps. Each app's theme_tokens row
// (see supabase/migrations/0005_developer_portal.sql) can override the CSS
// custom properties at runtime via the Developer Portal — these are the
// static Tailwind-level defaults / fallbacks.
export const bbqPreset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#fef3ea",
          100: "#fde0c4",
          200: "#fbc088",
          300: "#f79b4c",
          400: "#f17d2b",
          500: "#e8792f", // primary accent — charcoal-fire orange
          600: "#c65f1e",
          700: "#9c4818",
          800: "#733417",
          900: "#4a2110",
        },
        charcoal: {
          50: "#f5f4f3",
          100: "#e2dfdc",
          200: "#c2bcb5",
          300: "#948b81",
          400: "#665c53",
          500: "#453d36",
          600: "#332c27",
          700: "#241f1b",
          800: "#1e140d", // surface
          900: "#120c08", // base background
        },
        smoke: {
          400: "#8a8580",
          500: "#6b665f",
        },
      },
      backgroundImage: {
        "glass-sheen": "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))",
      },
      boxShadow: {
        ember: "0 0 24px 0 rgba(232, 121, 47, 0.35)",
      },
      backdropBlur: {
        glass: "16px",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
};
