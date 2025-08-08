import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ← Ajout pour activer le mode sombre via une classe
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
