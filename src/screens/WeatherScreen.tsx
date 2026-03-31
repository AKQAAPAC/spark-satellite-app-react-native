/** Main screen: connectivity, location, weather, hourly strip, rain map. */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectivity } from '../connectivity';
import { StatusBar } from '../components/StatusBar';
import { WeatherCard } from '../components/WeatherCard';
import { HourlyStrip } from '../components/HourlyStrip';
import { RainMapSection } from '../components/RainMapSection';
import { useLocation } from '../hooks/useLocation';
import { fetchWeather } from '../api';
import type { CurrentWeather, DayForecast, HourForecast } from '../types/weather';
import { remainingHoursToday, hoursForDate } from '../utils/hourlyFilter';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#603494',
  },
  containerCards: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  loading: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrompt: {
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  locationPromptText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 12,
  },
  openSettingsButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  openSettingsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

/** Cap for location step; slow GNSS (e.g. satellite) can exceed Expo’s internal timeouts. */
const LOCATION_STEP_MS = 60_000;

export function WeatherScreen() {
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
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar connectivity={connectivity} lastFetchAt={lastFetchAt} onRefresh={onRefresh} />
      <View style={styles.containerCards}>
        {showSpinner ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : showLocationPrompt ? (
          <View style={styles.locationPrompt}>
            <Text style={styles.locationPromptText}>
              Location access was denied or unavailable. Open Settings to allow location, then tap Refresh.
            </Text>
            <Pressable style={styles.openSettingsButton} onPress={() => Linking.openSettings()}>
              <Text style={styles.openSettingsButtonText}>Open Settings</Text>
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
            {!weatherError && connectivity !== 'none' && (
              <HourlyStrip hours={displayHours} isToday={isShowingToday} />
            )}
            <RainMapSection
              connectivity={connectivity}
              latitude={coords?.latitude ?? null}
              longitude={coords?.longitude ?? null}
              noLocation={noLocation}
            />
          </>
        )}
      </View>
    </View>
  );
}
