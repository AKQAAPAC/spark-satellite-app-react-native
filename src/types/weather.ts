/** Shared shape for Open-Meteo and Met.no parsers (WMO-style codes for icons). */
export interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

export interface HourForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability?: number;
  windSpeed10m?: number;
}

export interface CurrentWeather {
  time: string;
  temperature2m: number;
  weatherCode: number;
  windSpeed10m?: number;
}
