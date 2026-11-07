import React from "react";
import { BatteryInfo } from "../../types";

// Apple SF Symbol quote.bubble.fill matching Music_with_header.html
export const AppleLyricsIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-5.5L7.5 20.5V17H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
    <circle cx="9" cy="9.8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="9.8" r="1.2" fill="currentColor" stroke="none" />
    <path d="M9 11.2c0 1.1-.4 1.8-1.1 2.3M14.5 11.2c0 1.1-.4 1.8-1.1 2.3" strokeWidth="1.7" />
  </svg>
);

/** Aksen biru aplikasi, dipakai judul halaman dan visualizer. */
const ACCENT = "#5AA2FF";

/**
 * Judul halaman di header. 16px/700 putih adalah satu-satunya ukuran judul halaman;
 * `accentText` dipakai untuk kata kedua yang diberi warna aksen (mis. "To-do List").
 */
export const HeaderPageTitle: React.FC<{ text: string; accentText?: string }> = ({ text, accentText }) => (
  <span
    style={{
      fontSize: "16px",
      fontWeight: 700,
      color: "#ffffff",
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
    }}
  >
    {text}
    {accentText ? <span style={{ color: ACCENT }}>{accentText}</span> : null}
  </span>
);

/**
 * Visualizer gelombang di sisi kanan header. Ukuran 22x18 adalah ukuran bakunya, sama
 * dengan viewBox-nya, supaya tidak gepeng dan sama persis di halaman Music dan Pomodoro.
 */
export const HeaderWaveformIcon: React.FC = () => (
  <svg
    width="22"
    height="18"
    viewBox="0 0 22 18"
    fill="none"
    stroke={ACCENT}
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M3 7v4M7 4v10M11 1v16M15 5v8M19 7v4" />
  </svg>
);

/**
 * Baris header expanded: konten kiri (judul halaman), jam di tengah kartu, konten kanan.
 *
 * Satu komponen untuk SEMUA halaman dengan sengaja: sebelumnya tiap halaman menyalin
 * baris ini sendiri dan hasilnya melenceng satu sama lain (tinggi baris 18 vs 24, ukuran
 * grup 131 vs 142, dan jam meleset 3-4px antar halaman). Tinggi 18px dan tipografi di sini
 * adalah satu-satunya sumber kebenaran; jangan disalin ulang ke halaman.
 *
 * Dua spacer `flex: 1` yang sama besar itulah yang menaruh jam tepat di tengah kartu,
 * terlepas dari lebar konten kiri maupun kanan.
 */
export const ExpandedClockHeader: React.FC<{
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  /** Konten kiri, mis. judul halaman. */
  left?: React.ReactNode;
  /** Konten kanan, mis. ikon waveform atau chip. */
  right?: React.ReactNode;
  /** Mode lirik: sembunyikan ikon baterai dan tanggal, sisakan jam. */
  showBatteryAndDate?: boolean;
}> = ({ battery, dateStr, timeStr, left, right, showBatteryAndDate = true }) => {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", height: "18px" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>{left}</div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {showBatteryAndDate && (
          <>
            <HeaderBatteryDonut battery={battery} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>{dateStr}</span>
          </>
        )}
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
          {timeStr}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
};

// Header Battery Donut with dynamic charging animation (matching Charging.dc.html)
export const HeaderBatteryDonut: React.FC<{ battery: BatteryInfo }> = ({ battery }) => {
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius; // ~47.1
  const offset = ((battery.level / 100) * circumference).toFixed(1);
  const isCharging = battery.isCharging;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
      title={isCharging ? `Mengisi daya · ${battery.level}%` : `Baterai ${battery.level}%`}
    >
      <div style={{ position: "relative", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 22"
          fill="none"
          aria-hidden="true"
          style={{
            filter: isCharging ? "drop-shadow(0 0 4px rgba(48, 209, 88, 0.7))" : "none",
          }}
          className={isCharging ? "animate-pulse" : ""}
        >
          <circle cx="11" cy="11" r={radius} stroke="rgba(255,255,255,0.14)" strokeWidth="2.6" />
          <circle
            cx="11"
            cy="11"
            r={radius}
            stroke={isCharging ? "#30D158" : "#5AA2FF"}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={`${offset} ${circumference.toFixed(1)}`}
            transform="rotate(-90 11 11)"
          />
        </svg>
        {isCharging && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#30D158" aria-hidden="true">
              <path d="M13.5 2.5L5.5 13.2a.6.6 0 0 0 .5.95H10.5l-1 7.35a.4.4 0 0 0 .72.28l8.1-10.9a.6.6 0 0 0-.48-.96H13.3l.9-7.1a.4.4 0 0 0-.7-.32z" />
            </svg>
          </div>
        )}
      </div>
      {isCharging && (
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#30D158", fontVariantNumeric: "tabular-nums" }}>
          {battery.level}%
        </span>
      )}
    </div>
  );
};
