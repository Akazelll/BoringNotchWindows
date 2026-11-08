import { fetchWithTimeout } from "./http";
import { getDeviceLocation } from "./deviceLocationService";

export interface PrayerLocation {
  latitude: number;
  longitude: number;
  city: string;
  /** IANA timezone, mis. "Asia/Jakarta". Jam salat dari API memakai timezone ini. */
  timeZone: string;
  /** Epoch ms saat deteksi berhasil. 0 = record lama dari sebelum field ini ada. */
  detectedAt: number;
}

const LOCATION_KEY = "boring-notch-prayer-location";

/** Lokasi lebih tua dari ini dideteksi ulang saat aplikasi dibuka. */
export const LOCATION_TTL_MS = 24 * 60 * 60_000;

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
    if (!isValid(parsed)) return null;
    // Record lama (termasuk yang dulu berisi kota manual) tidak punya `detectedAt`, jadi
    // otomatis dianggap kedaluwarsa dan dideteksi ulang — tidak ada pengguna yang terjebak.
    return { ...parsed, detectedAt: Number.isFinite(parsed.detectedAt) ? parsed.detectedAt : 0 };
  } catch {
    return null;
  }
}

/** Menyegel `detectedAt` di satu tempat, supaya tidak ada pemanggil yang lupa mengisinya. */
export function saveLocation(location: Omit<PrayerLocation, "detectedAt">): PrayerLocation {
  const stamped: PrayerLocation = { ...location, detectedAt: Date.now() };
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(stamped));
  } catch {}
  return stamped;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Kota cadangan bila reverse geocode gagal. Kosong, bukan "Lokasi saat ini": halaman Salat
 * menampilkan "Lokasi tidak terdeteksi" sendiri, dan label karangan di header pernah tertukar
 * dengan nama kota sungguhan.
 */
const DEFAULT_CITY = "";

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
    // Berlapis: kota administratif dulu, lalu locality, lalu provinsi. Untuk koordinat
    // perangkat di pedesaan, `city` sering kosong sementara provinsi tetap terisi.
    for (const key of ["city", "locality", "principalSubdivision"]) {
      const value = data?.[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
    return null;
  } catch {
    return null;
  }
}

/** ipapi.co memberi kota sekaligus koordinat, jadi dipakai sebagai cadangan terakhir. */
async function ipapiCo(): Promise<Omit<PrayerLocation, "detectedAt">> {
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
  };
}

/**
 * Lokasi perangkat untuk jadwal salat, berprioritas.
 *
 * 1. Windows Location Provider (WiFi/GPS) — ini lokasi sebenarnya perangkat.
 * 2. IP, kalau izin lokasi ditolak / tidak ada provider / timeout. Deteksi IP menunjuk gateway
 *    ISP, jadi bisa meleset puluhan kilometer: terukur di mesin pengembang, IP memberi Jakarta
 *    sementara perangkat di Kudus — jadwal salat selisih 14-16 menit.
 *
 * Rantai IP lama tetap dipertahankan sebagai fallback supaya fitur tidak pernah mati.
 * ipwho.is sengaja DIBUANG: ia membatasi permintaan per origin, dan origin build terpasang
 * (`http://tauri.localhost`) selalu dibalas 429 untuk instance ini — sementara origin
 * `tauri dev` (`localhost:1420`) lolos. Akibatnya jadwal salat tidak pernah terdeteksi di
 * aplikasi yang di-install, padahal jalan di mode dev.
 */
export async function detectLocation(): Promise<Omit<PrayerLocation, "detectedAt">> {
  let lastError: unknown = new Error("tidak ada provider yang menjawab");

  try {
    const device = await getDeviceLocation();
    return {
      latitude: device.latitude,
      longitude: device.longitude,
      city: (await reverseCity(device.latitude, device.longitude)) ?? DEFAULT_CITY,
      // Timezone perangkat hanya tebakan awal; Aladhan mengoreksinya lewat meta.timezone.
      timeZone: deviceTimeZone(),
    };
  } catch (err) {
    lastError = err;
  }

  try {
    const geo = await ipGeoJsiO();
    return {
      ...geo,
      city: (await reverseCity(geo.latitude, geo.longitude)) ?? DEFAULT_CITY,
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
