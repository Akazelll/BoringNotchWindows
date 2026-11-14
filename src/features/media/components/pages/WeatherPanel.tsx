import React from "react";
import type { WeatherData } from "../../../weather";
import type { ProcessedHourly, WeatherIconKind } from "../../../weather";
import {
  getWeatherMeta,
  windDirectionId,
  uvIndexLabel,
} from "../../../weather";
import { formatHHMMId } from "../../../prayer";

interface WeatherPanelProps {
  data: WeatherData;
  processed: ProcessedHourly;
  isStale?: boolean;
}

const WeatherIcon: React.FC<{
  kind: WeatherIconKind;
  size?: number;
}> = ({ kind, size = 26 }) => {
  switch (kind) {
    case "sun":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 26 26"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="13" cy="13" r="7" fill="url(#wx-sun)" />
          <g stroke="#FFD58A" strokeWidth="1.8" strokeLinecap="round">
            <path d="M13 1.8v2.6M13 21.6v2.6M1.8 13h2.6M21.6 13h2.6M5.1 5.1l1.8 1.8M19.1 19.1l1.8 1.8M5.1 20.9l1.8-1.8M19.1 6.9l1.8-1.8" />
          </g>
        </svg>
      );
    case "part":
      return (
        <svg
          width={Math.round((size * 28) / 26)}
          height={size}
          viewBox="0 0 44 44"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="15" cy="15" r="9" fill="url(#wx-sun)" />
          <path
            d="M14 36a8 8 0 0 1 0-16 11 11 0 0 1 21 3.5A6.3 6.3 0 0 1 34 36Z"
            fill="url(#wx-cloud)"
          />
        </svg>
      );
    case "rain":
      return (
        <svg
          width={Math.round((size * 28) / 26)}
          height={size}
          viewBox="0 0 44 44"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13 26a7 7 0 0 1 0-14 10 10 0 0 1 19 3 5.6 5.6 0 0 1-1 11Z"
            fill="#9FB0C8"
          />
          <g stroke="#5AA2FF" strokeWidth="2.6" strokeLinecap="round">
            <path d="M14 31l-2 6M23 31l-2 6M32 31l-2 6" />
          </g>
        </svg>
      );
    case "night":
      return (
        <svg
          width={Math.round((size * 28) / 26)}
          height={size}
          viewBox="0 0 44 44"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 6a11 11 0 1 0 12 15 9 9 0 0 1-12-15Z"
            fill="#DCE6FF"
          />
          <path
            d="M14 38a6.5 6.5 0 0 1 0-13 9 9 0 0 1 17 2.8A5.1 5.1 0 0 1 30 38Z"
            fill="#7F8FAE"
          />
        </svg>
      );
  }
};

export const WeatherPanel: React.FC<WeatherPanelProps> = ({
  data,
  processed,
  isStale = false,
}) => {
  const { current, daily } = data;
  const currentMeta = getWeatherMeta(current.weatherCode, current.isDay);

  const sunriseTime = daily.sunrise.split("T")[1] || "";
  const sunsetTime = daily.sunset.split("T")[1] || "";
  const sunRangeStr =
    sunriseTime && sunsetTime
      ? `${formatHHMMId(sunriseTime)} / ${formatHHMMId(sunsetTime)}`
      : "-";

  const chips = [
    { label: "Indeks UV", value: uvIndexLabel(daily.uvIndexMax) },
    {
      label: "Angin",
      value: `${current.windSpeed} km/j · ${windDirectionId(current.windDirection)}`,
    },
    { label: "Terbit / Terbenam", value: sunRangeStr },
  ];

  return (
    <div
      data-page="weather"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        flex: 1,
        minHeight: 0,
        gap: "8px",
      }}
    >
      {/* ─── DEFINISI GRADIEN SVG KUSTOM UNTUK IKON & KURVA CUACA ─── */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <radialGradient id="wx-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF3C9" />
            <stop offset="0.6" stopColor="#FFD58A" />
            <stop offset="1" stopColor="#FFB84D" />
          </radialGradient>
          <linearGradient id="wx-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4F8FF" />
            <stop offset="1" stopColor="#B9C8E0" />
          </linearGradient>
          <linearGradient id="wx-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFB84D" />
            <stop offset="0.5" stopColor="#7FB7FF" />
            <stop offset="1" stopColor="#5AA2FF" />
          </linearGradient>
        </defs>
      </svg>

      {/* ─── BARIS TENGAH: KONDISI SAAT INI (KIRI) + DIVIDER + 6 SLOT & KURVA (KANAN) ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: "16px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ─── KOLOM KIRI (130px): KONDISI SAAT INI ─── */}
        <div
          style={{
            width: "130px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "2px 0",
          }}
        >
          <div style={{ height: "30px", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <WeatherIcon kind={currentMeta.kind} size={28} />
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              lineHeight: 1,
              color: "#ffffff",
              letterSpacing: "-0.05em",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {current.temperature}°
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#ffffff",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flexShrink: 0,
            }}
          >
            {currentMeta.label}
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#a1a1aa",
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            T {daily.tempMax}° · R {daily.tempMin}° · Terasa {current.apparentTemperature}°
          </div>
          {isStale && (
            <div style={{ fontSize: "10px", fontWeight: 500, color: "#8a8a93", flexShrink: 0 }}>
              Data tersimpan
            </div>
          )}
        </div>

        {/* ─── VERTICAL DIVIDER ─── */}
        <div
          style={{ width: "1px", background: "rgba(255,255,255,0.1)" }}
          aria-hidden="true"
        />

        {/* ─── KOLOM KANAN (FLEKSIBEL): 6 SLOT JAM + KURVA SUHU ─── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "2px 0",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#a1a1aa",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            24 jam ke depan · per 4 jam
          </div>

          {/* 6 Slot Jam & Ikon */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              flexShrink: 0,
            }}
          >
            {processed.slots.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: s.isCurrent ? 700 : 500,
                    color: s.isCurrent ? "#ffffff" : "#a1a1aa",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {s.time}
                </span>
                <div
                  style={{
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WeatherIcon kind={s.kind} size={16} />
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: s.rain >= 40 ? "#5AA2FF" : "#6b6b75",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {s.rain}%
                </span>
              </div>
            ))}
          </div>

          {/* Kurva Suhu Bézier SVG + Label Suhu per Titik */}
          <div style={{ width: "100%", height: "34px", position: "relative", flexShrink: 0 }}>
            <svg
              viewBox="0 0 300 36"
              width="100%"
              height="100%"
              fill="none"
              style={{ overflow: "visible" }}
              aria-hidden="true"
            >
              {/* Garis kurva */}
              {processed.curvePath && (
                <path
                  d={processed.curvePath}
                  stroke="url(#wx-line)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Titik & Angka Suhu */}
              {processed.points.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r={pt.r} fill={pt.fill} />
                  <text
                    x={pt.x}
                    y={pt.y + 11}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="600"
                    fill={pt.isCurrent ? "#ffffff" : "#d4d4d8"}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {pt.temp}°
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* ─── BARIS BAWAH: 3 CHIPS (BADGES) 1:1 DENGAN Weather.dc.html (FULL WIDTH ROW) ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          width: "100%",
          flexShrink: 0,
        }}
      >
        {chips.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              height: "38px",
              boxSizing: "border-box",
              padding: "0 12px",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#8a8a93",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
