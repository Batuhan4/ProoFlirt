import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          pink: "#ff2d78",
          purple: "#7f4bff"
        },
        neutral: {
          900: "#0f1125",
          800: "#151731",
          100: "#e4e6ff",
          400: "#9ca3c7"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(120% 120% at 50% 0%, rgba(127, 75, 255, 0.35) 0%, rgba(15, 17, 37, 0.9) 45%, #0b0d1c 100%)"
      }
    }
  },
  plugins: []
};

export default config;
