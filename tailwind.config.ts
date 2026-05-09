import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ecfdf3",
          100: "#d1fae1",
          600: "#166534",
          700: "#14532d",
          800: "#064e3b"
        },
        brand: {
          50: "#eefdf7",
          100: "#d8f8ea",
          200: "#aaf0cf",
          500: "#179c6b",
          600: "#0f7d56",
          700: "#0b6044",
          800: "#074732"
        },
        success: {
          50: "#ecfdf3",
          100: "#dcfce7",
          600: "#16a34a",
          700: "#15803d"
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          600: "#d97706",
          700: "#b45309"
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          600: "#dc2626",
          700: "#b91c1c"
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#2563eb",
          700: "#1d4ed8"
        },
        fuel: {
          500: "#f26a21",
          600: "#d94e13"
        },
        ink: {
          900: "#10233f"
        },
        surface: {
          page: "#f8fbf9",
          panel: "#ffffff",
          muted: "#f1f5f9"
        }
      },
      borderRadius: {
        brand: "0.875rem",
        control: "0.625rem"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 35, 63, 0.07)",
        soft: "0 18px 45px rgba(16, 35, 63, 0.10)",
        brand: "0 20px 50px rgba(15, 125, 86, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
