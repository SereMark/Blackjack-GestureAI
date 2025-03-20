export default {
  content: [
    "index.html",
    "src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"]
      },
      keyframes: {
        swirlWithColor: {
          "0%": { transform: "rotate(0deg) scale(0.8)", backgroundColor: "#9333EA" },
          "25%": { transform: "rotate(90deg) scale(1.0)", backgroundColor: "#A21CAF" },
          "50%": { transform: "rotate(180deg) scale(1.2)", backgroundColor: "#C026D3" },
          "75%": { transform: "rotate(270deg) scale(1.0)", backgroundColor: "#DB2777" },
          "100%": { transform: "rotate(360deg) scale(0.8)", backgroundColor: "#9333EA" }
        },
        swirlWithColor2: {
          "0%": { transform: "rotate(0deg) scale(0.8)", backgroundColor: "#7C3AED" },
          "25%": { transform: "rotate(90deg) scale(1.1)", backgroundColor: "#6D28D9" },
          "50%": { transform: "rotate(180deg) scale(1.3)", backgroundColor: "#8B5CF6" },
          "75%": { transform: "rotate(270deg) scale(1.1)", backgroundColor: "#C084FC" },
          "100%": { transform: "rotate(360deg) scale(0.8)", backgroundColor: "#7C3AED" }
        },
        fadeZoomIn: {
          "0%": { opacity: 0, transform: "scale(0.8) translateY(20px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" }
        },
        fadeSlideUp: {
          "0%": { opacity: 0, transform: "translateY(30px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      },
      animation: {
        swirlWithColor: "swirlWithColor 12s ease-in-out infinite",
        swirlWithColor2: "swirlWithColor2 12s ease-in-out infinite",
        fadeZoomIn: "fadeZoomIn 0.9s ease-out forwards",
        fadeSlideUp: "fadeSlideUp 0.9s ease-out forwards"
      }
    }
  },
  plugins: []
};