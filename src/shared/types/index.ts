export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  thumbnail: string | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  sourceApp?: string;
}

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
}

export interface AppNotification {
  id: number;
  appName: string;
  /**
   * Jenis aplikasi dari backend. `""` berarti aplikasi tidak dikenali: notifikasi itu tetap
   * ditampilkan, jadi jangan pernah menolaknya hanya karena jenisnya kosong.
   */
  appType: "whatsapp" | "discord" | "chrome" | "telegram" | "spotify" | "teams" | "phone" | "";
  title?: string;
  message?: string;
  isCall?: boolean;
}

export interface LyricLine {
  timeSec: number;
  text: string;
}

export interface CallInfo {
  callerName: string;
  callerNumber?: string;
  avatar?: string;
  appSource: "whatsapp" | "discord" | "telegram" | "teams" | "phone";
  // incoming = berdering, outgoing = kita menelepon (belum diangkat), active = tersambung.
  state: "incoming" | "outgoing" | "active" | "ended";
  durationSec: number;
  isMuted: boolean;
  notifId?: number;
  errorText?: string;
}

export type RobotMood = "normal" | "sleepy" | "sad";

export interface CursorState {
  tx: number;
  ty: number;
  sc: number;
  isIdle: boolean;
}

export interface BluetoothDeviceEvent {
  name: string;
  batteryPercent: number;
  connected: boolean;
  deviceType: "headphones" | "speaker" | "mouse" | "keyboard" | "gamepad" | "phone" | "other";
}

export interface TodoItem {
  id: string;
  title: string;
  timeSchedule?: string;
  completed: boolean;
  createdAt: number;
}

export type NotchState = "compact" | "expanded";
export type NotchViewMode = "player" | "lyrics";
export type ChargingBannerMode = "connected" | "disconnected";
