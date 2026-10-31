import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BatteryInfo } from "../types";

export function useBattery() {
  const [battery, setBattery] = useState<BatteryInfo>({
    level: 100,
    isCharging: false,
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    // Fetch initial battery from Windows Power API
    invoke<BatteryInfo>("get_battery_state")
      .then((state) => {
        if (state && typeof state.level === "number") {
          setBattery(state);
        }
      })
      .catch((err) => {
        console.error("Failed to get battery state:", err);
      });

    // Listen for real-time battery status changes
    listen<BatteryInfo>("battery-state-changed", (event) => {
      if (event.payload && typeof event.payload.level === "number") {
        setBattery(event.payload);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.error("Failed to listen to battery-state-changed:", err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return battery;
}
