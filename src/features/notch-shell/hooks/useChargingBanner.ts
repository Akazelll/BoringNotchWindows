import { useState, useEffect, useRef } from "react";
import type { BatteryInfo, ChargingBannerMode } from "../../../shared/types";
import {
  INITIAL_CHARGING_BANNER_STATE,
  transitionChargingBanner,
} from "../lib/chargingBannerState";

/**
 * Trigger the banner on startup when Windows reports charging, then on actual transitions.
 * Timings remain 4500ms connected / 4000ms disconnected.
 */
export function useChargingBanner(battery: BatteryInfo, isReady: boolean) {
  const [chargingBannerMode, setChargingBannerMode] = useState<ChargingBannerMode | null>(null);
  const chargingStateRef = useRef(INITIAL_CHARGING_BANNER_STATE);
  const chargingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const next = transitionChargingBanner(chargingStateRef.current, battery, isReady);
    const modeChanged = next.mode !== chargingStateRef.current.mode;
    chargingStateRef.current = next;
    if (!modeChanged || !next.mode) return;

    if (chargingTimerRef.current) clearTimeout(chargingTimerRef.current);
    setChargingBannerMode(next.mode);
    chargingTimerRef.current = window.setTimeout(() => {
      setChargingBannerMode(null);
      chargingTimerRef.current = null;
    }, next.mode === "connected" ? 4500 : 4000);
  }, [battery.isCharging, isReady]);

  const dismissCharging = () => {
    if (chargingTimerRef.current) {
      clearTimeout(chargingTimerRef.current);
      chargingTimerRef.current = null;
    }
    setChargingBannerMode(null);
  };

  return {
    chargingBannerMode,
    dismissCharging,
    isChargingBannerActive: chargingBannerMode !== null,
  };
}
