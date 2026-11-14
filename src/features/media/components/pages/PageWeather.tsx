import React from "react";
import {
  ExpandedClockHeader,
  HeaderPageTitle,
} from "../../../../shared/components/ui/ExpandedHeaderParts";
import { BatteryInfo } from "../../../../shared/types";
import type { WeatherController } from "../../../weather";
import { WeatherPanel } from "./WeatherPanel";
import { lastCityNear, formatCoords } from "../../../prayer";

interface PageWeatherProps {
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  weather: WeatherController;
}

export const PageWeather: React.FC<PageWeatherProps> = ({
  battery,
  dateStr,
  timeStr,
  weather,
}) => {
  const { data, processed, location, isLoading, isStale, error, retry } = weather;

  const locationLabel =
    location?.city ||
    (location ? lastCityNear(location.latitude, location.longitude) : "") ||
    (location ? formatCoords(location.latitude, location.longitude) : "");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
        flex: 1,
        minHeight: 0,
        justifyContent: "space-between",
      }}
      className="animate-in fade-in duration-200"
    >
      {/* Header Baris: Judul 'Cuaca' + Nama Kota di kiri, jam & baterai di tengah/kanan */}
      <ExpandedClockHeader
        battery={battery}
        dateStr={dateStr}
        timeStr={timeStr}
        left={
          <>
            <HeaderPageTitle text="Cuaca" />
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
              {locationLabel || "Mendeteksi kota..."}
            </span>
          </>
        }
      />

      {data && processed ? (
        <WeatherPanel data={data} processed={processed} isStale={isStale} />
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
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: isLoading ? "#a1a1aa" : "#d4d4d8",
            }}
          >
            {isLoading
              ? location
                ? "Memuat prakiraan cuaca..."
                : "Mendeteksi lokasi..."
              : error ?? "Gagal memuat data cuaca"}
          </div>
          {!isLoading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                retry();
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
