import React from "react";
import { PRAYER_LABEL_ID, formatHHMMId, type PrayerKey } from "../lib/prayerTimes";

interface PrayerBannerPillProps {
  prayer: PrayerKey;
  time: string;
  onDismiss?: () => void;
}

/**
 * Banner compact mengikuti PrayerReminder.dc.html. Ukuran mengikuti bahasa banner notch
 * (400x78, sama seperti charging/bluetooth) alih-alih artboard 520x130, supaya notch tidak
 * melompat ukuran saat banner muncul. Bar drain di bawah adalah durasi tampil banner itu sendiri.
 */
export const PrayerBannerPill: React.FC<PrayerBannerPillProps> = ({ prayer, time, onDismiss }) => {
  const label = PRAYER_LABEL_ID[prayer];
  const clock = formatHHMMId(time);

  return (
    <div
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 28px 10px 18px",
        background: "#09090b",
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="animate-in fade-in duration-200 select-none"
      title="Klik untuk menutup"
      role="img"
      aria-label={`Waktunya salat ${label}, ${clock}`}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          flexShrink: 0,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #4A57A8 0%, #1B2145 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
        }}
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M20.2 14.6A8.3 8.3 0 1 1 9.4 3.8a6.7 6.7 0 0 0 10.8 10.8z" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#ffffff",
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#a1a1aa",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Waktunya salat
        </div>
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {clock}
      </div>

      <div
        style={{
          position: "absolute",
          left: "34px",
          right: "34px",
          bottom: "9px",
          height: "3px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.1)",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            height: "3px",
            borderRadius: "2px",
            background: "linear-gradient(90deg, #2F7BFF 0%, #7C6CFF 100%)",
          }}
          className="animate-prayer-drain"
        />
      </div>
    </div>
  );
};
