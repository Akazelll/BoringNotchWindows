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
        "call-wv-1": "callWv1 1s ease-in-out infinite",
        "call-wv-2": "callWv2 0.8s ease-in-out infinite",
        "call-wv-3": "callWv3 1.15s ease-in-out infinite",
        "robot-blink": "robotBlink 5s ease-in-out infinite",
        "float-z-1": "floatZ 2.6s ease-in-out infinite",
        "float-z-2": "floatZ 2.6s ease-in-out 0.9s infinite",
      },
      keyframes: {
        soundBar: {
          "0%": { height: "4px" },
          "100%": { height: "16px" },
        },
        callWv1: {
          "0%, 100%": { height: "5px" },
          "50%": { height: "16px" },
        },
        callWv2: {
          "0%, 100%": { height: "12px" },
          "50%": { height: "5px" },
        },
        callWv3: {
          "0%, 100%": { height: "7px" },
          "50%": { height: "19px" },
        },
        robotBlink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.08)" },
        },
        floatZ: {
          "0%": { opacity: "0", transform: "translate(0, 4px)" },
          "30%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translate(6px, -8px)" },
        },
      }
    },
  },
  plugins: [],
}
