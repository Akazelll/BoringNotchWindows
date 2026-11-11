export const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type PrayerKey = (typeof PRAYER_ORDER)[number];
export type PrayerTimes = Record<PrayerKey, string>;

/** Nama salat bahasa Indonesia, sama seperti referensi desain. */
export const PRAYER_LABEL_ID: Record<PrayerKey, string> = {
  Fajr: "Subuh",
  Dhuhr: "Dzuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya",
};

/** Menit sejak tengah malam dari jam "HH:MM" yang dikirim API. */
export function parseHHMM(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** "17:47" -> "17.47": jam Indonesia memakai titik sebagai pemisah, sama seperti useClock. */
export function formatHHMMId(hhmm: string): string {
  const minutes = parseHHMM(hhmm);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/**
 * Koordinat sebagai label lokasi cadangan: "-6.80, 110.85".
 *
 * Dipakai header Salat saat nama kota tidak tersedia padahal koordinatnya sudah ada. Ini
 * memisahkan dua keadaan yang dulu tampil sama: deteksi gagal total versus lokasi terdeteksi
 * tanpa nama. Dipakai koordinat, bukan kalimat, karena ini fakta yang sudah kita punya dan
 * pendek, sehingga muat di header 140px tanpa terpotong.
 */
export function formatCoords(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}

/** Jari-jari bumi rata-rata, km. Bola dianggap cukup: ini hanya untuk ambang "masih dekat". */
const EARTH_RADIUS_KM = 6371;

/**
 * Jarak lingkaran besar antara dua koordinat, km.
 *
 * Dipakai untuk memutuskan apakah nama kota lama masih boleh dipakai saat reverse geocode
 * gagal: nama lama berguna kalau perangkat belum pindah jauh, menyesatkan kalau sudah.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.NaN;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface ZoneWallClock {
  dateKey: string;
  minutes: number;
}

/**
 * Jam dinding di timezone LOKASI, bukan timezone perangkat. Jadwal salat berjangkar pada
 * lokasi geografis, jadi saat jam perangkat berbeda (VPN, jam salah setel) yang dipakai
 * tetap timezone lokasi. `Date.now()` hanya menyuplai instan-nya.
 *
 * `hourCycle: "h23"` dipakai, bukan `hour12: false`, karena sebagian locale mengembalikan
 * "24" untuk tengah malam.
 */
export function zoneWallClock(nowMs: number, timeZone: string): ZoneWallClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(nowMs));

  const field: Record<string, string> = {};
  for (const part of parts) field[part.type] = part.value;

  return {
    dateKey: `${field.year}-${field.month}-${field.day}`,
    minutes: Number(field.hour) * 60 + Number(field.minute),
  };
}

/** Salat berikutnya setelah `nowMin`; membungkus ke Subuh setelah Isya. */
export function nextPrayerIndex(times: PrayerTimes, nowMin: number): number {
  const index = PRAYER_ORDER.findIndex((key) => parseHHMM(times[key]) > nowMin);
  return index === -1 ? 0 : index;
}

/** Salat terakhir yang sudah lewat; sebelum Subuh berarti Isya hari sebelumnya. */
export function prevPrayerIndex(times: PrayerTimes, nowMin: number): number {
  let found = PRAYER_ORDER.length - 1;
  for (let i = 0; i < PRAYER_ORDER.length; i += 1) {
    if (parseHHMM(times[PRAYER_ORDER[i]]) <= nowMin) found = i;
  }
  return found;
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * Menit menuju salat berikutnya.
 *
 * Setelah Isya targetnya adalah Subuh BESOK, jadi selisih mentahnya negatif (23:30 -> 04:32
 * = -1138). Nilai itu dulu dijepit ke 0 oleh `Math.max(0, …)` di pemanggil, sehingga hitung
 * mundurnya hilang dan labelnya macet di "sekarang" sepanjang malam. Di sini pembungkusan
 * hari ditangani, bukan dijepit.
 */
export function minutesUntil(times: PrayerTimes, nowMin: number): number {
  const target = parseHHMM(times[PRAYER_ORDER[nextPrayerIndex(times, nowMin)]]);
  const delta = target - nowMin;
  return delta > 0 ? delta : delta + MINUTES_PER_DAY;
}

/** "dalam 1 j 8 mnt" / "dalam 45 mnt" / "sekarang". */
export function formatRelative(deltaMin: number): string {
  if (deltaMin <= 0) return "sekarang";
  const hours = Math.floor(deltaMin / 60);
  const minutes = deltaMin % 60;
  if (hours === 0) return `dalam ${minutes} mnt`;
  if (minutes === 0) return `dalam ${hours} j`;
  return `dalam ${hours} j ${minutes} mnt`;
}

/** Posisi salat pada busur matahari, 0..1 dari Subuh sampai Isya. */
export function arcFraction(minutes: number, times: PrayerTimes): number {
  const fajr = parseHHMM(times.Fajr);
  const isha = parseHHMM(times.Isha);
  if (isha <= fajr) return 0;
  return Math.min(1, Math.max(0, (minutes - fajr) / (isha - fajr)));
}

/**
 * Titik pada busur referensi `M12 78Q130 -54 248 78`. Parameter Bézier menyederhana rapi:
 * x linear, y parabola. Cocok dengan titik di artboard (t=0.5 -> 130,12; t=0.25 -> 71,28.5).
 */
export function sunArcXY(fraction: number): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, fraction));
  return { x: 12 + 236 * t, y: 78 - 264 * t * (1 - t) };
}

export const ARC_VIEWBOX_WIDTH = 260;
export const ARC_VIEWBOX_HEIGHT = 92;

