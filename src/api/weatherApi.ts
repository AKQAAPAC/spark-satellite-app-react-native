/**
 * Weather from Open-Meteo (no API key). https://open-meteo.com/
 */
import { Platform } from 'react-native';
import type { CurrentWeather, DayForecast, HourForecast } from '../types/weather';
import { fetchJsonWithTimeout } from './fetchWithTimeout';

/** Same as SparkSatelliteWeather-Android `NetworkModule` OkHttp connect/read timeouts (30s each). */
const WEATHER_TIMEOUT_MS = 30_000;

const USER_AGENT = `SparkSatelliteWeather/1.0 (${Platform.OS === 'ios' ? 'iOS' : 'Android'})`;

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability?: (number | null)[];
  wind_speed_10m?: (number | null)[];
}

interface OpenMeteoPayload {
  error?: boolean;
  current?: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m?: number;
    time: string;
  };
  daily?: OpenMeteoDaily;
  hourly?: OpenMeteoHourly;
}

function toDayForecasts(daily: OpenMeteoDaily): DayForecast[] {
  const { time, temperature_2m_max, temperature_2m_min, weather_code } = daily;
  const n = Math.min(time.length, temperature_2m_max.length, temperature_2m_min.length, weather_code.length);
  const list = Array.from({ length: n }, (_, i) => ({
    date: time[i],
    maxTemp: temperature_2m_max[i],
    minTemp: temperature_2m_min[i],
    weatherCode: weather_code[i],
  }));
  const today = new Date().toISOString().slice(0, 10);
  const idx = list.findIndex((d) => d.date === today);
  if (idx <= 0) return list;
  return [...list.slice(idx), ...list.slice(0, idx)];
}

function toHourForecasts(hourly: OpenMeteoHourly): HourForecast[] {
  const { time, temperature_2m, weather_code, precipitation_probability, wind_speed_10m } = hourly;
  const precip = precipitation_probability ?? [];
  const wind = wind_speed_10m ?? [];
  const n = Math.min(time.length, temperature_2m.length, weather_code.length);
  return Array.from({ length: n }, (_, i) => ({
    time: time[i],
    temperature: temperature_2m[i],
    weatherCode: weather_code[i],
    precipitationProbability: precip[i] ?? undefined,
    windSpeed10m: wind[i] ?? undefined,
  }));
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  options?: { timeoutMs?: number }
): Promise<{ current: CurrentWeather; daily: DayForecast[]; hourly: HourForecast[] }> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m',
    timezone: 'auto',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const data = await fetchJsonWithTimeout<OpenMeteoPayload>(url, {
    timeoutMs: options?.timeoutMs ?? WEATHER_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT },
  });

  const current = data.current;
  if (data.error === true || current == null) {
    throw new Error('Weather unavailable');
  }

  return {
    current: {
      time: current.time,
      temperature2m: current.temperature_2m,
      weatherCode: current.weather_code,
      windSpeed10m: current.wind_speed_10m,
    },
    daily: data.daily ? toDayForecasts(data.daily) : [],
    hourly: data.hourly ? toHourForecasts(data.hourly) : [],
  };
}
