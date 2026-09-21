/** Main screen: connectivity, location, weather, hourly strip, rain map. */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectivity } from '../connectivity';
import { StatusBar } from '../components/StatusBar';
import { WeatherCard } from '../components/WeatherCard';
import { HourlyStrip } from '../components/HourlyStrip';
import { RainMapSection } from '../components/RainMapSection';
import { ThemeToggle } from '../components/ThemeToggle';
import { useLocation } from '../hooks/useLocation';
import { fetchWeather } from '../api';
import type { CurrentWeather, DayForecast, HourForecast } from '../types/weather';
import { remainingHoursToday, hoursForDate } from '../utils/hourlyFilter';
import { useSparkAppearance } from '../theme';
import { planCardStyle, SparkTheme } from '../theme/SparkTheme';

/** Cap for location step; slow GNSS (e.g. satellite) can exceed Expo’s internal timeouts. */
const LOCATION_STEP_MS = 60_000;

export function WeatherScreen() {
  const { colors } = useSparkAppearance();
  const connectivity = useConnectivity();
  const { coords, placeName, noLocation, requestLocation } = useLocation();
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [daily, setDaily] = useState<DayForecast[]>([]);
  const [hourly, setHourly] = useState<HourForecast[]>([]);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherErrorKind, setWeatherErrorKind] = useState<'location' | 'network' | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayDate = daily[0]?.date ?? null;
  const isShowingToday = !selectedDate || selectedDate === todayDate;
  const selectedDay = useMemo(() => {
    const date = selectedDate ?? todayDate;
    if (!date) return null;
    return daily.find((d) => d.date === date) ?? null;
  }, [daily, selectedDate, todayDate]);

  const displayHours = useMemo(() => {
    if (isShowingToday) return remainingHoursToday(hourly, todayDate);
    if (selectedDate) return hoursForDate(selectedDate, hourly);
    return [];
  }, [hourly, isShowingToday, selectedDate, todayDate]);

  const dayPrecipRange = useMemo(() => {
    const values = displayHours.map((h) => h.precipitationProbability).filter((n): n is number => n != null);
    if (values.length === 0) return { low: null, high: null };
    return { low: Math.min(...values), high: Math.max(...values) };
  }, [displayHours]);

  const dayWindRange = useMemo(() => {
    const values = displayHours.map((h) => h.windSpeed10m).filter((n): n is number => n != null);
    if (values.length === 0) return { low: null, high: null };
    return { low: Math.min(...values), high: Math.max(...values) };
  }, [displayHours]);

  const requestInFlightRef = useRef(false);
  const didInitialLoadRef = useRef(false);

  const requestWeather = useCallback(async (forceRefreshLocation = false) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setWeatherLoading(true);
    setWeatherError(false);
    setWeatherErrorKind(null);

    try {
      let loc: Awaited<ReturnType<typeof requestLocation>>;
      try {
        loc = await Promise.race([
          requestLocation(forceRefreshLocation),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('location_timeout')), LOCATION_STEP_MS)
          ),
        ]);
      } catch {
        loc = null;
      }

      const latLng = loc ?? coordsRef.current;

      if (!latLng) {
        setCurrent(null);
        setDaily([]);
        setHourly([]);
        setLastFetchAt(null);
        setWeatherErrorKind('location');
        setWeatherError(true);
        return;
      }

      const result = await fetchWeather(latLng.latitude, latLng.longitude);
      setCurrent(result.current);
      setDaily(result.daily);
      setHourly(result.hourly);
      setSelectedDate(null);
      setLastFetchAt(new Date());
    } catch {
      setWeatherErrorKind('network');
      setWeatherError(true);
      setCurrent(null);
      setDaily([]);
      setHourly([]);
      setSelectedDate(null);
      setLastFetchAt(null);
    } finally {
      setWeatherLoading(false);
      requestInFlightRef.current = false;
    }
  }, [requestLocation]);

  const requestWeatherRef = useRef(requestWeather);
  requestWeatherRef.current = requestWeather;

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    void requestWeatherRef.current(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- single mount load
  }, []);

  const showSpinner = weatherLoading;
  const showLocationPrompt = noLocation && !weatherLoading;
  const neverLoaded = lastFetchAt === null && !weatherError && !weatherLoading;
  const onRefresh = useCallback(() => {
    requestWeather(false);
  }, [requestWeather]);

  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgCanvas },
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StatusBar connectivity={connectivity} lastFetchAt={lastFetchAt} onRefresh={onRefresh} />
        {showSpinner ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.ctaCyan} />
          </View>
        ) : showLocationPrompt ? (
          <View style={[styles.locationPrompt, planCardStyle(colors)]}>
            <Text style={[styles.locationPromptText, SparkTheme.Typography.body, { color: colors.textOnDark }]}>
              Location access was denied or unavailable. Open Settings to allow location, then tap Refresh.
            </Text>
            <Pressable
              style={[styles.openSettingsButton, { backgroundColor: colors.ctaCyan }]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={[styles.openSettingsButtonText, SparkTheme.Typography.planLabel, { color: colors.bgBrand }]}>
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WeatherCard
              daily={daily}
              selectedDate={selectedDate ?? todayDate}
              selectedDay={selectedDay}
              current={current}
              placeName={placeName}
              precipitationRange={dayPrecipRange}
              windRange={dayWindRange}
              noLocation={noLocation}
              error={weatherError}
              errorKind={weatherErrorKind}
              neverLoaded={neverLoaded}
              onSelectDay={setSelectedDate}
            />
            {!weatherError && connectivity === 'none' ? (
              <Text
                style={[
                  styles.noConnection,
                  SparkTheme.Typography.body,
                  { color: colors.textInverse, opacity: 0.85 },
                ]}
              >
                No connection.
              </Text>
            ) : !weatherError ? (
              <HourlyStrip hours={displayHours} isToday={isShowingToday} />
            ) : null}
            <RainMapSection
              connectivity={connectivity}
              latitude={coords?.latitude ?? null}
              longitude={coords?.longitude ?? null}
              noLocation={noLocation}
            />
          </>
        )}
        <ThemeToggle />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SparkTheme.Spacing.sm,
    paddingBottom: SparkTheme.Spacing.md,
    gap: SparkTheme.Spacing.sm,
  },
  loading: {
    padding: SparkTheme.Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrompt: {
    marginHorizontal: SparkTheme.Spacing.lg,
    alignItems: 'center',
  },
  locationPromptText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  openSettingsButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SparkTheme.Radius.sm,
  },
  openSettingsButtonText: {},
  noConnection: {
    textAlign: 'center',
    paddingVertical: SparkTheme.Spacing.md,
  },
});
