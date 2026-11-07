import { useEffect } from "react";
import { setNotchSize } from "../services/windowService";
import type { NotchState } from "../../../shared/types";
import { getNotchDimensions } from "../lib/notchDimensions";

export function useWindowResize(
  state: NotchState,
  isLyricsOpen: boolean = false,
  isMediaPlaying: boolean = false,
  isBluetoothBannerActive: boolean = false,
  isNotificationActive: boolean = false,
  isCallActive: boolean = false,
  isChargingBannerActive: boolean = false,
  isPrayerBannerActive: boolean = false
) {
  useEffect(() => {
    const { width, height } = getNotchDimensions(
      state,
      isLyricsOpen,
      isMediaPlaying,
      isBluetoothBannerActive,
      isNotificationActive,
      isCallActive,
      isChargingBannerActive,
      isPrayerBannerActive
    );

    // Ear padding: 32px for expanded (16px ear each side), 24px for compact (12px ear each side)
    const earPadding = state === "expanded" ? 32 : 24;

    setNotchSize(width + earPadding, height).catch((err) => {
      console.error("Failed to resize notch window:", err);
    });
  }, [
    state,
    isLyricsOpen,
    isMediaPlaying,
    isBluetoothBannerActive,
    isNotificationActive,
    isCallActive,
    isChargingBannerActive,
    isPrayerBannerActive,
  ]);
}