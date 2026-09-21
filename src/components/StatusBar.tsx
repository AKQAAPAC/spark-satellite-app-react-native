/** Status bar: connectivity label (Good/Low/No data) and Refresh. */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getConnectivityDescription } from '../connectivity';
import type { Connectivity } from '../connectivity/types';
import { useSparkAppearance } from '../theme';
import { SparkTheme } from '../theme/SparkTheme';

interface StatusBarProps {
  connectivity: Connectivity;
  lastFetchAt: Date | null;
  onRefresh: () => void;
}

function formatLastFetch(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function StatusBar({ connectivity, lastFetchAt, onRefresh }: StatusBarProps) {
  const { colors } = useSparkAppearance();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgPlan,
          borderRadius: SparkTheme.Radius.sm,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.statusText, SparkTheme.Typography.planLabel, { color: colors.textInverse }]}>
          {getConnectivityDescription(connectivity)}
        </Text>
      </View>
      <View style={styles.right}>
        <Pressable
          style={[styles.refreshButton, { backgroundColor: colors.ctaCyan }]}
          onPress={onRefresh}
        >
          <Text style={[styles.refreshText, SparkTheme.Typography.planLabel, { color: colors.bgBrand }]}>
            Refresh
          </Text>
        </Pressable>
        {lastFetchAt != null ? (
          <Text style={[styles.lastFetch, SparkTheme.Typography.micro, { color: colors.textOnDark }]}>
            {formatLastFetch(lastFetchAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SparkTheme.Spacing.md,
    paddingVertical: SparkTheme.Spacing.sm,
    marginHorizontal: SparkTheme.Spacing.lg,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  statusText: {},
  right: {
    alignItems: 'flex-end',
  },
  refreshButton: {
    paddingVertical: SparkTheme.Spacing.xs,
    paddingHorizontal: 12,
    borderRadius: SparkTheme.Radius.full,
  },
  refreshText: {},
  lastFetch: {
    marginTop: SparkTheme.Spacing.xs,
    textAlign: 'right',
  },
});
