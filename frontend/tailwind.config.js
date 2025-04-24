export default {
  content: [
    "index.html",
    "src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      colors: {
        casino: {
          100: "#E4F1FE",
          200: "#C3E0FC",
          300: "#A2CFF9",
          400: "#81BEF7",
          500: "#60AEF5",
          600: "#3F9DF2",
          700: "#1E8CF0",
          800: "#0D7BDF",
          900: "#065AAF"
        },
        felt: {
          dark: "#0E4429",
          DEFAULT: "#0E5937",
          light: "#177A4D"
        },
        card: {
          bg: "#FFFFFF",
          border: "#E2E8F0",
          shadow: "rgba(0, 0, 0, 0.1)"
        }
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 2px 1px rgba(255, 255, 255, 0.5)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 0 2px 1px rgba(255, 255, 255, 0.8)',
        'game-panel': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'button': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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
        },
        cardFlip: {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(0deg)" }
        },
        pulse: {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.8, transform: "scale(1.05)" }
        }
      },
      animation: {
        swirlWithColor: "swirlWithColor 12s ease-in-out infinite",
        swirlWithColor2: "swirlWithColor2 12s ease-in-out infinite",
        fadeZoomIn: "fadeZoomIn 0.9s ease-out forwards",
        fadeSlideUp: "fadeSlideUp 0.9s ease-out forwards",
        cardFlip: "cardFlip 0.6s ease-out forwards",
        pulse: "pulse 2s ease-in-out infinite"
      },
      backgroundImage: {
        'felt-pattern': "linear-gradient(to right, rgba(23, 122, 77, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(23, 122, 77, 0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};