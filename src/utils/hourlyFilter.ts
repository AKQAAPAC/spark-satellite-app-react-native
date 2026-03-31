/** Filter hourly forecast by date (today from now, or selected day). */
import type { HourForecast } from '../types/weather';

export function remainingHoursToday(
  hours: HourForecast[],
  apiTodayDate?: string | null
): HourForecast[] {
  const todayStr = apiTodayDate ?? new Date().toISOString().slice(0, 10);
  const now = new Date();
  const startOfCurrentHour = new Date(now);
  startOfCurrentHour.setMinutes(0, 0, 0);
  return hours
    .filter((h) => h.time.startsWith(todayStr))
    .filter((h) => {
      const d = new Date(h.time);
      return d >= startOfCurrentHour;
    });
}

export function hoursForDate(dateStr: string, hours: HourForecast[]): HourForecast[] {
  const prefix = dateStr + 'T';
  return hours
    .filter((h) => h.time.startsWith(prefix))
    .sort((a, b) => a.time.localeCompare(b.time));
}
