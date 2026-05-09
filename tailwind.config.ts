import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf7",
          100: "#d8f8ea",
          500: "#179c6b",
          600: "#0f7d56",
          700: "#0b6044"
        },
        fuel: {
          500: "#f26a21",
          600: "#d94e13"
        },
        ink: {
          900: "#10233f"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 35, 63, 0.07)",
        soft: "0 18px 45px rgba(16, 35, 63, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
