# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - Spark design system

- Apply Spark Generative Commerce tokens (color, spacing, radius, type) across the weather UI.
- Dark canvas with plan-style cards, cyan Refresh, and shared selected-day / Now highlight.
- Light theme with white background; Spark tab-bar pill toggles light/dark (persisted).
- Scrollable layout, low–high temperature ranges, and hour pills with precip + wind on separate lines.
- Aligned with [SparkSatelliteWeather-iOS v1.2.0](https://github.com/AKQAAPAC/spark-satellite-app-ios/pull/2).

## [1.1.0] - Toolchain upgrade

- Upgrade Expo SDK 53 → 57 (React Native 0.86, React 19.2, TypeScript 6).
- Android: `compileSdk` 37 / `targetSdk` 36 (aligned with [SparkSatelliteWeather-Android](https://github.com/AKQAAPAC/spark-satellite-app-android/pull/1); required for Play Store updates).
- iOS: opt in to UIKit scene lifecycle so builds with **Xcode 27** / iOS 27 SDK launch (aligned with [SparkSatelliteWeather-iOS](https://github.com/AKQAAPAC/spark-satellite-app-ios/pull/1)).
- Docs: older vs newer Android satellite / constrained-networking guidance in `docs/SATELLITE.md`.
- Requires Node 22.13+, Xcode 26.4+ (verified on Xcode 27), and Android SDK 37.

## [1.0.0] - Initial release

- Connection-aware weather demo (status bar: Good / Low / No data; rain map gating).
- React Native / Expo; location-based weather via Open-Meteo and RainViewer radar.
- Maintained by AKQA.
