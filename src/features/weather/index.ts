export { useWeather, type WeatherController } from "./hooks/useWeather";
export type {
  WeatherData,
  CurrentWeather,
  HourlySlotData,
  DailyWeather,
} from "./services/weatherService";
export {
  getWeatherMeta,
  windDirectionId,
  uvIndexLabel,
  type WeatherIconKind,
} from "./lib/weatherCode";
export {
  processHourlyForecast,
  type ProcessedHourly,
  type DisplaySlot,
  type CurvePoint,
} from "./lib/hourlySlots";
