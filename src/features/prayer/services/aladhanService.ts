import { fetchWithTimeout } from "./http";
import { PRAYER_ORDER, type PrayerTimes } from "../lib/prayerTimes";

/** method=20 = Kementerian Agama Republik Indonesia (Fajr 20, Isha 18). */
const METHOD = 20;
const CACHE_KEY = "boring-notch-prayer-day";

export interface PrayerDay {
  key: string;
  times: PrayerTimes;
  timeZone: string;
}

export function dayCacheKey(dateKey: string, latitude: number, longitude: number): string {
  return `${dateKey}|${latitude},${longitude}|${METHOD}`;
}

export function loadCachedDay(): PrayerDay | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerDay;
    if (!parsed?.key || !parsed.times || !parsed.timeZone) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedDay(day: PrayerDay): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(day));
  } catch {}
}

/**
 * Jadwal harian untuk koordinat tertentu. Aladhan menerima tanggal dalam format DD-MM-YYYY
 * pada path, sementara kita menyimpan dateKey sebagai YYYY-MM-DD.
 * Sunrise/Sunset/Imsak/Midnight dibuang: bukan salat, dan Sunset selalu sama dengan Maghrib.
 */
export async function fetchTimings(
  latitude: number,
  longitude: number,
  dateKey: string
): Promise<PrayerDay> {
  const [year, month, dayOfMonth] = dateKey.split("-");
  const url =
    `https://api.aladhan.com/v1/timings/${dayOfMonth}-${month}-${year}` +
    `?latitude=${latitude}&longitude=${longitude}&method=${METHOD}`;

  const res = await fetchWithTimeout(url, 6000);
  const data = await res.json();
  if (data?.code !== 200 || !data.data?.timings) {
    throw new Error("Jadwal salat tidak tersedia");
  }

  const raw = data.data.timings as Record<string, string>;
  const times = PRAYER_ORDER.reduce((acc, key) => {
    acc[key] = raw[key] ?? "";
    return acc;
  }, {} as PrayerTimes);

  const prayerDay: PrayerDay = {
    key: dayCacheKey(dateKey, latitude, longitude),
    times,
    timeZone: data.data.meta?.timezone || "",
  };
  saveCachedDay(prayerDay);
  return prayerDay;
}
