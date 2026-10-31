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

export interface SystemStats {
  cpuPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  ramPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
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
}

export type NotchState = "compact" | "expanded";
export type NotchViewMode = "player" | "lyrics";
