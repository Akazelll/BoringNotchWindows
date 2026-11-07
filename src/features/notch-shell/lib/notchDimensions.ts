import type { NotchState } from "../../../shared/types";

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

// Prayer Banner Dimension - 400x78px, mengikuti bahasa visual banner lain.
// SENGAJA tidak memakai 520x130 dari PrayerReminder.dc.html: semua banner notch seragam
// 400x78 dan radius/ear/shadow notch sudah disetel untuk kotak itu, sementara artboard
// referensi memuat chrome preview.
export const PRAYER_BANNER_WIDTH = 400;
export const PRAYER_BANNER_HEIGHT = 78;

// Expanded Dimensions: 540x214. Lebih lebar dan sedikit lebih pendek dari sebelumnya
// (460x225) supaya halaman Prayer punya ruang untuk 5 label jam di bawah busur matahari;
// tinggi dikurangi sedikit agar kartu tidak terasa tinggi. Dipakai SEMUA halaman.
export const EXPANDED_WIDTH = 540;
export const EXPANDED_HEIGHT = 214;

export const EXPANDED_LYRICS_WIDTH = 680;
export const EXPANDED_LYRICS_HEIGHT = 245;

// Panggilan: referensi CallStates.dc.html — "Ringkas" 220x46 dan "Standar" 380x74.
export const CALL_COMPACT_WIDTH = 220;
export const CALL_COMPACT_HEIGHT = 46;
export const CALL_EXPANDED_WIDTH = 380;
export const CALL_EXPANDED_HEIGHT = 74;

export interface NotchDimensions {
  width: number;
  height: number;
  notchRadiusClass: string;
}

/**
 * Dimensi notch untuk state saat ini. Urutan prioritas ini adalah satu-satunya
 * sumber kebenaran: dipakai App untuk ukuran konten dan useWindowResize untuk resize window.
 * Nilai dan urutan cabang dipindahkan apa adanya dari App.tsx — jangan diubah.
 */
export function getNotchDimensions(
  state: NotchState,
  isLyricsOpen: boolean,
  isMediaPlaying: boolean,
  isBluetoothBannerActive: boolean,
  isNotificationActive: boolean,
  isCallActive: boolean,
  isChargingBannerActive: boolean,
  isPrayerBannerActive: boolean = false
): NotchDimensions {
  if (state === "expanded") {
    if (isCallActive) {
      return {
        width: CALL_EXPANDED_WIDTH,
        height: CALL_EXPANDED_HEIGHT,
        notchRadiusClass: "rounded-b-[36px]",
      };
    }
    if (isLyricsOpen) {
      return {
        width: EXPANDED_LYRICS_WIDTH,
        height: EXPANDED_LYRICS_HEIGHT,
        notchRadiusClass: "rounded-b-[18px]",
      };
    }
    return {
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
      notchRadiusClass: "rounded-b-[18px]",
    };
  }

  // Panggilan didahulukan, sama seperti urutan render di App.
  if (isCallActive) {
    return {
      width: CALL_COMPACT_WIDTH,
      height: CALL_COMPACT_HEIGHT,
      notchRadiusClass: "rounded-b-[24px]",
    };
  }
  // Prayer di atas banner ambient: peristiwa sekali sehari pada jam pasti, jendelanya sempit
  // (GRACE_MIN). Paling buruk toast chat tertunda 20 detik, sedangkan salat tidak bisa diulang.
  if (isPrayerBannerActive) {
    return {
      width: PRAYER_BANNER_WIDTH,
      height: PRAYER_BANNER_HEIGHT,
      notchRadiusClass: "rounded-b-[38px]",
    };
  }
  if (isChargingBannerActive) {
    return {
      width: CHARGING_BANNER_WIDTH,
      height: CHARGING_BANNER_HEIGHT,
      notchRadiusClass: "rounded-b-[38px]",
    };
  }
  if (isBluetoothBannerActive) {
    return {
      width: BLUETOOTH_BANNER_WIDTH,
      height: BLUETOOTH_BANNER_HEIGHT,
      notchRadiusClass: "rounded-b-[38px]",
    };
  }
  if (isNotificationActive) {
    return {
      width: NOTIFICATION_BANNER_WIDTH,
      height: NOTIFICATION_BANNER_HEIGHT,
      notchRadiusClass: "rounded-b-[18px]",
    };
  }
  if (isMediaPlaying) {
    return {
      width: COMPACT_MEDIA_WIDTH,
      height: COMPACT_HEIGHT,
      notchRadiusClass: "rounded-b-[14px]",
    };
  }
  return {
    width: COMPACT_IDLE_WIDTH,
    height: COMPACT_HEIGHT,
    notchRadiusClass: "rounded-b-[14px]",
  };
}