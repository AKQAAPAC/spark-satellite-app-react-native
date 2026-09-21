/** Horizontal hourly forecast strip with time, icon, temp, precip %, wind. */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { HourForecast } from '../types/weather';
import { hourLabel } from '../utils/weatherCode';
import { WeatherIcon } from './WeatherIcon';
import { useSparkAppearance } from '../theme';
import { SparkTheme } from '../theme/SparkTheme';

interface HourlyStripProps {
  hours: HourForecast[];
  isToday: boolean;
}

export function HourlyStrip({ hours, isToday }: HourlyStripProps) {
  const { colors } = useSparkAppearance();

  if (hours.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {hours.map((hour, index) => {
        const isNow = isToday && index === 0;
        return (
          <View
            key={hour.time}
            style={[
              styles.tile,
              {
                backgroundColor: colors.bgPlan,
                borderRadius: SparkTheme.Radius.sm,
              },
            ]}
          >
            {isNow ? (
              <View
                style={[
                  styles.nowOverlay,
                  {
                    backgroundColor: colors.selectedFill,
                    borderRadius: SparkTheme.Radius.sm,
                  },
                ]}
              />
            ) : null}
            <Text
              style={[
                styles.hourText,
                SparkTheme.Typography.caption,
                { color: colors.textInverse, opacity: 0.9 },
              ]}
            >
              {isNow ? 'Now' : hourLabel(hour.time)}
            </Text>
            <View style={styles.iconWrap}>
              <WeatherIcon code={hour.weatherCode} size={18} color={colors.textOnDark} />
            </View>
            <Text style={[styles.temp, SparkTheme.Typography.planLabel, { color: colors.textOnDark }]}>
              {Math.round(hour.temperature)}°
            </Text>
            {hour.precipitationProbability != null && (
              <Text
                style={[
                  styles.precip,
                  SparkTheme.Typography.micro,
                  { color: colors.textInverse, opacity: 0.8 },
                ]}
              >
                {hour.precipitationProbability}%
              </Text>
            )}
            {hour.windSpeed10m != null && (
              <Text
                style={[
                  styles.wind,
                  SparkTheme.Typography.micro,
                  { color: colors.textInverse, opacity: 0.8 },
                ]}
                numberOfLines={1}
              >
                {Math.round(hour.windSpeed10m)} km/h
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SparkTheme.Spacing.sm,
    paddingHorizontal: SparkTheme.Spacing.lg,
  },
  tile: {
    width: 62,
    paddingVertical: SparkTheme.Spacing.sm,
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  nowOverlay: {
    ...StyleSheet.absoluteFill,
  },
  hourText: {},
  iconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  temp: {},
  precip: {},
  wind: {
    maxWidth: 58,
  },
});
