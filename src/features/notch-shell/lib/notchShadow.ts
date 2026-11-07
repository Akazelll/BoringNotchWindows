import type {
  AppNotification,
  CallInfo,
  ChargingBannerMode,
  RobotMood,
} from "../../../shared/types";

interface NotchShadowParams {
  isCallActive: boolean;
  call: CallInfo | null;
  isExpanded: boolean;
  chargingBannerMode: ChargingBannerMode | null;
  isBluetoothBannerActive: boolean;
  isNotificationActive: boolean;
  isPrayerBannerActive: boolean;
  currentToast: AppNotification | null;
  robotMood: RobotMood;
}

/**
 * Outer glow of the notch surface. Strings dipindahkan apa adanya dari App.tsx.
 * Panggilan diperiksa lebih dulu: rantai ini posisional, cabang di bawahnya tidak akan pernah terjangkau.
 */
export function getNotchShadow({
  isCallActive,
  call,
  isExpanded,
  chargingBannerMode,
  isBluetoothBannerActive,
  isNotificationActive,
  isPrayerBannerActive,
  currentToast,
  robotMood,
}: NotchShadowParams): string | undefined {
  if (isCallActive && call) {
    if (isExpanded) {
      return call.isMuted
        ? "0 16px 36px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.05)"
        : "0 16px 36px rgba(0,0,0,0.5), 0 0 50px rgba(48,209,88,0.1)";
    }
    return call.isMuted
      ? "0 14px 30px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.05)"
      : "0 14px 30px rgba(0,0,0,0.5), 0 0 40px rgba(48,209,88,0.1)";
  }

  // Warna glow disalin dari box-shadow PrayerReminder.dc.html.
  if (isPrayerBannerActive) {
    return "0 18px 40px rgba(0,0,0,0.5), 0 0 60px rgba(120,130,255,0.14)";
  }

  if (chargingBannerMode === "connected") {
    return "0 18px 40px rgba(0,0,0,0.5), 0 0 60px rgba(48,209,88,0.12)";
  }
  if (chargingBannerMode === "disconnected") {
    return "0 18px 40px rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.05)";
  }
  if (isBluetoothBannerActive) {
    return "0 18px 40px rgba(0,0,0,0.5), 0 0 60px rgba(90,162,255,0.12)";
  }
  if (isNotificationActive && currentToast) {
    switch (currentToast.appType) {
      case "whatsapp":
        return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(74,222,128,0.12)";
      case "telegram":
        return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(42,171,238,0.12)";
      case "discord":
        return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(88,101,242,0.12)";
      case "spotify":
        return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(30,215,96,0.12)";
      default:
        return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.06)";
    }
  }
  if (!isExpanded && robotMood === "sad") {
    return "0 18px 40px rgba(0,0,0,0.5), 0 0 50px rgba(255,159,46,0.12)";
  }
  return undefined;
}

/** Radius fillet kuping atas: 16 expanded/banner, 12 compact biasa. */
export function getEarRadius(
  isExpanded: boolean,
  isChargingBannerActive: boolean,
  isBluetoothBannerActive: boolean,
  isNotificationActive: boolean,
  isPrayerBannerActive: boolean = false
): number {
  if (isExpanded) return 16;
  if (isChargingBannerActive || isBluetoothBannerActive || isNotificationActive || isPrayerBannerActive) return 16;
  return 12;
}