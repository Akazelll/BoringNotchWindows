import React from "react";
import { ExpandedClockHeader, HeaderPageTitle } from "../../../../shared/components/ui/ExpandedHeaderParts";
import { BatteryInfo } from "../../../../shared/types";
import {
  PRAYER_LABEL_ID,
  formatHHMMId,
  formatRelative,
  type PrayerController,
} from "../../../prayer";
import { ProgressBar } from "../../../../shared/components/ui/ProgressBar";
import { PrayerTimesPanel } from "./PrayerTimesPanel";

interface PagePrayerProps {
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  prayer: PrayerController;
}

export const PagePrayer: React.FC<PagePrayerProps> = ({ battery, dateStr, timeStr, prayer }) => {
  const { next, times, location, isLoading, isStale, error } = prayer;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
        flex: 1,
        minHeight: 0,
        justifyContent: "space-between",
      }}
      className="animate-in fade-in duration-200"
    >
      {/* Header Row: nama kota (otomatis dari lokasi perangkat) kiri, jam tengah */}
      <ExpandedClockHeader
        battery={battery}
        dateStr={dateStr}
        timeStr={timeStr}
        left={
          <>
            <HeaderPageTitle text="Salat" />
            <span
              style={{
                color: "#8a8a93",
                fontSize: "13px",
                fontWeight: 500,
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {location?.city || "Lokasi tidak terdeteksi"}
            </span>
          </>
        }
      />

      {times && next ? (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: "18px", flex: 1, minHeight: 0 }}>
          {/* Kolom kiri: salat berikutnya, jam, sisa waktu, progres menuju salat itu */}
          <div style={{ width: "172px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#a1a1aa" }}>Berikutnya</div>
            <div style={{ fontSize: "36px", fontWeight: 700, lineHeight: 1.1, color: "#ffffff", letterSpacing: "-0.03em" }}>
              {PRAYER_LABEL_ID[next.key]}
            </div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: "10px", paddingTop: "2px" }}>
              <span style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
                {formatHHMMId(next.time)}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#5AA2FF" }}>
                {formatRelative(next.minutesLeft)}
              </span>
            </div>
            <ProgressBar value={next.arcFraction} />
            {isStale && (
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#8a8a93", paddingTop: "4px" }}>Jadwal kemarin</div>
            )}
          </div>

          <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} aria-hidden="true" />

          <PrayerTimesPanel
            times={times}
            activeKey={next.key}
            prevKey={next.prevKey}
            nowFraction={next.arcFraction}
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 500, color: isLoading ? "#a1a1aa" : "#d4d4d8" }}>
            {isLoading
              ? location
                ? "Memuat jadwal salat..."
                : "Mendeteksi lokasi..."
              : error ?? "Gagal memuat jadwal salat"}
          </div>
          {!isLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prayer.retry();
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.07)",
                borderRadius: "999px",
                padding: "5px 14px",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className="active:scale-95 transition"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}
    </div>
  );
};
