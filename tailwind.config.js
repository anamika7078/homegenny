/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#080D1A",
        foreground: "#E8EDF8",
        secondary: {
          DEFAULT: "#0F172A",
          foreground: "#8D9AB5",
        },
        card: {
          DEFAULT: "#1C2740",
          foreground: "#E8EDF8",
        },
        primary: {
          DEFAULT: "#FF5A1F",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#FF7A45",
          foreground: "#FFFFFF",
        },
        success: "#00C9A7",
        warning: "#F0A500",
        danger: "#F43F5E",
        info: "#38BDF8",
        violet: "#8B5CF6",
        muted: {
          DEFAULT: "#0F172A",
          foreground: "#8D9AB5",
        },
        border: "rgba(232, 237, 248, 0.1)",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        figtree: ["var(--font-figtree)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

