import React from "react";
import { BatteryInfo } from "../types";

export type ChargingBannerMode = "connected" | "disconnected";

interface ChargingCompactPillProps {
  battery: BatteryInfo;
  mode?: ChargingBannerMode;
  onDismiss?: () => void;
}

export const ChargingCompactPill: React.FC<ChargingCompactPillProps> = ({
  battery,
  mode = "connected",
  onDismiss,
}) => {
  const isDisconnected = mode === "disconnected";
  const radius = 21;
  const circumference = 2 * Math.PI * radius; // ~131.95
  const validLevel = Math.min(100, Math.max(0, battery.level));
  const dashOffset = (validLevel / 100) * circumference;

  return (
    <div
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "0 28px 0 18px",
        background: "#09090b",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "14px",
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}
      className="animate-in fade-in duration-200 select-none"
      title="Klik untuk menutup"
    >
      {/* Sisi Kiri: Donut Progress Ring 50x50px */}
      <div
        style={{ position: "relative", width: "50px", height: "50px", flexShrink: 0 }}
        role="img"
        aria-label={
          isDisconnected
            ? `Pengisi daya terputus, baterai ${validLevel} persen`
            : `Mengisi daya, ${validLevel} persen`
        }
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
            stroke={isDisconnected ? "#d4d4d8" : "#30D158"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dashOffset.toFixed(1)} ${circumference.toFixed(1)}`}
            transform="rotate(-90 25 25)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Ikon di Tengah Donat */}
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
          {isDisconnected ? (
            /* Ikon Steker Terputus Apple dengan Coretan Merah #FF453A */
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e4e4e7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 3v4M15 3v4" />
              <path d="M6.5 7h11v4.5a5.5 5.5 0 0 1-11 0z" />
              <path d="M12 17v4" />
              <path d="M3.5 3.5l17 17" stroke="#FF453A" />
            </svg>
          ) : (
            /* Ikon Petir Apple #30D158 */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#30D158" aria-hidden="true">
              <path d="M13.5 2.5L5.5 13.2a.6.6 0 0 0 .5.95H10.5l-1 7.35a.4.4 0 0 0 .72.28l8.1-10.9a.6.6 0 0 0-.48-.96H13.3l.9-7.1a.4.4 0 0 0-.7-.32z" />
            </svg>
          )}
        </div>
      </div>

      {/* Sisi Tengah: Teks Label & Subteks */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
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
          {isDisconnected ? "Pengisi daya terputus" : "Mengisi daya"}
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
          {isDisconnected ? "Menggunakan baterai" : "Pengisi daya terhubung"}
        </div>
      </div>

      {/* Sisi Kanan: Angka Persentase Besar */}
      <div
        style={{
          fontSize: "38px",
          fontWeight: 600,
          lineHeight: 1,
          color: "#ffffff",
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {validLevel}
        <span style={{ fontSize: "22px", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: "#a1a1aa", letterSpacing: 0 }}>
          %
        </span>
      </div>
    </div>
  );
};
