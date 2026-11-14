import type { HourlySlotData } from "../services/weatherService";
import { getWeatherMeta, type WeatherIconKind } from "./weatherCode";
import { zoneWallClock } from "../../prayer/lib/prayerTimes";

export interface DisplaySlot {
  time: string;
  kind: WeatherIconKind;
  temp: number;
  rain: number;
  isCurrent: boolean;
}

export interface CurvePoint {
  x: number;
  y: number;
  temp: number;
  r: number;
  fill: string;
  isCurrent: boolean;
}

export interface ProcessedHourly {
  slots: DisplaySlot[];
  points: CurvePoint[];
  curvePath: string;
  lo: number;
  hi: number;
}

const VIEW_WIDTH = 300;
const SLOT_COUNT = 6;
const SLOT_WIDTH = VIEW_WIDTH / SLOT_COUNT; // 50

/**
 * Menghitung posisi y dalam viewBox kurva SVG (viewBox 0 0 300 36).
 * Batas y: 8px (suhu tertinggi) sampai 23px (suhu terendah).
 * Titik terendah 23px + offset teks 11px = 34px (muat dalam viewBox 36px).
 */
export function calculateY(temp: number, lo: number, hi: number): number {
  const span = hi - lo;
  if (span <= 0) return 16; // Jika semua suhu sama, garis mendatar di tengah
  const normalized = (temp - lo) / span;
  return 23 - normalized * 15;
}

/**
 * Memilih 6 slot per 4 jam dari jam lokal saat ini dan menghitung koordinat kurva SVG.
 */
export function processHourlyForecast(
  hourly: HourlySlotData[],
  timeZone: string,
  nowMs: number = Date.now()
): ProcessedHourly {
  if (!hourly || hourly.length === 0) {
    return { slots: [], points: [], curvePath: "", lo: 0, hi: 0 };
  }

  // Jam lokal di timezone lokasi
  const wall = zoneWallClock(nowMs, timeZone);
  const hourNow = Math.floor(wall.minutes / 60);

  const slots: DisplaySlot[] = [];

  for (let k = 0; k < SLOT_COUNT; k++) {
    const targetHour = hourNow + k * 4;
    // Indeks dalam array 48 jam Open-Meteo
    const idx = Math.min(targetHour, hourly.length - 1);
    const item = hourly[idx] || hourly[hourly.length - 1];

    const isCurrent = k === 0;
    const hourMod = targetHour % 24;
    const timeLabel = isCurrent ? "Skrg" : `${String(hourMod).padStart(2, "0")}.00`;
    const meta = getWeatherMeta(item.weatherCode, item.isDay, item.precipitationProbability);

    slots.push({
      time: timeLabel,
      kind: meta.kind,
      temp: item.temperature,
      rain: item.precipitationProbability,
      isCurrent,
    });
  }

  const temps = slots.map((s) => s.temp);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);

  const points: CurvePoint[] = slots.map((slot, i) => {
    const x = (i + 0.5) * SLOT_WIDTH;
    const y = calculateY(slot.temp, lo, hi);
    return {
      x,
      y: Number(y.toFixed(1)),
      temp: slot.temp,
      r: slot.isCurrent ? 4 : 3,
      fill: slot.isCurrent ? "#ffffff" : "#7FB7FF",
      isCurrent: slot.isCurrent,
    };
  });

  // Susun kurva Bézier halus menghubungkan titik-titik
  let curvePath = "";
  if (points.length > 0) {
    curvePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const mx = (prev.x + curr.x) / 2;
      curvePath += ` C ${mx.toFixed(1)} ${prev.y} ${mx.toFixed(1)} ${curr.y} ${curr.x} ${curr.y}`;
    }
  }

  return {
    slots,
    points,
    curvePath,
    lo,
    hi,
  };
}
