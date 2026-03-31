/** Horizontal hourly forecast strip with time, icon, temp, precip %. */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { HourForecast } from '../types/weather';
import { hourLabel } from '../utils/weatherCode';
import { WeatherIcon } from './WeatherIcon';

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 12,
    minHeight: 120,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tile: {
    width: 56,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  hourText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    marginBottom: 4,
  },
  temp: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  precip: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  wind: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

interface HourlyStripProps {
  hours: HourForecast[];
  isToday: boolean;
}

export function HourlyStrip({ hours, isToday }: HourlyStripProps) {
  if (hours.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, styles.row]}
      >
          {hours.map((hour, index) => (
            <View key={hour.time} style={styles.tile}>
              <Text style={styles.hourText}>
                {isToday && index === 0 ? 'Now' : hourLabel(hour.time)}
              </Text>
              <View style={styles.iconWrap}>
                <WeatherIcon code={hour.weatherCode} size={22} />
              </View>
              <Text style={styles.temp}>{Math.round(hour.temperature)}°</Text>
              {hour.precipitationProbability != null && (
                <Text style={styles.precip}>{hour.precipitationProbability}%</Text>
              )}
              {hour.windSpeed10m != null && (
                <Text style={styles.wind}>{Math.round(hour.windSpeed10m)} km/h</Text>
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
