/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#020410",
          800: "#070b1e",
          700: "#0b0f24",
          600: "#11162f",
          500: "#1a2040",
          400: "#20264a",
        },
        mist: {
          100: "#e7e9f3",
          300: "#b9bdd4",
          400: "#8b8fa7",
        },
        gilt: "#e9c46a",
        ember: "#ff7a3d",
        aqua: "#36d6c5",
        orchid: "#79b7ff",
        yuzu: "#f7d774",
        leaf: "#88d66c",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["Open Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        aurora: {
          "0%,100%": { transform: "translate3d(0,0,0) rotate(0deg)", opacity: "0.18" },
          "33%": { transform: "translate3d(6%,-4%,0) rotate(8deg)", opacity: "0.26" },
          "66%": { transform: "translate3d(-5%,4%,0) rotate(-6deg)", opacity: "0.2" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        aurora: "aurora 14s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        breathe: "breathe 4.5s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
