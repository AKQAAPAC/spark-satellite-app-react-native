/** Daily forecast list + selected day details and current conditions. */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import type { DayForecast, CurrentWeather } from '../types/weather';
import { dayLabel } from '../utils/weatherCode';
import { WeatherIcon } from './WeatherIcon';

const styles = StyleSheet.create({
  card: {
    minHeight: 150,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dayList: {
    flex: 1,
    marginRight: 20,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 2,
    borderRadius: 8,
    minHeight: 24,
  },
  dayRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dayNameAndIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    width: 40,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  dayIcon: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTemp: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  details: {
    flex: 1,
    alignItems: 'flex-end',
  },
  placeName: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textAlign: 'right',
  },
  bigIcon: {
    marginBottom: 8,
  },
  bigTemp: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  placeholder: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
});

interface WeatherCardProps {
  daily: DayForecast[];
  selectedDate: string | null;
  selectedDay: DayForecast | null;
  current: CurrentWeather | null;
  placeName: string | null;
  /** Precipitation % range for the day (low–high from hourly), matches temp High/Low. */
  precipitationRange?: { low: number; high: number } | { low: null; high: null };
  /** Wind km/h range for the day (low–high from hourly), matches temp High/Low. */
  windRange?: { low: number; high: number } | { low: null; high: null };
  noLocation: boolean;
  error: boolean;
  errorKind?: 'location' | 'network' | null;
  /** No successful weather fetch yet (spinner covers the in-flight case). */
  neverLoaded: boolean;
  onSelectDay: (date: string) => void;
}

export function WeatherCard({
  daily,
  selectedDate,
  selectedDay,
  current,
  placeName,
  precipitationRange,
  windRange,
  noLocation,
  error,
  errorKind,
  neverLoaded,
  onSelectDay,
}: WeatherCardProps) {
  const todayDate = daily[0]?.date ?? '';
  const isToday = !selectedDate || selectedDate === todayDate;
  const displayTemp = isToday && current ? current.temperature2m : selectedDay?.maxTemp ?? 0;

  if (noLocation) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <Text style={styles.placeholderText}>No location found</Text>
      </View>
    );
  }
  if (neverLoaded) {
    return (
      <View style={[styles.card, styles.placeholder, { minHeight: 160 }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  if (error) {
    const message =
      errorKind === 'location' ? 'No location found' : 'Unable to load weather';
    return (
      <View style={[styles.card, styles.placeholder]}>
        <Text style={styles.placeholderText}>{message}</Text>
      </View>
    );
  }
  if (!selectedDay) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.dayList}>
          {daily.map((day) => {
            const isSelected =
              selectedDate === day.date || (!selectedDate && day.date === todayDate);
            return (
              <Pressable
                key={day.date}
                style={[styles.dayRow, isSelected && styles.dayRowSelected]}
                onPress={() => onSelectDay(day.date)}
              >
                <View style={styles.dayNameAndIcon}>
                  <Text style={styles.dayName}>{dayLabel(day.date)}</Text>
                  <View style={styles.dayIcon}>
                    <WeatherIcon code={day.weatherCode} size={16} />
                  </View>
                </View>
                <Text style={styles.dayTemp}>
                  {Math.round(day.maxTemp)}° / {Math.round(day.minTemp)}°
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.details}>
          <Text style={styles.placeName} numberOfLines={2}>
            {placeName ?? 'Current location'}
          </Text>
          <View style={styles.bigIcon}>
            <WeatherIcon code={selectedDay.weatherCode} size={36} />
          </View>
          <Text style={styles.bigTemp}>{Math.round(displayTemp)}°</Text>
          <Text style={styles.meta}>
            High {Math.round(selectedDay.maxTemp)}° · Low {Math.round(selectedDay.minTemp)}°
          </Text>
          {precipitationRange && precipitationRange.low != null && precipitationRange.high != null && (
            <Text style={styles.meta}>
              {precipitationRange.low === precipitationRange.high
                ? `${precipitationRange.low}% precipitation`
                : `Precip ${precipitationRange.low}–${precipitationRange.high}%`}
            </Text>
          )}
          {windRange && windRange.low != null && windRange.high != null && (
            <Text style={styles.meta}>
              {windRange.low === windRange.high
                ? `${Math.round(windRange.low)} km/h wind`
                : `Wind ${Math.round(windRange.low)}–${Math.round(windRange.high)} km/h`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
