# Spark Satellite Weather (React Native)

[![React Native](https://img.shields.io/badge/React%20Native-0.79-blue.svg)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-53-black.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org)

Spark Satellite Weather is a **weather demo app**: it shows current conditions, a 7‑day forecast with hourly breakdown, and a rain radar map for your location. The app’s main purpose is to demonstrate **satellite (connection-aware) behaviour**. When the device is on **satellite** or constrained connectivity, the app can show **"Status: Low data"**; Wi‑Fi, Ethernet, and cellular (4G/5G) are treated as **Good** in the status bar—for example the rain map is only loaded when status is Good data. All weather and radar data use the **device location**; there is no fallback if location is unavailable.

## Table of contents

- [How to use the app](#how-to-use-the-app)
- [Satellite connectivity in development and testing](#satellite-connectivity-in-development-and-testing)
- [Requirements](#requirements)
- [Installation](#installation)
- [Install on a physical phone](#install-on-a-physical-phone)
- [Documentation](#documentation)
- [Project structure (connectivity and location)](#project-structure-connectivity-and-location)
- [License](#license)

## How to use the app

1. Start the dev server: **`npx expo start`**.
2. Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press **a** for Android emulator / **i** for iOS simulator.
3. Grant **location** permission when prompted.
4. The app loads weather for the current location. Use **Refresh** to update.
5. Select a day in the list to see that day’s details and hourly strip. When connection is **Good**, the **rain map** appears with Older/Newer to step through radar frames; when Low or None, a placeholder is shown.

## Satellite connectivity in development and testing

- **What you see:** The status bar shows **"Status: Good data"** / **"Status: Low data"** / **"Status: No data"**. Good = full map and forecast; Low = rain map hidden (e.g. real satellite).
- **Real satellite:** Use a **development build** (**`npx expo prebuild`** then **`npx expo run:ios`** or **`npx expo run:android`**), not Expo Go. On satellite or ultra-constrained links, the native module reports **Low**; Wi‑Fi / normal cellular are **Good**. HTTPS on satellite also requires platform opt-in (Android manifest meta-data, iOS entitlements) — see [docs/SATELLITE.md](docs/SATELLITE.md).
- **iOS (Spark satellite):** Same recommendation as **SparkSatelliteWeather-iOS** — **iOS 26.4+** on device and **Xcode 26.4+** for builds; the native Swift app documents **`allowsUltraConstrainedNetworkAccess`** for weather HTTPS. This project uses **`fetch`** for weather; see [docs/SATELLITE.md](docs/SATELLITE.md) and the iOS repo README if you need parity details.
- **Simulate without satellite hardware:** **`CONNECTIVITY_OVERRIDE=low npx expo start`** (values: `good`, `low`, `none`). Restart Metro to change. **Expo Go** can use this override for UI only; it does not load the native connectivity module.
- **How behaviour changes:** When **Good**, the rain map loads; when **Low** or **None**, the rain map shows a placeholder.
- **Details:** [docs/SATELLITE.md](docs/SATELLITE.md) — implementation, **`getIsUsingNativeConnectivity()`**, and **Building an app** checklist.

## Requirements

- **iOS device builds (Spark satellite):** **Xcode 26.4+** and **iOS 26.4+** on device when testing real ultra-constrained/satellite networking (aligned with **SparkSatelliteWeather-iOS**).
- **Node.js** 18+
- **npm** or **yarn**
- **Expo Go** (for device/simulator) or **EAS Build** for standalone builds
- **Location permission** — For weather and rain map
- **Android – Google Maps API key** (rain map): set **GOOGLE_MAPS_API_KEY** in `.env` or **MAPS_API_KEY** in **android/local.properties** — see [Installation](#installation). iOS uses Apple Maps and needs no key.
- **Android native build** (for `npx expo run:android`): JDK 17 and Android SDK required — see [Android build (final steps)](#android-build-final-steps) below.

## Installation

1. Clone the repository (or download the source).
2. In the project root run: **`npm install`**. A **postinstall** script runs automatically and applies patches required for iOS prebuild.
3. Run **`npx expo prebuild`** to generate the **`ios/`** and **`android/`** folders (they are not in the repo; all native config comes from `app.config.js` and the `plugins/`).
4. (Optional) Add app icon and splash: place `icon.png`, `splash-icon.png`, and `adaptive-icon.png` in `assets/`. See `assets/README.md`.
5. **Android – Google Maps API key (for the rain map):** Set **GOOGLE_MAPS_API_KEY** in a **`.env`** file in the project root (or **MAPS_API_KEY** in **android/local.properties**). The config plugin syncs `.env` into `android/local.properties` on prebuild. Get a key from [Google Cloud Console](https://console.cloud.google.com/) with **Maps SDK for Android** enabled. Use a development build for the map (see below).

## Android build (final steps)

**Run all Expo commands from the project root** (the folder that contains `package.json`), e.g. `SparkSatelliteWeather-ReactNative/`. If you run `npx expo run:android` from a parent folder (e.g. `GIT/`), you'll get `ConfigError: The expected package.json path ... does not exist`. Use `cd` into the project first.

Use this exact order from the **project root**, in the **same terminal**:

1. **Set environment variables** (same terminal, same session):
   ```bash
   export JAVA_HOME=$(brew --prefix openjdk@17)   # or /usr/libexec/java_home -v 17
   export ANDROID_HOME=$HOME/Library/Android/sdk  # or your SDK path if different
   ```
   If Gradle can’t find the SDK, create **android/local.properties** with **sdk.dir** and **MAPS_API_KEY** (see step 2).

2. **Maps key:** Add **GOOGLE_MAPS_API_KEY** to a **`.env`** file in the project root, or create **android/local.properties** with **sdk.dir** and **MAPS_API_KEY** (plugin syncs `.env` on prebuild).

3. **Prebuild** (generates/updates the `android` and `ios` folders; the config plugin wires the Maps key from local.properties into the build):
   ```bash
   npx expo prebuild
   ```
   If prebuild fails, try **`npx expo prebuild`** without `--clean`. For a clean slate, delete the `ios` and `android` folders manually, then run **`npx expo prebuild`** again.

4. **Run the app**:
   ```bash
   npx expo run:android
   ```

**If you see "This build uses a Java 8 JVM" or "Dependency requires at least JVM runtime version 11":** Gradle is reusing an old daemon that was started with Java 8. Stop it so the next run uses your current `JAVA_HOME` (Java 17):
   ```bash
   cd android && ./gradlew --stop && cd ..
   npx expo run:android
   ```
   Keep `JAVA_HOME` set to Java 17 in the same terminal (step 1).

**If you get `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (signatures do not match):** An older build or another app with the same package ID is installed. Uninstall it, then run again:
```bash
adb uninstall com.akqa.rnsparksatelliteweather
npx expo run:android
```
If you use a specific device/emulator: `adb -s emulator-5554 uninstall com.akqa.rnsparksatelliteweather`.

**If you still get "SDK location not found":** Gradle reads `sdk.dir` from **`android/local.properties`**. Create that file with exactly:
```properties
sdk.dir=/Users/claudiu.vasile/Library/Android/sdk
```
(Replace with your actual SDK path — often `~/Library/Android/sdk` or the path shown in Android Studio under **Settings → Appearance & Behavior → System Settings → Android SDK**.)

**Running from Android Studio:** Open the **`android`** folder (not the project root) in Android Studio. Let Gradle sync (it needs JAVA_HOME and the SDK; if sync failed before, the "app" module may not appear until those are set). Then use **Run → Run 'app'** or the green Run button. You still need to start the Metro bundler from the project root (`npm start`) in a separate terminal so the app can load the JS bundle.

**Satellite / “Status: No data” on Android while the standalone native app shows “Low data”:** The **ConnectivityStatus** package may be missing from **`MainApplication.kt`**, or **`android/`** was generated without this app’s config plugin. Regenerate: **`npx expo prebuild --clean`**, then **`npx expo run:android`**. Confirm **`ConnectivityStatusPackage()`** is in **`getPackages()`**.

**iOS / native module not loading (Release or Debug):** The plugin must add **`ConnectivityStatus.mm`** next to **`AppDelegate`**. Run **`npx expo prebuild --clean`**, then **`npx expo run:ios --device`**. Confirm **`ios/<ProjectName>/ConnectivityStatus.mm`** exists.

## Install on a physical phone

These steps install and run the app on a **real device** (development build). You need a USB cable and the native build tools (Xcode for iOS, Android SDK for Android).

### Prerequisites

- **Project set up:** [Installation](#installation) and (for Android) [Android build (final steps)](#android-build-final-steps) done at least once, including **`npx expo prebuild`** so the `ios` and `android` folders exist.
- **Android only:** **GOOGLE_MAPS_API_KEY** in `.env` (or **MAPS_API_KEY** in `android/local.properties`) so the rain map works.

### iOS (iPhone / iPad)

1. Connect the device with a USB cable and unlock it. If prompted on the device, tap **Trust** and enter your passcode.
2. On your Mac, open the project in Xcode (optional but useful for first-time setup): open the **`ios`** folder and double‑click **`SparkSatelliteWeather.xcworkspace`** (not the `.xcodeproj`). In **Signing & Capabilities**, select your **Team** and ensure the bundle ID is correct so the app can be signed.
3. From the **project root** in a terminal, run:
   ```bash
   npx expo run:ios --device
   ```
   If more than one device or simulator is available, you’ll be asked to pick one; choose your physical device.
4. The first time you run on a device, iOS may block the app because the developer isn’t trusted. On the device go to **Settings → General → VPN & Device Management**, select your developer account, and tap **Trust**.
5. The app installs and launches. Keep the device connected if you want to see logs; you can disconnect once it’s running.

**Alternative (build from Xcode):** Open **`ios/SparkSatelliteWeather.xcworkspace`** in Xcode, select your phone in the device menu at the top, then press **⌘R**. Start the Metro bundler from the project root in a separate terminal: **`npm start`** (or **`npx expo start`**).

**iOS permissions:** In **deployed** (release) builds the app requests only **location**, using the same message as the native iOS app: *"Weather and storm map use your location to show local conditions."* Local networking is disabled in the app config.

**If you still see "find devices on local networks":** That prompt appears when the app (or the dev tooling) tries to discover Metro on the local network. To get rid of it:

1. **Uninstall the app** from the iPhone (long-press app icon → Remove App → Delete App).
2. **Regenerate the native project** so the latest `Info.plist` is used:
   ```bash
   npx expo prebuild --clean
   ```
3. Then either:
   - **Development (with Metro):** Start Metro in **tunnel** mode so the device connects over the internet instead of the local network:
     ```bash
     npx expo start --tunnel
     ```
     In a second terminal (with the tunnel still running): `npx expo run:ios --device`. The app will load from the tunnel URL and should not trigger the local network prompt.
   - **No Metro (like a deployed app):** Build and run in **Release** so the app does not connect to Metro at all:
     ```bash
     npx expo run:ios --device --configuration Release
     ```
     The first launch may take a moment; the app will use the bundled JS and you will only see the **location** permission prompt.

### Android (phone / tablet)

1. On the device, enable **Developer options**: **Settings → About phone** → tap **Build number** seven times.
2. In **Settings → Developer options**, turn on **USB debugging**.
3. Connect the device with a USB cable. If prompted, allow **USB debugging** for this computer.
4. From the **project root** in a terminal, set the Android SDK path if needed, then run:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk   # or your SDK path
   npx expo run:android --device
   ```
   If both an emulator and a physical device are connected, choose the device when prompted.
**Release build on device (no Metro):** To run the app in release mode on a connected device (bundled JS, no dev tools):
   ```bash
   npx expo run:android --device --variant release
   ```
5. The app installs and launches. You can unplug the device after it’s running.

**If the device isn’t listed:** Run **`adb devices`** and confirm the device appears. If it shows “unauthorized”, check the device for the “Allow USB debugging?” prompt and tap **Allow**.

### After installing

- The app stays on the device until you uninstall it. To run the latest code again, run **`npx expo run:ios --device`** or **`npx expo run:android --device`** from the project root (with the device connected); it will rebuild and reinstall.
- For a **release** build (e.g. to share an APK or IPA), use **EAS Build** ([expo.dev](https://expo.dev)) or build from Xcode/Android Studio with a release scheme.

## Documentation

- **[docs/SATELLITE.md](docs/SATELLITE.md)** — Good/low/none, dev build vs Expo Go, code map, Android/iOS opt-in for traffic on satellite, and **Building an app** checklist.

## Project structure (connectivity and location)

| Path | Purpose (satellite / connectivity / location) |
|------|-----------------------------------------------|
| `src/connectivity/` | **useConnectivity()** returns `'good' \| 'low' \| 'none'`. Uses **native ConnectivityStatus** only (iOS constrained path; Android TRANSPORT_SATELLITE). See [docs/SATELLITE.md](docs/SATELLITE.md). |
| `src/components/StatusBar.tsx` | Status line + Refresh; last successful load time under Refresh when available. |
| `src/components/RainMapSection.tsx` | Rain map only when connectivity is good; placeholder when low/none. |
| `src/screens/WeatherScreen.tsx` | **useConnectivity()**; passes connectivity to StatusBar, WeatherCard, RainMapSection, and hourly strip visibility. |
| `src/hooks/useLocation.ts` | Expo Location: permission, coords, reverse geocode for place name. |

Weather data comes from **Open-Meteo** (no API key); radar frames from RainViewer. See `src/api/` and [docs/SATELLITE.md](docs/SATELLITE.md).

## Contributing

Contributions are welcome. Please open an issue or pull request on GitHub.

## License

Apache-2.0 — see [LICENSE](LICENSE).
