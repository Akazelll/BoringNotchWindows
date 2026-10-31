/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notch: {
          bg: "rgba(10, 10, 10, 0.88)",
          border: "rgba(255, 255, 255, 0.12)",
          accent: "#22c55e",
        }
      },
      animation: {
        "sound-bar-1": "soundBar 0.8s ease-in-out infinite alternate",
        "sound-bar-2": "soundBar 1.1s ease-in-out infinite alternate 0.2s",
        "sound-bar-3": "soundBar 0.9s ease-in-out infinite alternate 0.4s",
        "sound-bar-4": "soundBar 1.2s ease-in-out infinite alternate 0.1s",
      },
      keyframes: {
        soundBar: {
          "0%": { height: "4px" },
          "100%": { height: "16px" },
        }
      }
    },
  },
  plugins: [],
}
