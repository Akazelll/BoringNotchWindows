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

/** Kota cadangan bila reverse geocode gagal — bukan alasan untuk membatalkan deteksi. */
const DEFAULT_CITY = "Lokasi saat ini";

function providerError(provider: string, detail: unknown): Error {
  const message = detail instanceof Error && detail.message ? detail.message : String(detail);
  return new Error(`${provider}: ${message}`);
}

interface IpGeo {
  latitude: number;
  longitude: number;
  timeZone: string;
}

/** get.geojs.io memberi koordinat + timezone IANA, tapi tidak memberi nama kota. */
async function ipGeoJsiO(): Promise<IpGeo> {
  let data: Record<string, unknown>;
  try {
    const res = await fetchWithTimeout("https://get.geojs.io/v1/ip/geo.json", 5000);
    data = await res.json();
  } catch (err) {
    throw providerError("get.geojs.io", err);
  }

  // latitude/longitude dikirim sebagai string, jadi wajib dikonversi lebih dulu.
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw providerError("get.geojs.io", "koordinat tidak valid");
  }

  const timeZone = typeof data?.timezone === "string" && data.timezone.length > 0 ? data.timezone : deviceTimeZone();
  return { latitude, longitude, timeZone };
}

/**
 * Nama kota dari koordinat. BigDataCloud tidak butuh API key, dan `localityLanguage=id`
 * mengembalikan nama kota dalam bahasa Indonesia. Sengaja tidak pernah melempar: kota hanya
 * label tampilan, sedangkan koordinat dan timezone dari provider IP sudah cukup untuk salat.
 */
async function reverseCity(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client" +
      `?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`;
    const res = await fetchWithTimeout(url, 5000);
    const data = await res.json();
    const city = typeof data?.city === "string" && data.city.length > 0 ? data.city : data?.locality;
    return typeof city === "string" && city.length > 0 ? city : null;
  } catch {
    return null;
  }
}

/** ipapi.co memberi kota sekaligus koordinat, jadi dipakai sebagai cadangan terakhir. */
async function ipapiCo(): Promise<PrayerLocation> {
  let data: Record<string, unknown>;
  try {
    const res = await fetchWithTimeout("https://ipapi.co/json/", 5000);
    data = await res.json();
  } catch (err) {
    throw providerError("ipapi.co", err);
  }

  // Saat kena rate limit, ipapi.co membalas HTTP 200 dengan {error:true, reason:"RateLimited"},
  // jadi status code saja tidak cukup untuk menentukan berhasil atau tidak.
  if (data?.error) {
    throw providerError("ipapi.co", typeof data.reason === "string" ? data.reason : "permintaan ditolak");
  }

  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw providerError("ipapi.co", "koordinat tidak valid");
  }

  return {
    latitude,
    longitude,
    city: typeof data?.city === "string" && data.city.length > 0 ? data.city : DEFAULT_CITY,
    timeZone: typeof data?.timezone === "string" && data.timezone.length > 0 ? data.timezone : deviceTimeZone(),
    source: "auto",
  };
}

/**
 * Lokasi perangkat dari IP.
 *
 * ipwho.is sengaja DIBUANG: ia membatasi permintaan per origin, dan origin build terpasang
 * (`http://tauri.localhost`) selalu dibalas 429 untuk instance ini — sementara origin
 * `tauri dev` (`localhost:1420`) lolos. Akibatnya jadwal salat tidak pernah terdeteksi di
 * aplikasi yang di-install, padahal jalan di mode dev.
 */
export async function detectLocation(): Promise<PrayerLocation> {
  let lastError: unknown = new Error("tidak ada provider yang menjawab");

  try {
    const geo = await ipGeoJsiO();
    return {
      ...geo,
      city: (await reverseCity(geo.latitude, geo.longitude)) ?? DEFAULT_CITY,
      source: "auto",
    };
  } catch (err) {
    lastError = err;
  }

  try {
    return await ipapiCo();
  } catch (err) {
    lastError = err;
  }

  // Pesan provider terakhir dibawa serta supaya kegagalan berikutnya bisa didiagnosis
  // langsung dari layar Salat, bukan tersamar sebagai "tidak terdeteksi" saja.
  const detail = lastError instanceof Error && lastError.message ? lastError.message : "tidak ada respons";
  throw new Error(`Lokasi tidak terdeteksi (${detail})`);
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
