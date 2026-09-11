/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0B",
        surface: "#0C0C0E",
        primary: "#F5F1E8",
        accent: "#2596be",
        cyan: "#7DF9FF",
        error: "#FF4444",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
