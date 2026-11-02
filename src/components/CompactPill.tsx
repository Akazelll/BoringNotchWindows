import React, { useState, useEffect } from "react";
import { MediaInfo, BatteryInfo, AppNotification, SystemStats, BluetoothDeviceEvent } from "../types";
import { AppSourceBadge } from "./AppSourceBadge";
import { PomodoroController } from "../hooks/usePomodoro";
import {
  Timer,
  Send,
  Gamepad2,
  Globe,
  Music,
  Bell,
  Bluetooth,
  Headphones,
  Speaker,
  Mouse,
  Keyboard,
  Smartphone,
} from "lucide-react";

interface CompactPillProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  stats: SystemStats;
  currentToast: AppNotification | null;
  onDismissToast?: () => void;
  bluetoothEvent?: BluetoothDeviceEvent | null;
  onDismissBluetooth?: () => void;
  pomodoro?: PomodoroController;
}

// Compact Squircle App Icons matching 48px Compact Pill
function NotificationAppSquircle({ appType }: { appType: string }) {
  switch (appType) {
    case "whatsapp":
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #4ADE80 0%, #1FAA59 60%, #0E6B36 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
          role="img"
          aria-label="WhatsApp"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
            <path d="M9 9.5c.3 2.5 2.5 4.7 5 5l1.2-1.4-1.9-1-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-1-1.9z" fill="#ffffff" stroke="none" />
          </svg>
        </div>
      );
    case "telegram":
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #2AABEE 0%, #229ED9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
        >
          <Send className="w-3.5 h-3.5 text-white -translate-x-[0.5px] translate-y-[0.5px]" />
        </div>
      );
    case "discord":
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #5865F2 0%, #4752C4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
        >
          <Gamepad2 className="w-3.5 h-3.5 text-white" />
        </div>
      );
    case "chrome":
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
          }}
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
        </div>
      );
    case "spotify":
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #1ed760 0%, #159e44 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
          }}
        >
          <Music className="w-3.5 h-3.5 text-black" />
        </div>
      );
    default:
      return (
        <div
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "8px",
            background: "linear-gradient(145deg, #272a34 0%, #181a20 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell className="w-3.5 h-3.5 text-[#5AA2FF]" />
        </div>
      );
  }
}