/**
 * Titik busur untuk x viewBox yang sudah dibalik dari px label panel.
 *
 * Label digeser `spreadLabelPositions` supaya tidak bertumpuk, jadi posisi label bukan lagi
 * posisi jamnya. Dot harus ikut label (desain artboard: titik tepat di atas nama salat), jadi
 * px label dipetakan balik ke viewBox lalu diambil y busur di x itu. `sunArcXY` sudah menjepit
 * t ke 0..1, jadi di luar busur pun tetap menempel di ujung.
 */
export function arcPointForLabelPx(
  labelPx: number,
  scale: number,
  offsetX: number
): { x: number; y: number } {
  if (!(scale > 0)) return { x: 12, y: 78 };
  return sunArcXY(((labelPx - offsetX) / scale - 12) / 236);
}

/**
 * Titik pada busur untuk x viewBox tertentu — kebalikan `sunArcXY` pada sumbu x.
 * Dipakai matahari, yang x-nya diinterpolasi antar-dot, bukan diturunkan dari waktu.
 */
export function arcPointForViewX(viewX: number): { x: number; y: number } {
  return sunArcXY((viewX - 12) / 236);
}

/**
 * Posisi matahari di antara dua dot salat yang mengapitnya.
 *
 * Dot sudah digeser ke posisi label oleh `spreadLabelPositions`, jadi memakai posisi waktu
 * mentah membuat matahari berdiri di kanan dot aktifnya (setelah Ashar tampak sudah lewat
 * Maghrib). Di sini posisi waktu hanya dipakai sebagai rasio di dalam segmen antar-dot.
 */
export function arcPointBetweenDots(
  nowFraction: number,
  prevFraction: number,
  nextFraction: number,
  prevDotX: number,
  nextDotX: number
): { x: number; y: number } {
  const span = nextFraction - prevFraction;
  const local = span > 0 ? Math.min(1, Math.max(0, (nowFraction - prevFraction) / span)) : 0;
  return arcPointForViewX(prevDotX + (nextDotX - prevDotX) * local);
}

/** Lebar kotak label jam di bawah busur. 5 kotak harus muat dalam panel. */
export const LABEL_WIDTH = 46;

/**
 * Geser posisi label supaya tidak bertumpuk, tanpa mengubah urutannya.
 *
 * Salat di Indonesia berdesakan di ujung hari (Maghrib ke Isya cuma 1j12m), jadi label yang
 * ditempel tepat di bawah titiknya selalu saling menimpa: dibutuhkan kartu ~1034px agar
 * kelima kotak 56px muat. Karena itu label didorong ke KIRI sampai berjarak minimal satu
 * kotak. Sapuan kanan-ke-kiri dulu (supaya hanya label yang berdesakan yang bergeser dan
 * arahnya selalu ke kiri), lalu dijepit agar tidak keluar panel.
 */
export function spreadLabelPositions(markerPx: number[], panelWidth: number): number[] {
  if (markerPx.length === 0) return [];

  const half = LABEL_WIDTH / 2;
  const last = markerPx.length - 1;
  const out = markerPx.slice();

  out[last] = Math.min(out[last], panelWidth - half);
  for (let i = last - 1; i >= 0; i -= 1) {
    out[i] = Math.min(out[i], out[i + 1] - LABEL_WIDTH);
  }

  out[0] = Math.max(out[0], half);
  for (let i = 1; i <= last; i += 1) {
    out[i] = Math.max(out[i], out[i - 1] + LABEL_WIDTH);
  }

  const min = Math.min(half, panelWidth / 2);
  const max = Math.max(min, panelWidth - half);
  return out.map((x) => Math.min(Math.max(x, min), max));
}

export const GRACE_MIN = 5;
export const BANNER_MS = 20_000;

const FIRED_KEY = "boring-notch-prayer-fired";

interface FiredState {
  date: string;
  fired: PrayerKey[];
}

/** Salat yang hari ini sudah ditampilkan, dikosongkan otomatis saat tanggal lokasi berganti. */
export function loadFired(dateKey: string): PrayerKey[] {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FiredState;
    if (parsed?.date !== dateKey || !Array.isArray(parsed.fired)) return [];
    return parsed.fired.filter((key): key is PrayerKey => PRAYER_ORDER.includes(key));
  } catch {
    return [];
  }
}

export function saveFired(dateKey: string, fired: PrayerKey[]): void {
  try {
    const state: FiredState = { date: dateKey, fired };
    localStorage.setItem(FIRED_KEY, JSON.stringify(state));
  } catch {}
}

export interface DueResult {
  /** Salat yang waktunya baru masuk dan banner-nya perlu ditampilkan. */
  due: PrayerKey | null;
  /** Salat yang sudah lewat jendela grace: ditandai selesai tanpa banner, tidak ada susulan. */
  expired: PrayerKey[];
}

/**
 * Salat yang waktunya baru masuk dalam jendela grace, sekali saja per hari.
 * `due` sengaja tidak ikut ditandai selesai di sini: penanda ditulis pemanggil hanya setelah
 * banner benar-benar tampil, supaya reminder tidak hilang saat notch sedang expanded.
 */
export function resolveDue(nowMin: number, times: PrayerTimes, fired: PrayerKey[]): DueResult {
  const due =
    PRAYER_ORDER.find((key) => {
      const at = parseHHMM(times[key]);
      return !fired.includes(key) && nowMin >= at && nowMin - at <= GRACE_MIN;
    }) ?? null;

  const expired = PRAYER_ORDER.filter((key) => {
    if (fired.includes(key) || key === due) return false;
    return nowMin - parseHHMM(times[key]) > GRACE_MIN;
  });

  return { due, expired };
}
