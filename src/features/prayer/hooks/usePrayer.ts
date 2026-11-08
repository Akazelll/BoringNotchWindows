import { useCallback, useEffect, useRef, useState } from "react";
import {
  BANNER_MS,
  GRACE_MIN,
  arcFraction,
  loadFired,
  nextPrayerIndex,
  parseHHMM,
  prevPrayerIndex,
  resolveDue,
  saveFired,
  zoneWallClock,
  PRAYER_ORDER,
  type PrayerKey,
  type PrayerTimes,
} from "../lib/prayerTimes";
import {
  LOCATION_TTL_MS,
  detectLocation,
  loadLocation,
  saveLocation,
  type PrayerLocation,
} from "../services/locationService";
import { dayCacheKey, fetchTimings, loadCachedDay } from "../services/aladhanService";

const TICK_MS = 20_000;
const RETRY_BACKOFF_MS = 5 * 60_000;

export interface PrayerBannerState {
  key: PrayerKey;
  time: string;
}

export type PrayerController = ReturnType<typeof usePrayer>;

/**
 * `isExpanded` hanya dipakai sebagai pemicu: banner cuma bisa dirender di state compact,
 * jadi saat notch sedang dibuka ticker menahan diri dan menjalankan ulang begitu notch menutup.
 */
export function usePrayer(isExpanded: boolean = false) {
  const [location, setLocationState] = useState<PrayerLocation | null>(() => loadLocation());
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [timeZone, setTimeZone] = useState<string>(() => loadLocation()?.timeZone ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [nowMinutes, setNowMinutes] = useState<number>(0);
  const [dateKey, setDateKey] = useState<string>("");
  const [banner, setBanner] = useState<PrayerBannerState | null>(null);

  const retryAfterRef = useRef<number>(0);
  const bannerTimerRef = useRef<number | null>(null);
  const bannerRef = useRef<PrayerBannerState | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  bannerRef.current = banner;

  // Lokasi: cache dipakai langsung selama masih segar, lalu dideteksi ulang saat kedaluwarsa.
  // Sebelumnya cukup `if (location) return;`, sehingga lokasi yang tersimpan sekali dipakai
  // selamanya walau perangkat sudah pindah.
  useEffect(() => {
    if (location && Date.now() - location.detectedAt < LOCATION_TTL_MS) return;

    let cancelled = false;
    detectLocation()
      .then((detected) => {
        if (cancelled) return;
        const saved = saveLocation(detected);
        setLocationState(saved);
        setTimeZone(saved.timeZone);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // Lokasi lama yang kedaluwarsa tetap dipakai: gagal deteksi saat offline tidak boleh
        // mengosongkan jadwal yang sudah tampil.
        if (location) return;
        setError(err.message || "Lokasi tidak terdeteksi");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, retryNonce]);

  // Jadwal harian: satu fetch per hari koordinat, sisanya dari cache localStorage.
  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    const zone = location.timeZone;
    const wall = zoneWallClock(Date.now(), zone);
    const expectedKey = dayCacheKey(wall.dateKey, location.latitude, location.longitude);

    const cached = loadCachedDay();
    if (cached && cached.key === expectedKey) {
      setTimes(cached.times);
      setTimeZone(cached.timeZone || zone);
      setIsStale(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (Date.now() < retryAfterRef.current) return;

    setIsLoading(true);
    fetchTimings(location.latitude, location.longitude, wall.dateKey)
      .then((day) => {
        if (cancelled) return;
        setTimes(day.times);
        setTimeZone(day.timeZone || zone);
        setIsStale(false);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        retryAfterRef.current = Date.now() + RETRY_BACKOFF_MS;
        if (cached) {
          setTimes(cached.times);
          setTimeZone(cached.timeZone || zone);
          setIsStale(true);
        }
        setError(err.message || "Gagal memuat jadwal salat");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, dateKey, retryNonce]);

  // Ticker 20 detik: jadwal bergranularitas menit, jadi keterlambatan maksimum 20 detik.
  // Murni frontend karena hanya butuh Date.now() dan data yang sudah ada di webview.
  //
  // Penanda "sudah dipicu" ditulis di sini, tepat saat banner dirender. Salat yang jendelanya
  // lewat (expired) ditandai selesai tanpa banner supaya tidak muncul susulan saat aplikasi
  // baru dibuka di tengah hari.
  useEffect(() => {
    if (!times || !timeZone) return;

    const tick = () => {
      const wall = zoneWallClock(Date.now(), timeZone);
      setDateKey((prev) => (prev === wall.dateKey ? prev : wall.dateKey));
      setNowMinutes(wall.minutes);

      const firedToday = loadFired(wall.dateKey);
      const { due, expired } = resolveDue(wall.minutes, times, firedToday);

      if (expired.length > 0) saveFired(wall.dateKey, [...new Set([...firedToday, ...expired])]);

      // Banner tidak bisa tampil saat notch expanded, jadi salat yang masih dalam jendela grace
      // ditahan sampai notch menutup (efek di atas dijalankan ulang karena `isExpanded`).
      if (!due || bannerRef.current || isExpanded) return;

      saveFired(wall.dateKey, [...new Set([...firedToday, ...expired, due])]);
      setBanner({ key: due, time: times[due] });
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = window.setTimeout(() => {
        setBanner(null);
        bannerTimerRef.current = null;
      }, BANNER_MS);
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [times, timeZone, isExpanded]);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setBanner(null);
  }, []);

  const retry = useCallback(() => {
    retryAfterRef.current = 0;
    setRetryNonce((n) => n + 1);
  }, []);

  const nextIndex = times ? nextPrayerIndex(times, nowMinutes) : 0;
  const prevIndex = times ? prevPrayerIndex(times, nowMinutes) : 0;
  const nextKey = PRAYER_ORDER[nextIndex];
  const prevKey = PRAYER_ORDER[prevIndex];

  const next = times
    ? {
        key: nextKey,
        time: times[nextKey],
        minutesLeft: Math.max(0, parseHHMM(times[nextKey]) - nowMinutes),
        prevKey,
        arcFraction: arcFraction(nowMinutes, times),
      }
    : null;

  return {
    location,
    timeZone,
    times,
    isLoading,
    isStale,
    error,
    dateKey,
    graceMinutes: GRACE_MIN,
    next,
    banner,
    isPrayerBannerActive: banner !== null,
    dismissBanner,
    retry,
  };
}
