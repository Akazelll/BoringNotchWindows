import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { BatteryInfo } from "../../../shared/types";

export const getBatteryState = () => invoke<BatteryInfo>("get_battery_state");

export function onBatteryStateChanged(handler: (state: BatteryInfo) => void) {
  return listen<BatteryInfo>("battery-state-changed", (event) => {
    if (event.payload && typeof event.payload.level === "number") handler(event.payload);
  });
}
