/** Spark Satellite Weather — connection-aware weather demo (React Native / Expo). */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WeatherScreen } from './src/screens/WeatherScreen';
import { SparkAppearanceProvider, useSparkAppearance } from './src/theme';
import { SparkColorsDark } from './src/theme/SparkTheme';

function AppContent() {
  const { appearance } = useSparkAppearance();

  return (
    <>
      <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
      <WeatherScreen />
    </>
  );
}

// Load Ionicons font for vector icons.
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ionicons: require('./assets/fonts/ionicons.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: SparkColorsDark.bgCanvas,
        }}
      >
        <ActivityIndicator size="large" color={SparkColorsDark.ctaCyan} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SparkAppearanceProvider>
        <AppContent />
      </SparkAppearanceProvider>
    </SafeAreaProvider>
  );
}
