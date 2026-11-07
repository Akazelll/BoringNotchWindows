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
  appType: "whatsapp" | "discord" | "chrome" | "telegram" | "spotify" | "system";
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
  state: "incoming" | "active" | "ended";
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
