import { invoke } from "@tauri-apps/api/core";

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

/**
 * Koordinat dari Windows Location Provider (WiFi/GPS), bukan dari IP.
 * Melempar kalau bukan di Tauri, izin lokasi ditolak, tidak ada provider, atau timeout.
 */
export const getDeviceLocation = () => invoke<DeviceLocation>("get_device_location");
