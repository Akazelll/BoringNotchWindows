import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchWeather,
  loadCachedWeather,
  WEATHER_TTL_MS,
  type WeatherData,
} from "../services/weatherService";
import {
  detectLocation,
  loadLocation,
  saveLocation,
  LOCATION_TTL_MS,
  type PrayerLocation,
} from "../../prayer/services/locationService";
import { processHourlyForecast, type ProcessedHourly } from "../lib/hourlySlots";

const REFRESH_INTERVAL_MS = 20 * 60_000; // Cek pembaruan tiap 20 menit
const RETRY_BACKOFF_MS = 5 * 60_000;

export interface WeatherController {
  data: WeatherData | null;
  processed: ProcessedHourly | null;
  location: PrayerLocation | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  retry: () => void;
}

export function useWeather(_isExpanded: boolean = false): WeatherController {
  const [location, setLocationState] = useState<PrayerLocation | null>(() => loadLocation());
  const [data, setData] = useState<WeatherData | null>(() => {
    const loc = loadLocation();
    return loc ? loadCachedWeather(loc.latitude, loc.longitude) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const retryAfterRef = useRef<number>(0);

  // 1. Sinkronisasi lokasi (memakai service lokasi yang sudah ada)
  useEffect(() => {
    if (location && Date.now() - location.detectedAt < LOCATION_TTL_MS) return;

    let cancelled = false;
    detectLocation()
      .then((detected) => {
        if (cancelled) return;
        const saved = saveLocation(detected);
        setLocationState(saved);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (location) return; // Jika sudah ada cache lokasi lama, jangan hapus
        setError(err.message || "Lokasi tidak terdeteksi");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, retryNonce]);

  // 2. Fetch data cuaca dari Open-Meteo
  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    const { latitude, longitude } = location;

    const cached = loadCachedWeather(latitude, longitude);
    const isFresh = cached && Date.now() - cached.fetchedAt < WEATHER_TTL_MS;

    if (isFresh) {
      setData(cached);
      setIsStale(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (Date.now() < retryAfterRef.current) {
      if (cached) {
        setData(cached);
        setIsStale(true);
      }
      return;
    }

    setIsLoading(true);
    fetchWeather(latitude, longitude)
      .then((weather) => {
        if (cancelled) return;
        setData(weather);
        setIsStale(false);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        retryAfterRef.current = Date.now() + RETRY_BACKOFF_MS;
        if (cached) {
          setData(cached);
          setIsStale(true);
        }
        setError(err.message || "Gagal memuat data cuaca");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, retryNonce]);

  // 3. Polling interval tiap 20 menit saat aplikasi berjalan
  useEffect(() => {
    const timer = setInterval(() => {
      setRetryNonce((n) => n + 1);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const retry = useCallback(() => {
    retryAfterRef.current = 0;
    setRetryNonce((n) => n + 1);
  }, []);

  const processed = data
    ? processHourlyForecast(data.hourly, data.timeZone, Date.now())
    : null;

  return {
    data,
    processed,
    location,
    isLoading,
    isStale,
    error,
    retry,
  };
}
