import { fetchWithTimeout } from "../../prayer/services/http";

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  isDay: boolean;
}

export interface HourlySlotData {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  isDay: boolean;
  uvIndex: number;
}

export interface DailyWeather {
  sunrise: string;
  sunset: string;
  tempMax: number;
  tempMin: number;
  uvIndexMax: number;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlySlotData[];
  daily: DailyWeather;
  timeZone: string;
  fetchedAt: number;
}

const CACHE_KEY = "boring-notch-weather-cache";
export const WEATHER_TTL_MS = 15 * 60_000; // 15 menit

interface CachedPayload {
  key: string;
  data: WeatherData;
}

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function loadCachedWeather(lat: number, lon: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (parsed.key !== cacheKey(lat, lon)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveCachedWeather(lat: number, lon: number, data: WeatherData): void {
  try {
    const payload: CachedPayload = {
      key: cacheKey(lat, lon),
      data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

interface RawOpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    uv_index?: number[];
    is_day?: number[];
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    uv_index_max?: number[];
  };
  timezone?: string;
}

/**
 * Mengambil data prakiraan cuaca dari Open-Meteo.
 * Bebas API key, respon otomatis diselaraskan dengan timezone lokal.
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code,uv_index,is_day",
    daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max",
    timezone: "auto",
    forecast_days: "2",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetchWithTimeout(url, 7000);
  const json = (await res.json()) as RawOpenMeteoResponse;

  const current = json.current;
  const hourly = json.hourly;
  const daily = json.daily;

  if (!current || !hourly || !daily) {
    throw new Error("Data cuaca tidak lengkap dari penyedia");
  }

  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const rains = hourly.precipitation_probability || [];
  const codes = hourly.weather_code || [];
  const uvs = hourly.uv_index || [];
  const days = hourly.is_day || [];

  const hourlySlots: HourlySlotData[] = [];
  const len = Math.min(times.length, temps.length, rains.length, codes.length);
  for (let i = 0; i < len; i++) {
    hourlySlots.push({
      time: times[i] || "",
      temperature: Math.round(temps[i] ?? 0),
      precipitationProbability: Math.round(rains[i] ?? 0),
      weatherCode: codes[i] ?? 0,
      uvIndex: uvs[i] ?? 0,
      isDay: days[i] === 1,
    });
  }

  const data: WeatherData = {
    current: {
      temperature: Math.round(current.temperature_2m ?? 0),
      apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
      weatherCode: current.weather_code ?? 0,
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      windDirection: Math.round(current.wind_direction_10m ?? 0),
      isDay: current.is_day === 1,
    },
    hourly: hourlySlots,
    daily: {
      sunrise: daily.sunrise?.[0] || "",
      sunset: daily.sunset?.[0] || "",
      tempMax: Math.round(daily.temperature_2m_max?.[0] ?? current.temperature_2m ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[0] ?? current.temperature_2m ?? 0),
      uvIndexMax: Math.round(daily.uv_index_max?.[0] ?? 0),
    },
    timeZone: json.timezone || "Asia/Jakarta",
    fetchedAt: Date.now(),
  };

  saveCachedWeather(lat, lon, data);
  return data;
}
