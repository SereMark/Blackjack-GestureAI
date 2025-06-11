/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.jsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      colors: {
        casino: {
          100: "#E4F1FE", 200: "#C3E0FC", 300: "#A2CFF9", 400: "#81BEF7",
          500: "#60AEF5", 600: "#3F9DF2", 700: "#1E8CF0", 800: "#0D7BDF", 900: "#065AAF"
        },
        felt: {
          dark: "#0A3D22",
          DEFAULT: "#0E5937",
          light: "#177A4D"
        },
        card: {
          bg: "#FFFFFF",
          border: "#E2E8F0",
        }
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'game-panel': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'button': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'button-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      keyframes: {
        fadeZoomIn: {
          "0%": { opacity: 0, transform: "scale(0.9) translateY(10px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" }
        },
        cardFlip: {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(0deg)" }
        },
        slideInUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
      },
      animation: {
        fadeZoomIn: "fadeZoomIn 0.5s ease-out forwards",
        cardFlip: "cardFlip 0.6s ease-out forwards",
        slideInUp: "slideInUp 0.5s ease-out forwards",
      },
      backgroundImage: {
        'felt-pattern': "linear-gradient(rgba(0,0,0,0.1) 0 0), url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23177A4D' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: []
};