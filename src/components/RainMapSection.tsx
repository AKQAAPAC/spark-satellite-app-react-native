/** Rain radar map (Good data only); placeholder when Low/None or no location. */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView from 'react-native-maps';
import { fetchRadarFrames, type RadarFrame } from '../api';
import type { Connectivity } from '../connectivity/types';
import { useSparkAppearance } from '../theme';
import { planCardStyle, SparkTheme } from '../theme/SparkTheme';

const MAP_HEIGHT = 148;

interface RainMapSectionProps {
  connectivity: Connectivity;
  latitude: number | null;
  longitude: number | null;
  noLocation: boolean;
}

export function RainMapSection({
  connectivity,
  latitude,
  longitude,
  noLocation,
}: RainMapSectionProps) {
  const { colors } = useSparkAppearance();
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [radarError, setRadarError] = useState(false);
  const [radarLoading, setRadarLoading] = useState(false);

  const showMap = connectivity === 'good' && !noLocation && latitude != null && longitude != null;

  useEffect(() => {
    if (!showMap || latitude == null || longitude == null) {
      setFrames([]);
      setRadarError(false);
      setRadarLoading(false);
      return;
    }
    let cancelled = false;
    setRadarLoading(true);
    setRadarError(false);
    fetchRadarFrames(latitude, longitude)
      .then((list) => {
        if (!cancelled) {
          setFrames(list);
          setSelectedIndex(Math.max(0, list.length - 1));
          setRadarError(list.length === 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFrames([]);
          setRadarError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setRadarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showMap, latitude, longitude]);

  const boxStyle = [styles.box, planCardStyle(colors)];

  const header = (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, SparkTheme.Typography.productName, { color: colors.textInverse }]}>
        Today Rain Map
      </Text>
    </View>
  );

  const placeholderText = (text: string) => (
    <View style={[styles.placeholder, { height: MAP_HEIGHT }]}>
      <Text style={[styles.placeholderText, SparkTheme.Typography.body, { color: colors.textInverse }]}>
        {text}
      </Text>
    </View>
  );

  if (noLocation) {
    return (
      <View style={styles.container}>
        <View style={boxStyle}>
          {header}
          {placeholderText('Location needed for rain map. Fix location and tap Refresh.')}
        </View>
      </View>
    );
  }

  if (connectivity === 'none') {
    return (
      <View style={styles.container}>
        <View style={boxStyle}>
          {header}
          {placeholderText('No network. Weather will update when connected.')}
        </View>
      </View>
    );
  }

  if (connectivity === 'low') {
    return (
      <View style={styles.container}>
        <View style={boxStyle}>
          {header}
          {placeholderText('Rain map available when status is Good data.')}
        </View>
      </View>
    );
  }

  const currentFrame = frames[selectedIndex] ?? frames[frames.length - 1];
  const timeStr = currentFrame
    ? currentFrame.time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={styles.container}>
      <View style={boxStyle}>
        {header}
        {latitude != null && longitude != null && (
          <>
            <View style={[styles.mapContainer, { borderRadius: SparkTheme.Radius.sm }]}>
              <MapView
                style={[styles.mapView, { borderRadius: SparkTheme.Radius.sm }]}
                mapType={Platform.OS === 'ios' ? 'satellite' : 'satellite'}
                initialRegion={{
                  latitude,
                  longitude,
                  latitudeDelta: 1,
                  longitudeDelta: 1,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              />
              {frames.length > 0 && currentFrame?.imageURL ? (
                <View style={[styles.radarOverlay, { borderRadius: SparkTheme.Radius.sm }]} pointerEvents="none">
                  <Image
                    source={{ uri: currentFrame.imageURL }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: 'transparent' }]}>
                  {radarLoading ? (
                    <ActivityIndicator color={colors.ctaCyan} />
                  ) : radarError ? (
                    <Text style={[styles.placeholderText, SparkTheme.Typography.body, { color: colors.textInverse }]}>
                      Unable to load radar
                    </Text>
                  ) : (
                    <ActivityIndicator color={colors.ctaCyan} />
                  )}
                </View>
              )}
            </View>
            {frames.length > 0 && (
              <View style={styles.sliderRow}>
                <Pressable
                  style={styles.sliderButton}
                  onPress={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                >
                  <Text style={[styles.sliderLabel, SparkTheme.Typography.micro, { color: colors.textOnDark }]}>
                    Older
                  </Text>
                </Pressable>
                <Text style={[styles.sliderLabel, SparkTheme.Typography.micro, { color: colors.textOnDark }]}>
                  {selectedIndex + 1} / {frames.length}
                </Text>
                <Pressable
                  style={styles.sliderButton}
                  onPress={() => setSelectedIndex((i) => Math.min(frames.length - 1, i + 1))}
                >
                  <Text style={[styles.sliderLabel, SparkTheme.Typography.micro, { color: colors.textOnDark }]}>
                    Newer
                  </Text>
                </Pressable>
              </View>
            )}
            <View style={styles.footer}>
              {frames.length > 0 ? (
                <Text style={[styles.footerText, SparkTheme.Typography.micro, { color: colors.textOnDark }]}>
                  {timeStr}
                  <Text style={{ opacity: 0.7 }}> · </Text>
                  <Text style={{ opacity: 0.8 }}>Radar · RainViewer</Text>
                </Text>
              ) : (
                <Text
                  style={[
                    styles.footerText,
                    SparkTheme.Typography.micro,
                    { color: colors.textOnDark, opacity: 0.8 },
                  ]}
                >
                  Radar · RainViewer
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SparkTheme.Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SparkTheme.Spacing.sm,
  },
  headerTitle: {},
  box: {
    gap: SparkTheme.Spacing.sm,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    padding: SparkTheme.Spacing.md,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  radarOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.82,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderLabel: {},
  sliderButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  footerText: {
    textAlign: 'center',
  },
});
