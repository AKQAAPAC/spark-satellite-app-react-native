/** Spark tab-bar-style sun/moon theme toggle. */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSparkAppearance } from '../theme';
import { SparkTheme, type SparkAppearance } from '../theme/SparkTheme';

export function ThemeToggle() {
  const { appearance, colors, setAppearance } = useSparkAppearance();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, { backgroundColor: colors.bgBrand }]}>
        <ThemeTabItem
          value="light"
          symbol="sunny"
          isActive={appearance === 'light'}
          onPress={() => setAppearance('light')}
          colors={colors}
        />
        <ThemeTabItem
          value="dark"
          symbol="moon"
          isActive={appearance === 'dark'}
          onPress={() => setAppearance('dark')}
          colors={colors}
        />
      </View>
    </View>
  );
}

interface ThemeTabItemProps {
  value: SparkAppearance;
  symbol: 'sunny' | 'moon';
  isActive: boolean;
  onPress: () => void;
  colors: { ctaSubmit: string };
}

function ThemeTabItem({ symbol, isActive, onPress, colors }: ThemeTabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      {isActive ? (
        <View style={[styles.activeCircle, { backgroundColor: colors.ctaSubmit }]} />
      ) : null}
      <Ionicons name={symbol} size={20} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: SparkTheme.Spacing.xs,
    paddingBottom: SparkTheme.Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SparkTheme.Spacing.md,
    padding: 12,
    borderRadius: SparkTheme.Radius.full,
  },
  tabItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
});