function BluetoothTypeIcon({ deviceType }: { deviceType: string }) {
  switch (deviceType) {
    case "headphones":
      return <Headphones className="w-3.5 h-3.5 text-zinc-400" />;
    case "speaker":
      return <Speaker className="w-3.5 h-3.5 text-zinc-400" />;
    case "mouse":
      return <Mouse className="w-3.5 h-3.5 text-zinc-400" />;
    case "keyboard":
      return <Keyboard className="w-3.5 h-3.5 text-zinc-400" />;
    case "gamepad":
      return <Gamepad2 className="w-3.5 h-3.5 text-zinc-400" />;
    case "phone":
      return <Smartphone className="w-3.5 h-3.5 text-zinc-400" />;
    default:
      return <Bluetooth className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

export const CompactPill: React.FC<CompactPillProps> = ({
  media,
  battery,
  stats: _stats,
  currentToast,
  onDismissToast,
  bluetoothEvent,
  onDismissBluetooth,
  pomodoro,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}.${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Render Compact Content directly: Notifikasi dan Bluetooth mengubah data di pill, bukan menimpa
  const renderCompactContent = () => {
    // ─── 1. PRIORITY 1: NOTIFIKASI TOAST AKTIF (Mengubah isi Compact Pill) ───
    if (currentToast) {
      return (
        <div
          onClick={onDismissToast}
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 14px 0 14px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
          }}
          className="select-none animate-in fade-in zoom-in-95 duration-200"
          title="Klik untuk menutup notifikasi"
        >
          {/* Sisi Kiri: Squircle App 28x28px */}
          <NotificationAppSquircle appType={currentToast.appType} />

          {/* Sisi Tengah: Judul & Pesan Ringkas */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {currentToast.title || currentToast.appName}
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#b4b4bc",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {currentToast.message || "Pesan baru"}
            </div>
          </div>

          {/* Sisi Kanan: Waktu 'Skrg' */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#8a8a93",
              flexShrink: 0,
              paddingRight: "2px",
            }}
          >
            Skrg
          </div>
        </div>
      );
    }

    // ─── 2. PRIORITY 2: BLUETOOTH CONNECTED ALERT (Mengubah isi Compact Pill) ───
    if (bluetoothEvent) {
      const btPercent = Math.min(100, Math.max(0, bluetoothEvent.batteryPercent || 80));
      return (
        <div
          onClick={onDismissBluetooth}
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 14px 0 14px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
          }}
          className="select-none animate-in fade-in zoom-in-95 duration-200"
          title="Klik untuk menutup alert Bluetooth"
        >
          {/* Sisi Kiri: Badge Ikon Bluetooth Bulat 28x28px */}
          <div
            style={{
              width: "28px",
              height: "28px",
              flexShrink: 0,
              borderRadius: "50%",
              background: "rgba(90, 162, 255, 0.15)",
              border: "1px solid rgba(90, 162, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bluetooth className="w-4 h-4 text-[#5AA2FF]" />
          </div>

          {/* Sisi Tengah: Nama Perangkat + Status Terhubung & Baterai */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {bluetoothEvent.name || "Perangkat Bluetooth"}
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#5AA2FF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              Terhubung · {btPercent}%
            </div>
          </div>

          {/* Sisi Kanan: Ikon Tipe Perangkat */}
          <div
            style={{
              width: "24px",
              height: "24px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BluetoothTypeIcon deviceType={bluetoothEvent.deviceType} />
          </div>
        </div>
      );
    }

    // ─── 3. PRIORITY 3: MEDIA PLAYING / TRACK PRESENT ───
    if (media && (media.isPlaying || !!media.title)) {
      const batteryRadius = 9;
      const batteryCircumference = 2 * Math.PI * batteryRadius;
      const batteryDash = ((battery.level / 100) * batteryCircumference).toFixed(1);

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 11px 0 18px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
          className="select-none animate-in fade-in duration-200"
        >
          {/* Sisi Kiri: Baterai Donat Melingkar 22x22px */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" role="img" aria-label={`Baterai ${battery.level}%`}>
              <circle cx="12" cy="12" r={batteryRadius} stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
              <circle
                cx="12"
                cy="12"
                r={batteryRadius}
                stroke="#5AA2FF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${batteryDash} ${batteryCircumference.toFixed(1)}`}
                transform="rotate(-90 12 12)"
              />
            </svg>
          </div>

          {/* Sisi Tengah: Jam Digital 15px font-semibold */}
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {timeStr}
          </div>

          {/* Sisi Kanan: Soundwave + Squircle App (Playing) ATAU Pause Icon + App (Paused) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
            {media.isPlaying ? (
              <div style={{ display: "flex", alignItems: "center", gap: "2.5px", height: "16px" }} aria-hidden="true">
                <div style={{ width: "3px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-1" />
                <div style={{ width: "3px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-2" />
                <div style={{ width: "3px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-3" />
              </div>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#a1a1aa" aria-label="Dijeda" role="img">
                <rect x="6" y="5" width="4" height="14" rx="1.2" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" />
              </svg>
            )}

            <div style={{ width: "30px", height: "30px", flexShrink: 0, opacity: media.isPlaying ? 1 : 0.55 }}>
              {media.thumbnail ? (
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "9px",
                    overflow: "hidden",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                  }}
                >
                  <img src={media.thumbnail} alt="cover" className="w-full h-full object-cover" />
                </div>
              ) : (
                <AppSourceBadge sourceApp={media.sourceApp} showLabel={false} />
              )}
            </div>
          </div>
        </div>
      );
    }

    // ─── 4. PRIORITY 4: POMODORO TIMER ───
    if (pomodoro && pomodoro.isRunning) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 16px 0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="select-none animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#5AA2FF] animate-pulse" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#5AA2FF", fontVariantNumeric: "tabular-nums" }}>
              {pomodoro.timeFormatted}
            </span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#a1a1aa" }}>
            <span>{pomodoro.mode === "focus" ? "Fokus" : "Istirahat"}</span>
          </div>
        </div>
      );
    }

    // ─── 5. PRIORITY 5: DEFAULT IDLE MODE ───
    const barWidth = Math.min(10.5, Math.max(1.5, (battery.level / 100) * 10.5));

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: "0 12px 0 18px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        className="select-none animate-in fade-in duration-200"
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {timeStr}
          </span>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            height: "26px",
            boxSizing: "border-box",
            padding: "0 10px 0 8px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.07)",
            fontSize: "12px",
            fontWeight: 600,
            color: "#ffffff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <svg width="18" height="10" viewBox="0 0 20 12" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="16" height="11" rx="3" stroke="#a1a1aa" />
            <rect x="2" y="2" width={barWidth} height="8" rx="1.8" fill="#5AA2FF" />
            <rect x="17.5" y="4" width="2" height="4" rx="1" fill="#a1a1aa" />
          </svg>
          <span>{battery.level}%</span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
      className="select-none"
    >
      {renderCompactContent()}
    </div>
  );
};
