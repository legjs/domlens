import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./popup.html"
  ],
  theme: {
    extend: {
      colors: {
        inspector: {
          primary: "#00ffff",
          warning: "#f39c12",
          error: "#e74c3c",
          info: "#3498db",
          bg: "#1a1a2e",
          surface: "#16213e",
          border: "#0f3460"
        }
      }
    },
  },
  plugins: [],
};

export default config;
