import React, { useEffect, useRef, useState } from "react";
import {
  ARC_VIEWBOX_HEIGHT,
  ARC_VIEWBOX_WIDTH,
  LABEL_WIDTH,
  PRAYER_LABEL_ID,
  PRAYER_ORDER,
  arcFraction,
  formatHHMMId,
  parseHHMM,
  spreadLabelPositions,
  sunArcXY,
  type PrayerKey,
  type PrayerTimes,
} from "../../../prayer";

interface PrayerTimesPanelProps {
  times: PrayerTimes;
  activeKey: PrayerKey;
  prevKey: PrayerKey;
  nowFraction: number;
}

const LABEL_ROW_HEIGHT = 30;

/**
 * Busur matahari + baris jam 5 salat, mengikuti Prayer.dc.html. Titik salat diletakkan
 * menurut jamnya (bukan jarak seragam seperti artboard) supaya posisinya menyatakan waktu,
 * dan matahari duduk di posisi jam sekarang.
 *
 * Label jam TIDAK ditempel tepat di bawah titiknya: salat di Indonesia berdesakan di ujung
 * hari, jadi labelnya digeser ke kiri oleh `spreadLabelPositions` sampai tidak bertumpuk.
 */
export const PrayerTimesPanel: React.FC<PrayerTimesPanelProps> = ({ times, activeKey, prevKey, nowFraction }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);

  // ResizeObserver, bukan window.resize: lebar panel ikut berubah saat jendela Tauri
  // di-resize dan selama animasi lebar kartu berjalan.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setPanelWidth(width);
    });
    observer.observe(node);
    setPanelWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const sun = sunArcXY(nowFraction);
  const markers = PRAYER_ORDER.map((key) => {
    const fraction = arcFraction(parseHHMM(times[key]), times);
    return { key, ...sunArcXY(fraction) };
  });

  // Di bawah 260px SVG dibatasi lebar sehingga titik px-nya proporsional terhadap panel;
  // di atas itu SVG berhenti membesar dan terpusat, jadi pemetaan px harus dijepit sama.
  const scale = panelWidth > 0 ? Math.min(panelWidth / ARC_VIEWBOX_WIDTH, 1) : 0;
  const offsetX = Math.max(0, (panelWidth - ARC_VIEWBOX_WIDTH * scale) / 2);
  const markerPx = markers.map((m) => offsetX + m.x * scale);
  const labelPositions =
    panelWidth > 0 ? spreadLabelPositions(markerPx, panelWidth) : markerPx;

  return (
    <div
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}
      ref={wrapRef}
    >
      <svg
        width="100%"
        height={ARC_VIEWBOX_HEIGHT}
        viewBox={`0 0 ${ARC_VIEWBOX_WIDTH} ${ARC_VIEWBOX_HEIGHT}`}
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Posisi matahari antara ${PRAYER_LABEL_ID[prevKey]} dan ${PRAYER_LABEL_ID[activeKey]}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <clipPath id="prayer-lit">
            <rect x="0" y="-20" width={sun.x} height="120" />
          </clipPath>
          <linearGradient id="prayer-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2F7BFF" />
            <stop offset="1" stopColor="#7FB7FF" />
          </linearGradient>
          <radialGradient id="prayer-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF3C9" />
            <stop offset="0.45" stopColor="#FFD58A" />
            <stop offset="1" stopColor="#FFB84D" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path d={`M0 78H${ARC_VIEWBOX_WIDTH}`} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <path d="M12 78Q130 -54 248 78" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M12 78Q130 -54 248 78"
          stroke="url(#prayer-arc)"
          strokeWidth="2.5"
          strokeLinecap="round"
          clipPath="url(#prayer-lit)"
        />

        {markers.map(({ key, x, y }) => {
          const isActive = key === activeKey;
          return <circle key={key} cx={x} cy={y} r={isActive ? 3.6 : 3.2} fill={isActive ? "#ffffff" : "#7FB7FF"} />;
        })}

        <circle cx={sun.x} cy={sun.y} r="15" fill="url(#prayer-sun)" />
        <circle cx={sun.x} cy={sun.y} r="5.5" fill="#FFF3C9" />
      </svg>

      <div style={{ position: "relative", height: `${LABEL_ROW_HEIGHT}px` }}>
        {markers.map(({ key }, index) => {
          const isActive = key === activeKey;
          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left: `${labelPositions[index].toFixed(1)}px`,
                top: 0,
                width: `${LABEL_WIDTH}px`,
                marginLeft: `${-LABEL_WIDTH / 2}px`,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "#ffffff" : "#a1a1aa",
                  whiteSpace: "nowrap",
                }}
              >
                {PRAYER_LABEL_ID[key]}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: isActive ? "#e4e4e7" : "#8a8a93",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatHHMMId(times[key])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
