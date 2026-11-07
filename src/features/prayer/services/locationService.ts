import { fetchWithTimeout } from "./http";

export interface PrayerLocation {
  latitude: number;
  longitude: number;
  city: string;
  /** IANA timezone, mis. "Asia/Jakarta". Jam salat dari API memakai timezone ini. */
  timeZone: string;
  source: "auto" | "manual";
}

const LOCATION_KEY = "boring-notch-prayer-location";

function isValid(location: unknown): location is PrayerLocation {
  const candidate = location as PrayerLocation | null;
  return (
    !!candidate &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    typeof candidate.timeZone === "string" &&
    candidate.timeZone.length > 0
  );
}

export function loadLocation(): PrayerLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? { ...parsed, source: parsed.source === "manual" ? "manual" : "auto" } : null;
  } catch {
    return null;
  }
}

export function saveLocation(location: PrayerLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {}
}

export function clearLocation(): void {
  try {
    localStorage.removeItem(LOCATION_KEY);
  } catch {}
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Lokasi perangkat dari IP. ipwho.is mengembalikan kota, koordinat, dan timezone IANA. */
export async function detectLocation(): Promise<PrayerLocation> {
  const res = await fetchWithTimeout("https://ipwho.is/", 5000);
  const data = await res.json();
  if (!data?.success || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
    throw new Error("Lokasi tidak terdeteksi");
  }
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: typeof data.city === "string" && data.city.length > 0 ? data.city : "Lokasi saat ini",
    timeZone: data.timezone?.id || deviceTimeZone(),
    source: "auto",
  };
}

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

/**
 * Pencarian kota untuk override manual. Aladhan `timingsByCity` sengaja tidak dipakai:
 * endpoint itu mengembalikan koordinat palsu (8.8888888, 7.7777777) untuk kota apa pun,
 * jadi jam salatnya benar tapi lokasinya tidak bisa dipakai sebagai sumber koordinat.
 */
export async function geocodeCity(query: string): Promise<PrayerLocation> {
  const name = query.trim();
  if (!name) throw new Error("Nama kota kosong");

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=1&language=id&format=json`;
  const res = await fetchWithTimeout(url, 5000);
  const data = await res.json();
  const hit: GeocodeResult | undefined = data?.results?.[0];
  if (!hit || !Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) {
    throw new Error(`Kota "${name}" tidak ditemukan`);
  }

  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    city: hit.name,
    timeZone: hit.timezone || deviceTimeZone(),
    source: "manual",
  };
}
