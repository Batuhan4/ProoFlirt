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
          coral: "#ff4458",
          flame: "#ff6a4a"
        },
        neutral: {
          900: "#16040f",
          800: "#1f0a1c",
          100: "#fff3f5",
          400: "#f1c1c9"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-inter)", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(130% 150% at 45% -30%, rgba(255, 118, 90, 0.35) 0%, rgba(19, 4, 14, 0.9) 46%), linear-gradient(185deg, #16040f 0%, #1f0a1c 52%, #2a1024 100%)"
      }
    }
  },
  plugins: []
};

export default config;
