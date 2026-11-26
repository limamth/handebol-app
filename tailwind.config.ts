import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        quadra: { 950: "#09223E", 900: "#0F355E", 800: "#17477A", 600: "#2563A8" },
        bola: { 500: "#C47F1B", 100: "#FDF3E3" },
        linha: "#DDE2EA",
        fundo: "#F2F4F7",
        tinta: "#18202E",
        suave: "#5B6577",
      },
      fontFamily: {
        corpo: ["var(--font-corpo)", "system-ui", "sans-serif"],
        titulo: ["var(--font-titulo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
