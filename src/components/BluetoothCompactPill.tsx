import React from "react";
import { BluetoothDeviceEvent } from "../types";

interface BluetoothCompactPillProps {
  event: BluetoothDeviceEvent;
  onDismiss?: () => void;
}

export const BluetoothCompactPill: React.FC<BluetoothCompactPillProps> = ({
  event,
  onDismiss,
}) => {
  const percent = Math.min(100, Math.max(0, event.batteryPercent || 79));
  const radius = 18;
  const circumference = 2 * Math.PI * radius; // ~113.1
  const dashOffset = (percent / 100) * circumference;

  return (
    <div
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 18px 0 18px",
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
      {/* Sisi Kiri: Baterai Ring 44x44px dengan Ikon Bluetooth di Tengah */}
      <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
          <circle cx="22" cy="22" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3.2" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke="#5AA2FF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={`${dashOffset.toFixed(1)} ${circumference.toFixed(1)}`}
            transform="rotate(-90 22 22)"
          />
        </svg>
        <div style={{ position: "absolute", left: 0, top: 0, width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6.5 7.5l11 9-5.5 4.5V3l5.5 4.5-11 9" />
          </svg>
        </div>
      </div>

      {/* Tengah: Nama Device + Status Bulatan Biru & Persentase Baterai */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.2, color: "#ffffff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {event.name || "Baseus Encok WM01"}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#a1a1aa", fontVariantNumeric: "tabular-nums" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5AA2FF" }} className="animate-pulse" />
          <span>{event.connected ? "Terhubung" : "Terputus"} · {percent}%</span>
        </div>
      </div>

      {/* Sisi Kanan: Badge Lingkaran Jenis Perangkat (Headphone Icon 40x40px) */}
      <div
        style={{
          width: "40px",
          height: "40px",
          flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
          <rect x="3" y="14" width="4" height="6" rx="1.5" />
          <rect x="17" y="14" width="4" height="6" rx="1.5" />
        </svg>
      </div>
    </div>
  );
};
