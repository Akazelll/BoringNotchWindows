import React, { useState, useEffect } from "react";
import { MediaInfo, BatteryInfo, AppNotification, BluetoothDeviceEvent, CursorState, RobotMood } from "../../../shared/types";
import { AppSourceBadge } from "./AppSourceBadge";
import { RobotEyes } from "../../robot";
import { modeLabelId, type PomodoroController } from "../../pomodoro";
import { Timer } from "lucide-react";

interface CompactPillProps {
  media: MediaInfo | null;
  battery: BatteryInfo;
  currentToast?: AppNotification | null;
  onDismissToast?: () => void;
  bluetoothEvent?: BluetoothDeviceEvent | null;
  onDismissBluetooth?: () => void;
  pomodoro?: PomodoroController;
  cursor: CursorState;
  mood: RobotMood;
}

export const CompactPill: React.FC<CompactPillProps> = ({
  media,
  battery,
  pomodoro,
  cursor,
  mood,
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

  // Render Compact Content for 215x40px MacBook Notch Resting States
  const renderCompactContent = () => {
    // ─── 1. MEDIA PLAYING / TRACK PRESENT ───
    if (media && (media.isPlaying || !!media.title)) {
      const batteryRadius = 8;
      const batteryCircumference = 2 * Math.PI * batteryRadius;
      const batteryDash = ((battery.level / 100) * batteryCircumference).toFixed(1);

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 12px 0 14px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
          className="select-none animate-in fade-in duration-200"
        >
          {/* Sisi Kiri: Baterai Donat Melingkar 20x20px */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" role="img" aria-label={`Baterai ${battery.level}%`}>
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

          {/* Sisi Tengah: Jam Digital 14px font-semibold */}
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {timeStr}
          </div>

          {/* Sisi Kanan: Soundwave + Squircle App (Playing) ATAU Pause Icon + App (Paused) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "7px" }}>
            {media.isPlaying ? (
              <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "14px" }} aria-hidden="true">
                <div style={{ width: "2.5px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-1" />
                <div style={{ width: "2.5px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-2" />
                <div style={{ width: "2.5px", borderRadius: "2px", background: "#5AA2FF" }} className="animate-sound-bar-3" />
              </div>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#a1a1aa" aria-label="Dijeda" role="img">
                <rect x="6" y="5" width="4" height="14" rx="1.2" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" />
              </svg>
            )}

            <div style={{ width: "26px", height: "26px", flexShrink: 0, opacity: media.isPlaying ? 1 : 0.55 }}>
              {media.thumbnail ? (
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "7px",
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

    // ─── 2. POMODORO TIMER ───
    if (pomodoro && pomodoro.isRunning) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "0 14px 0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="select-none animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-[#5AA2FF] animate-pulse" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#5AA2FF", fontVariantNumeric: "tabular-nums" }}>
              {pomodoro.timeFormatted}
            </span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "#a1a1aa" }}>
            <span>{modeLabelId(pomodoro.mode)}</span>
          </div>
        </div>
      );
    }

    // ─── 3. DEFAULT IDLE MODE (Wajah robot) ───
    // Jam + baterai sengaja disembunyikan di sini; keduanya masih tampil saat ada media
    // berjalan dan lengkap di ExpandedCard begitu notch di-hover.
    return (
      <div style={{ width: "100%", height: "100%", boxSizing: "border-box" }} className="select-none">
        <RobotEyes mood={mood} tx={cursor.tx} ty={cursor.ty} sc={cursor.sc} />
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
