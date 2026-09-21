/** Light/dark Spark appearance with persisted preference. */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SPARK_APPEARANCE_STORAGE_KEY,
  type SparkAppearance,
  type SparkColors,
  sparkColorsForAppearance,
} from './SparkTheme';

interface SparkAppearanceContextValue {
  appearance: SparkAppearance;
  colors: SparkColors;
  setAppearance: (appearance: SparkAppearance) => void;
}

const SparkAppearanceContext = createContext<SparkAppearanceContextValue | null>(null);

export function SparkAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<SparkAppearance>('dark');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SPARK_APPEARANCE_STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw === 'light' || raw === 'dark') {
          setAppearanceState(raw);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearance = useCallback((value: SparkAppearance) => {
    setAppearanceState(value);
    void AsyncStorage.setItem(SPARK_APPEARANCE_STORAGE_KEY, value);
  }, []);

  const colors = useMemo(() => sparkColorsForAppearance(appearance), [appearance]);

  const value = useMemo(
    () => ({ appearance, colors, setAppearance }),
    [appearance, colors, setAppearance]
  );

  return (
    <SparkAppearanceContext.Provider value={value}>{children}</SparkAppearanceContext.Provider>
  );
}

export function useSparkAppearance(): SparkAppearanceContextValue {
  const ctx = useContext(SparkAppearanceContext);
  if (!ctx) {
    throw new Error('useSparkAppearance must be used within SparkAppearanceProvider');
  }
  return ctx;
}
