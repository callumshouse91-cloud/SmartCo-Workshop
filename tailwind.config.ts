import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        smartco: {
          50: "#e6f0ff", 100: "#b8d4ff", 200: "#7ab1ff", 300: "#3d8eff",
          400: "#1a78ff", 500: "#0065fc", 600: "#0052cc", 700: "#0040a0",
          800: "#002e75", 900: "#001d4a",
        },
        mint: { 300: "#43e6a2", 400: "#2dcf8a", 500: "#1fb073" },
        coral: { 500: "#e65c43" },
        yellow: { brand: "#e6d343" },
        navy: "#0a1628",
        surface: "#f4f6fb",
        border: "#e0e4ec",
        body: "#4b5563",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
