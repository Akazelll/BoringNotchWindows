import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";

const STORAGE_KEY = "boring_notch_opacity";

export function useOpacity() {
  const [opacity, setOpacityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.25 && val <= 1.0) {
          return val;
        }
      }
    } catch {
      // Ignore
    }
    return 1.0; // Default 100% solid
  });

  const applyOpacityToDom = (val: number) => {
    const root = document.documentElement;
    root.style.setProperty("--notch-opacity", val.toFixed(2));
    if (val < 0.99) {
      // Apply frosted glass blur when transparent
      const blurAmount = Math.round(24 * (1 - val) + 12);
      root.style.setProperty("--notch-blur", `${blurAmount}px`);
    } else {
      root.style.setProperty("--notch-blur", "0px");
    }
  };

  useEffect(() => {
    applyOpacityToDom(opacity);
  }, [opacity]);

  // Listen to set-opacity events from System Tray
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<number>("set-opacity", (event) => {
      if (typeof event.payload === "number") {
        setOpacity(event.payload);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const setOpacity = useCallback((val: number) => {
    const clamped = Math.min(1.0, Math.max(0.25, val));
    setOpacityState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toFixed(2));
    } catch {
      // Ignore
    }
    applyOpacityToDom(clamped);
  }, []);

  return { opacity, setOpacity };
}
