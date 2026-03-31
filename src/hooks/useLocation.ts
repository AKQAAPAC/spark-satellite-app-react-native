/**
 * Expo Location: last known → high accuracy + 10s timeout → 500ms → last known again
 * (ordering aligned with native Android `LocationHelper.kt` intent).
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

const LOCATION_TIMEOUT_MS = 10_000;
const FRESH_FIX_ACCURACY = Location.Accuracy.Highest;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('location_timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function formatPlaceName(rev: Location.LocationGeocodedAddress): string | null {
  const district = rev.district?.trim() || null;
  const city = rev.city?.trim() || null;
  const region = rev.region?.trim() || null;
  const parts: string[] = [];
  if (district && district !== city) parts.push(district);
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (parts.length > 0) return parts.join(', ');
  return rev.name ?? district ?? city ?? region ?? null;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  coords: LocationCoords | null;
  placeName: string | null;
  loading: boolean;
  noLocation: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    placeName: null,
    loading: false,
    noLocation: false,
  });

  const commitCoords = (latitude: number, longitude: number) => {
    setState((s) => ({
      ...s,
      coords: { latitude, longitude },
      loading: false,
      noLocation: false,
    }));
    void Location.reverseGeocodeAsync({ latitude, longitude })
      .then((revList) => {
        const rev = revList?.[0];
        const placeName = rev ? formatPlaceName(rev) : null;
        setState((s) => ({ ...s, placeName }));
      })
      .catch(() => {});
    return { latitude, longitude };
  };

  const requestLocation = useCallback(async (forceRefresh = false) => {
    setState((s) => ({ ...s, loading: true, noLocation: false }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({
          ...s,
          loading: false,
          noLocation: true,
          coords: null,
          placeName: null,
        }));
        return null;
      }

      if (!forceRefresh) {
        const last = await Location.getLastKnownPositionAsync();
        if (last != null) {
          const { latitude, longitude } = last.coords;
          return commitCoords(latitude, longitude);
        }
      }

      try {
        const location = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: FRESH_FIX_ACCURACY,
          }),
          LOCATION_TIMEOUT_MS
        );
        const { latitude, longitude } = location.coords;
        return commitCoords(latitude, longitude);
      } catch {
        // Timeout or error — brief wait then last known again.
      }

      await delay(500);
      const lastAgain = await Location.getLastKnownPositionAsync();
      if (lastAgain != null) {
        const { latitude, longitude } = lastAgain.coords;
        return commitCoords(latitude, longitude);
      }

      setState((s) => ({ ...s, loading: false, noLocation: false }));
      return null;
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        noLocation: false,
      }));
      return null;
    }
  }, []);

  return { ...state, requestLocation };
}
