/** Status bar: connectivity label (Good/Low/No data) and Refresh. */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getConnectivityDescription } from '../connectivity';
import type { Connectivity } from '../connectivity/types';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  right: {
    alignItems: 'flex-end',
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  lastFetch: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    textAlign: 'right',
  },
});

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
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.statusText}>{getConnectivityDescription(connectivity)}</Text>
      </View>
      <View style={styles.right}>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
        {lastFetchAt != null ? <Text style={styles.lastFetch}>{formatLastFetch(lastFetchAt)}</Text> : null}
      </View>
    </View>
  );
}
