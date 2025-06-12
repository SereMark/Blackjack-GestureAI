/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./main.jsx"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
    }
  },
  plugins: []
};