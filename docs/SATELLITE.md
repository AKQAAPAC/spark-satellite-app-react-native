# The satellite (connection-aware) feature

How **good / low / none** connectivity is defined, how to run and test the demo, and what you need to reuse this pattern in your own app.

## What “satellite” means in this app

- **good** — Wi‑Fi, Ethernet, or unmetered cellular (e.g. 4G/5G). **"Status: Good data"**; full forecast and rain map.
- **low** — Constrained or satellite (iOS ultra-constrained path; Android `TRANSPORT_SATELLITE` with validated internet). **"Status: Low data"**; rain map hidden.
- **none** — No usable network. **"Status: No data"**; no rain map, no hourly strip; forecast follows normal load/error states.

Implementation uses the **native ConnectivityStatus** module (not NetInfo): Android treats validated satellite as **low**; iOS uses `NWPathMonitor` plus reachability fallbacks so satellite does not stick on **none** when the path updates slowly.

## Dev build vs Expo Go

- **Expo Go** has no custom native code → the module does not run; connectivity stays **none** unless you use **CONNECTIVITY_OVERRIDE** for UI testing only.
- **Real satellite (status + HTTPS):** run **`npx expo prebuild`**, then **`npx expo run:ios`** / **`npx expo run:android`**. The config plugin adds the native module, Android **PROPERTY_SATELLITE_DATA_OPTIMIZED**, and merges **`ios.entitlements`** from **`app.config.js`**. Use **`getIsUsingNativeConnectivity()`** (`src/connectivity`) to confirm the module loaded.
- If status is **Low** but weather requests fail on satellite, the usual gap is missing **iOS entitlements / App ID capability** or **Android** manifest meta-data — see **Building an app**, step 2.
- **iOS 26.4+ (Spark satellite):** Use the same baseline as **SparkSatelliteWeather-iOS** — **Xcode 26.4+** (verified on **Xcode 27**) and **iOS 26.4+** on device for real satellite validation. The Swift native app enables **`allowsUltraConstrainedNetworkAccess`** on **`URLSessionConfiguration`** for weather HTTP (`NetworkURLSessionHTTPClient.swift`). This RN app loads weather with **`fetch`**; if data still fails on satellite with **Low** showing, check Expo/React Native behaviour on ultra-constrained paths or compare with that native file.

## How to see it in the demo

1. **Real satellite** — Development build on hardware/plan that reports satellite or ultra-constrained paths; expect **Low data** on the status bar.
2. **No satellite hardware** — **`CONNECTIVITY_OVERRIDE=low`** (or `good` / `none`) when starting Metro, e.g. `CONNECTIVITY_OVERRIDE=low npx expo start`; restart Metro to change it.
3. **Behaviour** — Rain map only when **good**. Hourly strip hidden when **none**; on **low**, hourly still shows if data already loaded.

**Location:** Expo Location only; no fallback (see **`useLocation.ts`**).

## Code map

| Area | Role |
|------|------|
| **`src/connectivity/useConnectivity.ts`** | `useConnectivity()`; native module + optional override from **`extra.connectivityOverride`**. |
| **`src/screens/WeatherScreen.tsx`** | Passes connectivity to StatusBar, hourly strip, rain map. |
| **`src/components/StatusBar.tsx`** | Status label and refresh / last update time. |
| **`src/hooks/useLocation.ts`** | Permission, coordinates, reverse geocode. |
| **`plugins/withConnectivityNative.js`** | Prebuild: native sources, Android meta-data, iOS frameworks. |

### Older vs newer Android versions

Use the same **good / low / none** product model on all versions. Gate APIs by SDK level so one codebase covers old and new devices (this is the same table as **SparkSatelliteWeather-Android**).

| Android / API | What you can rely on | What to do in your app |
|---------------|----------------------|-------------------------|
| **API 26–30** | No public satellite transport in normal app networking | Treat connectivity as **good** (Wi‑Fi / Ethernet / cellular) or **none**. Do not expect real satellite Low. Use **`CONNECTIVITY_OVERRIDE`** in demos. |
| **API 31–34** | Satellite transport may appear on some OEM/extension builds | Keep a version check before reading satellite transport (this app uses `Build.VERSION_CODES.S`). |
| **API 35+ (Android 15)** | `TRANSPORT_SATELLITE` is the supported ConnectivityManager signal; constrained satellite opt‑in is documented | Opt in with `PROPERTY_SATELLITE_DATA_OPTIMIZED`. Detect Low with `TRANSPORT_SATELLITE`. |
| **API 36–37+** | Same connectivity model; NTN signal APIs appear on telephony | Optional: show signal quality **in addition to** good/low/none. Do **not** replace ConnectivityManager transport checks with NTN signal alone. |

**This app today:** Expo SDK 57, Android `targetSdk` 36 / `compileSdk` 37. Detection uses `TRANSPORT_SATELLITE` with an API 31+ guard in **`plugins/withConnectivityNative.js`**. Satellite Good/Low/None behaviour is unchanged from 1.0.0.

## Summary

| Topic | In this app |
|-------|-------------|
| **Low data** | iOS: constrained path (+ fallbacks). Android: `TRANSPORT_SATELLITE` + validated. Override: `CONNECTIVITY_OVERRIDE`. |
| **Traffic on satellite** | Android: manifest meta-data (plugin). iOS: **`ios.entitlements`** + App ID capability; **iOS 26.4+** / **Xcode 26.4+** (verified on **Xcode 27**) for Spark (see native iOS README + `NetworkURLSessionHTTPClient`). |
| **Rain map** | Only when `connectivity === 'good'`. |

---

## Building an app with satellite (connection-aware) behaviour

1. **Observe connectivity** — Native module (or your own) mapping Android `TRANSPORT_SATELLITE` (31+) and iOS constrained path to **good / low / none**. This repo: **`plugins/withConnectivityNative.js`** and generated **`ios/`** / **`android/`** after prebuild. See **Older vs newer Android versions** above.
2. **Allow HTTPS on satellite (both platforms)** — UI detection alone is not enough:
   - **Android:** `<meta-data android:name="android.telephony.PROPERTY_SATELLITE_DATA_OPTIMIZED" android:value="${applicationId}" />` under `<application>`. [Google: constrained satellite networks](https://developer.android.com/develop/connectivity/satellite/constrained-networks).
   - **iOS:** Entitlements **`com.apple.developer.networking.carrier-constrained.appcategory`** (array; values from Apple’s docs for that key) and **`com.apple.developer.networking.carrier-constrained.app-optimized`**. Expo: **`ios.entitlements`** in **`app.config.js`**. Enable the capability on the **App ID**. [Apple: ultra-constrained networks](https://developer.apple.com/documentation/BundleResources/Configuring-your-app-for-ultra-constrained-networks).
3. **Optional: dev override** — e.g. **`CONNECTIVITY_OVERRIDE`** via Expo **`extra`** (this app) or adb / launch arguments on native-only apps.
4. **One state in UI** — Single hook or ViewModel field driving status text and feature gates.
5. **Gate heavy features** — Example: map only when **good**.
6. **Location** — Same coordinates for APIs as on any network.

For native-only references, see **SparkSatelliteWeather-Android** and **SparkSatelliteWeather-iOS** **`docs/SATELLITE.md`**.
