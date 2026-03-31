/** Rain radar map (Good data only); placeholder when Low/None or no location. */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import MapView from 'react-native-maps';
import { fetchRadarFrames, type RadarFrame } from '../api';
import type { Connectivity } from '../connectivity/types';

const MAP_HEIGHT = 180;
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  box: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  placeholder: {
    height: MAP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    padding: 16,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 12,
  },
  radarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    opacity: 0.82,
  },
  radarImage: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  sliderButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  radarLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
});

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
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [radarError, setRadarError] = useState(false);
  const [radarLoading, setRadarLoading] = useState(false);
  const { width } = useWindowDimensions();

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
    return () => { cancelled = true; };
  }, [showMap, latitude, longitude]);

  if (noLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today Rain Map</Text>
          </View>
          <View style={[styles.placeholder, { width: width - 40 }]}>
            <Text style={styles.placeholderText}>
              Location needed for rain map. Fix location and tap Refresh.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (connectivity === 'none') {
    return (
      <View style={styles.container}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today Rain Map</Text>
          </View>
          <View style={[styles.placeholder, { width: width - 40 }]}>
            <Text style={styles.placeholderText}>
              No network. Weather will update when connected.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (connectivity === 'low') {
    return (
      <View style={styles.container}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today Rain Map</Text>
          </View>
          <View style={[styles.placeholder, { width: width - 40 }]}>
            <Text style={styles.placeholderText}>Rain map available when status is Good data.</Text>
          </View>
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
      <View style={styles.box}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today Rain Map</Text>
        </View>
        {latitude != null && longitude != null && (
          <>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.mapView}
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
                <View style={styles.radarOverlay} pointerEvents="none">
                  <Image
                    source={{ uri: currentFrame.imageURL }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: 'transparent' }]}>
                  {radarLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : radarError ? (
                    <Text style={styles.placeholderText}>Unable to load radar</Text>
                  ) : (
                    <ActivityIndicator color="#fff" />
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
                  <Text style={styles.sliderLabel}>Older</Text>
                </Pressable>
                <Text style={styles.sliderLabel}>
                  {selectedIndex + 1} / {frames.length}
                </Text>
                <Pressable
                  style={styles.sliderButton}
                  onPress={() =>
                    setSelectedIndex((i) => Math.min(frames.length - 1, i + 1))
                  }
                >
                  <Text style={styles.sliderLabel}>Newer</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.footer}>
              {frames.length > 0 && (
                <>
                  <Text style={styles.timeText}>{timeStr}</Text>
                  <Text style={styles.radarLabel}>·</Text>
                </>
              )}
              <Text style={styles.radarLabel}>Radar · RainViewer</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
