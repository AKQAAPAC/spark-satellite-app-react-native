/**
 * Expo app config.
 * Optional: CONNECTIVITY_OVERRIDE=good|low|none (see docs/SATELLITE.md).
 * Android Maps: set GOOGLE_MAPS_API_KEY in .env; plugin syncs to android/local.properties on prebuild.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const VALID_OVERRIDES = ['good', 'low', 'none'];
const raw = process.env.CONNECTIVITY_OVERRIDE;
const connectivityOverride = raw && VALID_OVERRIDES.includes(raw.toLowerCase()) ? raw.toLowerCase() : null;

module.exports = {
  expo: {
    name: 'RN Spark Satellite Weather',
    slug: 'sparksatelliteweather-reactnative',
    version: '1.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#603494',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.akqa.rnsparksatelliteweather',
      entitlements: {
        'com.apple.developer.networking.carrier-constrained.app-optimized': true,
        'com.apple.developer.networking.carrier-constrained.appcategory': ['productivity-8012'],
      },
      infoPlist: {
        // Same wording as native iOS app; only location is requested (no local network in deployed builds).
        NSLocationWhenInUseUsageDescription:
          'Weather and storm map use your location to show local conditions.',
        // Disable local network so deployed app never shows "find devices on local networks" (Metro is dev-only).
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: false,
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#603494',
      },
      package: 'com.akqa.rnsparksatelliteweather',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Weather and storm map use your location to show local conditions.',
        },
      ],
      // Embed Ionicons font. assets/fonts/ is populated by postinstall.
      [
        'expo-font',
        {
          fonts: ['./assets/fonts/ionicons.ttf'],
        },
      ],
      [
        'expo-build-properties',
        {
          // Align Android with SparkSatelliteWeather-Android (compile 37 / target 36).
          // enableSceneSupport: required to launch on iOS 27 SDK / Xcode 27 (SDK 57.0.23+).
          android: {
            compileSdkVersion: 37,
            targetSdkVersion: 36,
          },
          ios: {
            enableSceneSupport: true,
          },
        },
      ],
      './plugins/withMapsApiKeyFromLocalProperties.js',
      './plugins/withConnectivityNative.js',
    ],
    extra: {
      connectivityOverride,
    },
  },
};
