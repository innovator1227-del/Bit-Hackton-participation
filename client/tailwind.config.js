/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152b25",
        forest: "#174b3a",
        leaf: "#2c7b5a",
        mint: "#dff1e8",
        paper: "#f7f8f4",
        line: "#e5e9e4",
        muted: "#75817a",
        amber: "#c88422",
        coral: "#c65d4d",
      },
      boxShadow: { soft: "0 12px 36px rgba(26, 53, 42, .08)" },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
