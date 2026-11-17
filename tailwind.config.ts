import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        quadra: { 950: "#0F1E3A", 900: "#14284B", 800: "#1C3866", 600: "#2F5496" },
        bola: { 500: "#F26A1B", 100: "#FDE6D6" },
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
