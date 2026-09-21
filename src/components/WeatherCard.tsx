/** Daily forecast list + selected day details and current conditions. */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import type { DayForecast, CurrentWeather } from '../types/weather';
import { dayLabel } from '../utils/weatherCode';
import { WeatherIcon } from './WeatherIcon';
import { useSparkAppearance } from '../theme';
import { planCardStyle, SparkTheme } from '../theme/SparkTheme';

interface WeatherCardProps {
  daily: DayForecast[];
  selectedDate: string | null;
  selectedDay: DayForecast | null;
  current: CurrentWeather | null;
  placeName: string | null;
  precipitationRange?: { low: number; high: number } | { low: null; high: null };
  windRange?: { low: number; high: number } | { low: null; high: null };
  noLocation: boolean;
  error: boolean;
  errorKind?: 'location' | 'network' | null;
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
  const { colors } = useSparkAppearance();
  const todayDate = daily[0]?.date ?? '';
  const isToday = !selectedDate || selectedDate === todayDate;
  const displayTemp = isToday && current ? current.temperature2m : selectedDay?.maxTemp ?? 0;

  const cardStyle = [styles.card, planCardStyle(colors)];

  if (noLocation) {
    return (
      <View style={cardStyle}>
        <Text style={[styles.placeholderText, SparkTheme.Typography.body, { color: colors.textOnDark }]}>
          No location found
        </Text>
      </View>
    );
  }
  if (neverLoaded) {
    return (
      <View style={[cardStyle, styles.loadingCard]}>
        <ActivityIndicator size="large" color={colors.ctaCyan} />
      </View>
    );
  }
  if (error) {
    const message = errorKind === 'location' ? 'No location found' : 'Unable to load weather';
    return (
      <View style={cardStyle}>
        <Text style={[styles.placeholderText, SparkTheme.Typography.body, { color: colors.textOnDark }]}>
          {message}
        </Text>
      </View>
    );
  }
  if (!selectedDay) {
    return null;
  }

  return (
    <View style={cardStyle}>
      <View style={styles.row}>
        <View style={styles.dayList}>
          {daily.map((day) => {
            const isSelected =
              selectedDate === day.date || (!selectedDate && day.date === todayDate);
            return (
              <Pressable
                key={day.date}
                style={[
                  styles.dayRow,
                  isSelected && { backgroundColor: colors.selectedFill, borderRadius: SparkTheme.Spacing.sm },
                ]}
                onPress={() => onSelectDay(day.date)}
              >
                <Text
                  style={[
                    styles.dayName,
                    SparkTheme.Typography.sectionDesc,
                    { color: colors.textInverse, opacity: 0.9 },
                  ]}
                >
                  {dayLabel(day.date)}
                </Text>
                <View style={styles.dayIcon}>
                  <WeatherIcon code={day.weatherCode} size={14} color={colors.textOnDark} />
                </View>
                <Text
                  style={[
                    styles.dayTemp,
                    SparkTheme.Typography.caption,
                    { color: colors.textInverse, fontWeight: '600' },
                  ]}
                >
                  {Math.round(day.minTemp)}°–{Math.round(day.maxTemp)}°
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.details}>
          <Text
            style={[styles.placeName, SparkTheme.Typography.body, { color: colors.textOnDark }]}
            numberOfLines={2}
          >
            {placeName ?? 'Current location'}
          </Text>
          <View style={styles.bigIcon}>
            <WeatherIcon code={selectedDay.weatherCode} size={28} color={colors.textOnDark} />
          </View>
          <Text style={[styles.bigTemp, SparkTheme.Typography.display, { color: colors.textOnDark }]}>
            {Math.round(displayTemp)}°
          </Text>
          <Text style={[styles.meta, SparkTheme.Typography.sectionDesc, { color: colors.textInverse, opacity: 0.85 }]}>
            Low {Math.round(selectedDay.minTemp)}° · High {Math.round(selectedDay.maxTemp)}°
          </Text>
          {precipitationRange && precipitationRange.low != null && precipitationRange.high != null && (
            <Text style={[styles.meta, SparkTheme.Typography.sectionDesc, { color: colors.textInverse, opacity: 0.85 }]}>
              {precipitationRange.low === precipitationRange.high
                ? `${precipitationRange.low}% precipitation`
                : `Precip ${precipitationRange.low}–${precipitationRange.high}%`}
            </Text>
          )}
          {windRange && windRange.low != null && windRange.high != null && (
            <Text style={[styles.meta, SparkTheme.Typography.sectionDesc, { color: colors.textInverse, opacity: 0.85 }]}>
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

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SparkTheme.Spacing.lg,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SparkTheme.Spacing.sm,
  },
  dayList: {
    flex: 1,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: SparkTheme.Spacing.sm,
    paddingVertical: 4,
  },
  dayName: {
    flexShrink: 0,
  },
  dayIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTemp: {
    flex: 1,
    textAlign: 'right',
  },
  details: {
    width: 128,
    alignItems: 'flex-end',
  },
  placeName: {
    marginBottom: SparkTheme.Spacing.xs,
    textAlign: 'right',
  },
  bigIcon: {
    marginBottom: SparkTheme.Spacing.xs,
  },
  bigTemp: {
    marginBottom: 2,
  },
  meta: {
    marginTop: 2,
    textAlign: 'right',
  },
  placeholderText: {
    textAlign: 'center',
  },
});
