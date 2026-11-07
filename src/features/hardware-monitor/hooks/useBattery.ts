import { useState, useEffect } from "react";
import { BatteryInfo } from "../../../shared/types";
import { getBatteryState, onBatteryStateChanged } from "../services/systemMonitorService";

export function useBattery() {
  const [battery, setBattery] = useState<BatteryInfo>({
    level: 100,
    isCharging: false,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    // Fetch initial battery from Windows Power API
    getBatteryState()
      .then((state) => {
        if (state && typeof state.level === "number") {
          setBattery(state);
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.error("Failed to get battery state:", err);
      });

    // Listen for real-time battery status changes
    onBatteryStateChanged((state) => {
      setBattery(state);
      setIsReady(true);
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

  return { battery, isReady };
}
