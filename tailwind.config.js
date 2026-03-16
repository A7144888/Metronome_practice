/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#ec1313",
        "background-light": "#f8f6f6",
        "background-dark": "#221010",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      boxShadow: {
        glow: "0 0 40px rgba(236, 19, 19, 0.4)",
        "glow-sm": "0 0 15px rgba(236, 19, 19, 0.6)",
      },
      animation: {
        "pulse-fast": "pulse 0.3s ease-in-out",
        "beat-flash": "beatFlash 0.15s ease-out",
      },
      keyframes: {
        beatFlash: {
          "0%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "0.7", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
}
