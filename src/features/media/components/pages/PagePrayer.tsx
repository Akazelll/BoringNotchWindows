import React, { useState } from "react";
import { ExpandedClockHeader, HeaderPageTitle } from "../../../../shared/components/ui/ExpandedHeaderParts";
import { BatteryInfo } from "../../../../shared/types";
import {
  PRAYER_LABEL_ID,
  formatHHMMId,
  formatRelative,
  type PrayerController,
} from "../../../prayer";
import { PrayerTimesPanel } from "./PrayerTimesPanel";

interface PagePrayerProps {
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  prayer: PrayerController;
}

export const PagePrayer: React.FC<PagePrayerProps> = ({ battery, dateStr, timeStr, prayer }) => {
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState("");

  const { next, times, location, isLoading, isStale, error, isResolvingCity } = prayer;

  const submitCity = async () => {
    if (!cityDraft.trim()) {
      setIsEditingCity(false);
      return;
    }
    await prayer.setManualCity(cityDraft);
    setIsEditingCity(false);
    setCityDraft("");
  };

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
      {/* Header Row: nama kota (bisa diubah) kiri, jam tengah */}
      <ExpandedClockHeader
        battery={battery}
        dateStr={dateStr}
        timeStr={timeStr}
        left={
          <>
          <HeaderPageTitle text="Salat" />

          {isEditingCity ? (
            <>
              <input
                autoFocus
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") void submitCity();
                  if (e.key === "Escape") setIsEditingCity(false);
                }}
                placeholder="Ketik nama kota..."
                aria-label="Cari kota"
                style={{
                  width: "130px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "8px",
                  padding: "2px 6px",
                  color: "#ffffff",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void submitCity();
                }}
                disabled={isResolvingCity}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#5AA2FF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
                className="active:scale-95 transition"
              >
                {isResolvingCity ? "Mencari..." : "Simpan"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingCity(false);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#8a8a93",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Batal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCityDraft(location?.city ?? "");
                  setIsEditingCity(true);
                }}
                title="Klik untuk mengganti kota"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#8a8a93",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  maxWidth: "140px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {location?.city ?? "Lokasi tidak terdeteksi"}
                {location?.source === "manual" ? " · manual" : ""}
              </button>
              {location?.source === "manual" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void prayer.resetToAuto();
                  }}
                  title="Kembali ke lokasi otomatis"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#5AA2FF",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Deteksi otomatis
                </button>
              )}
            </>
          )}
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
            <div
              style={{
                position: "relative",
                height: "5px",
                borderRadius: "3px",
                background: "rgba(255,255,255,0.12)",
                marginTop: "10px",
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(next.arcFraction * 100).toFixed(1)}%`,
                  borderRadius: "3px",
                  background: "linear-gradient(90deg, #2F7BFF 0%, #7FB7FF 100%)",
                }}
              />
            </div>
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
