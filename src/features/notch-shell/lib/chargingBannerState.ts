import type { BatteryInfo, ChargingBannerMode } from "../../../shared/types";

export interface ChargingBannerState {
  initialized: boolean;
  wasCharging: boolean | null;
  mode: ChargingBannerMode | null;
}

export const INITIAL_CHARGING_BANNER_STATE: ChargingBannerState = {
  initialized: false,
  wasCharging: null,
  mode: null,
};

/** Resolve startup battery state and real charging transitions. */
export function transitionChargingBanner(
  state: ChargingBannerState,
  battery: BatteryInfo,
  isReady: boolean
): ChargingBannerState {
  if (!isReady) return state;

  if (!state.initialized) {
    return {
      initialized: true,
      wasCharging: battery.isCharging,
      mode: battery.isCharging ? "connected" : null,
    };
  }

  if (state.wasCharging === battery.isCharging) return state;
  return {
    initialized: true,
    wasCharging: battery.isCharging,
    mode: battery.isCharging ? "connected" : "disconnected",
  };
}
