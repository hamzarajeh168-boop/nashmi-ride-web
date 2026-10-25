import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f7f4ef",
        terracotta: "#b75d43",
        ink: "#222a35",
        olive: "#60765a",
      },
      boxShadow: { card: "0 18px 55px rgba(35, 38, 42, .08)" },
    },
  },
  plugins: [],
};

export default config;
