import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1117",
        panel: "#1e2330",
        panel2: "#1e293b",
        border: "#334155",
        muted: "#64748b",
        text: "#e2e8f0",
        accent: "#3b82f6",
        success: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
        violet: "#a855f7",
        cyan: "#06b6d4",
      },
    },
  },
  plugins: [],
};
export default config;
