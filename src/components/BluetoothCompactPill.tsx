import React from "react";
import { BluetoothDeviceEvent } from "../types";

interface BluetoothCompactPillProps {
  event: BluetoothDeviceEvent;
  onDismiss?: () => void;
}

function DeviceTypeIcon({ deviceType }: { deviceType: string }) {
  switch (deviceType) {
    case "speaker":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <line x1="12" y1="6" x2="12.01" y2="6" strokeWidth="3" />
        </svg>
      );
    case "mouse":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="7" />
          <line x1="12" y1="6" x2="12" y2="10" />
        </svg>
      );
    case "keyboard":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
        </svg>
      );
    case "gamepad":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="6" y1="12" x2="10" y2="12" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="15" y1="13" x2="15.01" y2="13" strokeWidth="3" />
          <line x1="18" y1="11" x2="18.01" y2="11" strokeWidth="3" />
          <rect x="2" y="6" width="20" height="12" rx="6" />
        </svg>
      );
    case "phone":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
        </svg>
      );
    case "headphones":
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
          <rect x="3" y="14" width="4" height="6" rx="1.5" />
          <rect x="17" y="14" width="4" height="6" rx="1.5" />
        </svg>
      );
  }
}

export const BluetoothCompactPill: React.FC<BluetoothCompactPillProps> = ({
  event,
  onDismiss,
}) => {
  const percent = Math.min(100, Math.max(0, event.batteryPercent || 79));
  const radius = 21;
  const circumference = 2 * Math.PI * radius; // ~131.95
  const dashOffset = (percent / 100) * circumference;

  return (
    <div
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 24px 0 18px",
        background: "#09090b",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="animate-in fade-in duration-200 select-none"
      title="Klik untuk menutup banner"
    >
      {/* Sisi Kiri: Baterai Donat 50x50px dengan Ikon Bluetooth Apple di Tengah */}
      <div
        style={{ position: "relative", width: "50px", height: "50px", flexShrink: 0 }}
        role="img"
        aria-label={`Bluetooth terhubung, baterai ${percent} persen`}
      >
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke="#5AA2FF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dashOffset.toFixed(1)} ${circumference.toFixed(1)}`}
            transform="rotate(-90 25 25)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6.5 7.5l11 9-5.5 4.5V3l5.5 4.5-11 9" />
          </svg>
        </div>
      </div>

      {/* Sisi Tengah: Nama Device + Status Bulatan Biru & Persentase Baterai */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <div
          style={{
            fontSize: "17px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#ffffff",
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {event.name || "Baseus Encok WM01"}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#a1a1aa",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div
            style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5AA2FF" }}
            className="animate-pulse"
          />
          <span>{event.connected ? "Terhubung" : "Terputus"} · {percent}%</span>
        </div>
      </div>

      {/* Sisi Kanan: Circular Device Type Badge (46x46px) */}
      <div
        style={{
          width: "46px",
          height: "46px",
          flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DeviceTypeIcon deviceType={event.deviceType} />
      </div>
    </div>
  );
};
