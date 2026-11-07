import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { NotchState } from "../types";

// Patented Notch Dimensions
// Apple MacBook Notch Resting Dimensions: 215x40px
export const COMPACT_IDLE_WIDTH = 215;
export const COMPACT_MEDIA_WIDTH = 215;
export const COMPACT_HEIGHT = 40;

// Notification Banner Dimension - matched to 400x78px (same as Charging & Bluetooth)
export const NOTIFICATION_BANNER_WIDTH = 400;
export const NOTIFICATION_BANNER_HEIGHT = 78;

// Bluetooth Banner Dimension - matched to 400x78px (same as Charging Banner)
export const BLUETOOTH_BANNER_WIDTH = 400;
export const BLUETOOTH_BANNER_HEIGHT = 78;

// Charging Banner Dimension - 100% matched to Charging.dc.html (400x78px)
export const CHARGING_BANNER_WIDTH = 400;
export const CHARGING_BANNER_HEIGHT = 78;

// Expanded Dimensions: Compact and clean (460x225px) to prevent bottom pagination dots collision
export const EXPANDED_WIDTH = 460;
export const EXPANDED_HEIGHT = 225;

export const EXPANDED_LYRICS_WIDTH = 680;
export const EXPANDED_LYRICS_HEIGHT = 245;

// Panggilan: referensi CallStates.dc.html — "Ringkas" 220x46 dan "Standar" 380x74.
export const CALL_COMPACT_WIDTH = 220;
export const CALL_COMPACT_HEIGHT = 46;
export const CALL_EXPANDED_WIDTH = 380;
export const CALL_EXPANDED_HEIGHT = 74;

export const SYSTEM_MONITOR_WIDTH = 460;
export const SYSTEM_MONITOR_HEIGHT = 225;

export function useWindowResize(
  state: NotchState,
  isLyricsOpen: boolean = false,
  isMediaPlaying: boolean = false,
  isBluetoothBannerActive: boolean = false,
  isNotificationActive: boolean = false,
  isCallActive: boolean = false,
  isChargingBannerActive: boolean = false
) {
  useEffect(() => {
    let targetWidth: number;
    let targetHeight: number;

    if (state === "expanded") {
      if (isCallActive) {
        targetWidth = CALL_EXPANDED_WIDTH;
        targetHeight = CALL_EXPANDED_HEIGHT;
      } else if (isLyricsOpen) {
        targetWidth = EXPANDED_LYRICS_WIDTH;
        targetHeight = EXPANDED_LYRICS_HEIGHT;
      } else {
        targetWidth = EXPANDED_WIDTH;
        targetHeight = EXPANDED_HEIGHT;
      }
    } else {
      // Compact / Banner modes — panggilan didahulukan agar cocok dengan urutan render di App.
      if (isCallActive) {
        targetWidth = CALL_COMPACT_WIDTH;
        targetHeight = CALL_COMPACT_HEIGHT;
      } else if (isChargingBannerActive) {
        targetWidth = CHARGING_BANNER_WIDTH;
        targetHeight = CHARGING_BANNER_HEIGHT;
      } else if (isBluetoothBannerActive) {
        targetWidth = BLUETOOTH_BANNER_WIDTH;
        targetHeight = BLUETOOTH_BANNER_HEIGHT;
      } else if (isNotificationActive) {
        targetWidth = NOTIFICATION_BANNER_WIDTH;
        targetHeight = NOTIFICATION_BANNER_HEIGHT;
      } else if (isMediaPlaying) {
        targetWidth = COMPACT_MEDIA_WIDTH;
        targetHeight = COMPACT_HEIGHT;
      } else {
        targetWidth = COMPACT_IDLE_WIDTH;
        targetHeight = COMPACT_HEIGHT;
      }
    }

    // Ear padding: 32px for expanded (16px ear each side), 24px for compact (12px ear each side)
    const earPadding = state === "expanded" ? 32 : 24;

    invoke("set_notch_size", {
      width: targetWidth + earPadding,
      height: targetHeight,
    }).catch((err) => {
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
  ]);
}
