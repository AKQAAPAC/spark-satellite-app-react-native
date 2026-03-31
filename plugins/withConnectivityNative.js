/**
 * Expo config plugin: inject native connectivity module so RN app can detect
 * real satellite (Android: TRANSPORT_SATELLITE → low; iOS: isUltraConstrained → low).
 * Adds android.telephony.PROPERTY_SATELLITE_DATA_OPTIMIZED so the app may use
 * constrained satellite data when it is the only network (see Android docs).
 * 4G/5G and WiFi stay good. Run after prebuild so android/ and ios/ exist.
 */
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withXcodeProject,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = AndroidConfig.Manifest;

/** https://developer.android.com/develop/connectivity/satellite/constrained-networks */
const SATELLITE_DATA_OPTIMIZED_META = 'android.telephony.PROPERTY_SATELLITE_DATA_OPTIMIZED';
const { addBuildSourceFileToGroup, getProjectName } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');

/**
 * Link a system framework on the app target.
 * Do not use Xcodeproj.addFramework from config-plugins: it calls project.getTarget(), which is
 * not always a function on the xcode pbxProject instance during withXcodeProject (Expo SDK 53+).
 */
function addIosSystemFramework(project, framework) {
  if (!project || typeof project.addFramework !== 'function') return project;
  let targetUuid;
  if (typeof project.getTarget === 'function') {
    const app = project.getTarget('com.apple.product-type.application');
    targetUuid = app?.uuid;
  }
  if (!targetUuid && typeof project.getFirstTarget === 'function') {
    targetUuid = project.getFirstTarget()?.uuid;
  }
  if (!targetUuid) return project;
  project.addFramework(framework, { target: targetUuid });
  return project;
}

const ANDROID_MODULE_KOTLIN = `package com.akqa.rnsparksatelliteweather.connectivity

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.UiThreadUtil

class ConnectivityStatusModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ConnectivityStatus"

    private val connectivityManager: ConnectivityManager? =
        reactContext.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private var callbackRegistered = false

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            emitOnUiThread(currentConnectivity())
        }
        override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
            emitOnUiThread(currentConnectivity())
        }
        override fun onLost(network: Network) {
            emitOnUiThread(currentConnectivity())
        }
    }

    init {
        try {
            connectivityManager?.registerDefaultNetworkCallback(callback)
            callbackRegistered = true
        } catch (_: Exception) { }
    }

    override fun invalidate() {
        if (callbackRegistered) {
            try {
                connectivityManager?.unregisterNetworkCallback(callback)
            } catch (_: Exception) { }
            callbackRegistered = false
        }
        super.invalidate()
    }

    @ReactMethod
    fun getConnectivity(promise: Promise) {
        promise.resolve(currentConnectivity())
    }

    /** Prefer active network; fallback only to links the OS has validated (avoids stale INTERNET-only ghosts). */
    private fun resolveCapabilities(cm: ConnectivityManager): NetworkCapabilities? {
        cm.activeNetwork?.let { cm.getNetworkCapabilities(it) }?.let { return it }
        for (network in cm.allNetworks) {
            val c = cm.getNetworkCapabilities(network) ?: continue
            if (c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                return c
            }
        }
        return null
    }

    // Same rules as standalone SparkSatelliteWeather-Android Connectivity.kt (order matters).
    private fun currentConnectivity(): String {
        val cm = connectivityManager ?: return "none"
        val caps = resolveCapabilities(cm) ?: return "none"
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
            return "good"
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            caps.hasTransport(NetworkCapabilities.TRANSPORT_SATELLITE)) {
            return if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                "low"
            } else {
                "none"
            }
        }
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
            return "good"
        }
        // Unknown transport (e.g. VPN or emulator default): treat as Good so simulator isn’t forced to Low.
        return "good"
    }

    private fun emitOnUiThread(status: String) {
        UiThreadUtil.runOnUiThread {
            if (reactApplicationContext.hasActiveReactInstance()) {
                try {
                    reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("connectivityChange", status)
                } catch (_: Exception) { }
            }
        }
    }
}
`;

const ANDROID_PACKAGE_KOTLIN = `package com.akqa.rnsparksatelliteweather.connectivity

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ConnectivityStatusPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(ConnectivityStatusModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

const MAIN_APPLICATION_CONNECTIVITY_PACKAGES = `listOf(
            com.akqa.rnsparksatelliteweather.connectivity.ConnectivityStatusPackage(),
          )`;

// Single Objective-C++ file: RCT_EXPORT_MODULE registers reliably (Swift + RCT_EXTERN often missing from NativeModules).
const IOS_CONNECTIVITY_MM = `//
//  ConnectivityStatus.mm
//  NWPathMonitor + reachability fallback (NWPath can stay "unsatisfied" while 4G/Wi‑Fi works).
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <Network/Network.h>
#import <SystemConfiguration/SystemConfiguration.h>
#import <netinet/in.h>
#import <string.h>

@interface ConnectivityStatus : RCTEventEmitter <RCTBridgeModule>
@end

@implementation ConnectivityStatus {
  nw_path_monitor_t _monitor;
  NSString *_cachedStatus;
}

RCT_EXPORT_MODULE(ConnectivityStatus);

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"connectivityChange"];
}

/// 0.0.0.0 reachability flags (cellular/satellite often sets IsWWAN even when NWPath is still unsatisfied).
static BOOL RNSparkInetReachabilityFlags(SCNetworkReachabilityFlags *outFlags) {
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_len = sizeof(addr);
  addr.sin_family = AF_INET;
  SCNetworkReachabilityRef ref =
      SCNetworkReachabilityCreateWithAddress(kCFAllocatorDefault, (const struct sockaddr *)&addr);
  if (ref == NULL) {
    return NO;
  }
  BOOL ok = SCNetworkReachabilityGetFlags(ref, outFlags);
  CFRelease(ref);
  return ok;
}

static BOOL RNSparkInetReachable(SCNetworkReachabilityFlags flags) {
  if ((flags & kSCNetworkReachabilityFlagsReachable) == 0) {
    return NO;
  }
  if ((flags & kSCNetworkReachabilityFlagsConnectionRequired) == 0) {
    return YES;
  }
  return (flags & (kSCNetworkReachabilityFlagsConnectionOnTraffic | kSCNetworkReachabilityFlagsConnectionOnDemand)) != 0;
}

/**
 * Satellite / constrained cellular often reports nw_path_status_unsatisfied or non-constrained satisfied
 * while SCNetworkReachability still shows Reachable+IsWWAN. Android maps validated satellite → low; we map
 * cellular-like backhaul when not fully “satisfied” as low so RN does not stay on none.
 */
static NSString *RNConnectivityStatusFromPath(nw_path_t path) {
  nw_path_status_t st = nw_path_get_status(path);
  if (st == nw_path_status_satisfied) {
    if (@available(iOS 14.0, *)) {
      if (nw_path_is_constrained(path)) {
        return @"low";
      }
    }
    return @"good";
  }

  // Unsatisfied / invalid: still may be on satellite or cellular bringing the link up.
  if (@available(iOS 12.0, *)) {
    if (nw_path_uses_interface_type(path, nw_interface_type_cellular)) {
      return @"low";
    }
  }

  SCNetworkReachabilityFlags flags = 0;
  if (RNSparkInetReachabilityFlags(&flags)) {
    if ((flags & kSCNetworkReachabilityFlagsReachable) != 0 &&
        (flags & kSCNetworkReachabilityFlagsIsWWAN) != 0) {
      return @"low";
    }
    if (RNSparkInetReachable(flags)) {
      return @"good";
    }
  }
  return @"none";
}

- (instancetype)init {
  if ((self = [super init])) {
    _cachedStatus = @"good";
    _monitor = nw_path_monitor_create();
    nw_path_monitor_set_queue(_monitor, dispatch_get_main_queue());
    __weak ConnectivityStatus *weakSelf = self;
    nw_path_monitor_set_update_handler(_monitor, ^(nw_path_t path) {
      ConnectivityStatus *strongSelf = weakSelf;
      if (strongSelf == nil) { return; }
      NSString *status = RNConnectivityStatusFromPath(path);
      strongSelf->_cachedStatus = status;
      [strongSelf sendEventWithName:@"connectivityChange" body:status];
    });
    nw_path_monitor_start(_monitor);
  }
  return self;
}

- (void)dealloc {
  if (_monitor) {
    nw_path_monitor_cancel(_monitor);
    _monitor = NULL;
  }
}

RCT_EXPORT_METHOD(getConnectivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(_cachedStatus ?: @"good");
}

@end
`;

/** Walk java/ tree for MainApplication.kt (same idea as @expo/config-plugins Paths.getProjectFilePath). */
function findMainApplicationKt(javaRoot, depth = 0) {
  if (depth > 24 || !fs.existsSync(javaRoot)) return null;
  const entries = fs.readdirSync(javaRoot, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(javaRoot, e.name);
    if (e.isFile() && e.name === 'MainApplication.kt') return p;
    if (e.isDirectory()) {
      const found = findMainApplicationKt(p, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Parent folder of AppDelegate.swift|m|mm under ios/ (skips Pods, build). */
function findAppDelegateParent(dir, depth = 0) {
  if (depth > 24 || !fs.existsSync(dir)) return null;
  const skip = new Set(['Pods', 'build', 'DerivedData', '.git', 'xcuserdata']);
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isFile() && /^AppDelegate\.(swift|m|mm)$/.test(name)) return dir;
    if (st.isDirectory()) {
      const found = findAppDelegateParent(p, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Where to place ConnectivityStatus.mm: same folder as AppDelegate, else Expo getProjectName(). */
function findIOSAppSourceDir(platformRoot, projectRoot) {
  const fromDelegate = findAppDelegateParent(platformRoot);
  if (fromDelegate) return fromDelegate;
  try {
    const byName = path.join(platformRoot, getProjectName(projectRoot));
    if (fs.existsSync(byName)) return byName;
  } catch {
    /* ignore */
  }
  return null;
}

/** MainApplication.kt path (platformRoot = android/ folder). */
function resolveMainApplicationPath(platformRoot, androidPackage) {
  const javaRoot = path.join(platformRoot, 'app', 'src', 'main', 'java');
  const byWalk = findMainApplicationKt(javaRoot);
  if (byWalk) return byWalk;

  if (!androidPackage || typeof androidPackage !== 'string') return null;
  const segments = androidPackage.split('.').filter(Boolean);
  if (segments.length === 0) return null;
  const fromPackage = path.join(platformRoot, 'app', 'src', 'main', 'java', ...segments, 'MainApplication.kt');
  if (fs.existsSync(fromPackage)) return fromPackage;
  const legacy = path.join(platformRoot, 'app', 'src', 'main', 'java', 'com', 'akqa', 'sparksatelliteweather', 'MainApplication.kt');
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

/** Registers ConnectivityStatus; strips legacy WeatherFetchPackage if present. */
function injectNativeModulesIntoMainApplication(mainApp) {
  let s = mainApp;
  if (s.includes('com.akqa.sparksatelliteweather.connectivity.ConnectivityStatusPackage')) {
    s = s.replace(
      /com\.akqa\.sparksatelliteweather\.connectivity\.ConnectivityStatusPackage/g,
      'com.akqa.rnsparksatelliteweather.connectivity.ConnectivityStatusPackage'
    );
  }
  s = s.replace(
    /\s*com\.akqa\.rnsparksatelliteweather\.weatherfetch\.WeatherFetchPackage\s*\(\s*\)\s*,?/g,
    ''
  );
  s = s.replace(/ConnectivityStatusPackage\s*\(\s*\)\s*,(\s*\n\s*\))/g, 'ConnectivityStatusPackage()$1');

  if (
    s.includes('ConnectivityStatusPackage') &&
    s.includes('return packages + listOf') &&
    !s.includes('WeatherFetchPackage')
  ) {
    return s;
  }
  if (s.includes('return packages') && !s.includes('return packages + listOf')) {
    return s.replace('return packages', `return packages + ${MAIN_APPLICATION_CONNECTIVITY_PACKAGES}`);
  }
  if (/return\s+PackageList\s*\(\s*this\s*\)\s*\.\s*packages\b/.test(s)) {
    return s.replace(
      /return\s+PackageList\s*\(\s*this\s*\)\s*\.\s*packages\b/g,
      `return PackageList(this).packages + ${MAIN_APPLICATION_CONNECTIVITY_PACKAGES}`
    );
  }
  return s;
}

function removeOkHttpWeatherFetchDependency(buildGradle) {
  return buildGradle.replace(/\n\s*implementation\s*\(\s*"com\.squareup\.okhttp3:okhttp:[^"]+"\s*\)/, '');
}

function withConnectivityNative(config) {
  config = withAndroidManifest(config, (c) => {
    const pkg = c.android?.package ?? c.expo?.android?.package;
    if (!pkg) return c;
    const mainApplication = getMainApplicationOrThrow(c.modResults);
    addMetaDataItemToMainApplication(mainApplication, SATELLITE_DATA_OPTIMIZED_META, pkg);
    return c;
  });

  config = withDangerousMod(config, ['android', async (c) => {
    const platformRoot = c.modRequest.platformProjectRoot;
    const androidPackage = c.android?.package ?? c.expo?.android?.package;
    const mainAppPath = resolveMainApplicationPath(platformRoot, androidPackage);
    if (!mainAppPath) return c;

    const packageDir = path.join(platformRoot, 'app', 'src', 'main', 'java', 'com', 'akqa', 'rnsparksatelliteweather', 'connectivity');
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'ConnectivityStatusModule.kt'), ANDROID_MODULE_KOTLIN, 'utf8');
    fs.writeFileSync(path.join(packageDir, 'ConnectivityStatusPackage.kt'), ANDROID_PACKAGE_KOTLIN, 'utf8');

    const weatherDir = path.join(platformRoot, 'app', 'src', 'main', 'java', 'com', 'akqa', 'rnsparksatelliteweather', 'weatherfetch');
    if (fs.existsSync(weatherDir)) {
      try {
        fs.rmSync(weatherDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }

    const appBuildGradle = path.join(platformRoot, 'app', 'build.gradle');
    if (fs.existsSync(appBuildGradle)) {
      const bg = fs.readFileSync(appBuildGradle, 'utf8');
      const nextBg = removeOkHttpWeatherFetchDependency(bg);
      if (nextBg !== bg) {
        fs.writeFileSync(appBuildGradle, nextBg, 'utf8');
      }
    }

    const oldConnectivityDir = path.join(
      platformRoot,
      'app',
      'src',
      'main',
      'java',
      'com',
      'akqa',
      'sparksatelliteweather',
      'connectivity'
    );
    if (fs.existsSync(oldConnectivityDir)) {
      try {
        fs.rmSync(oldConnectivityDir, { recursive: true, force: true });
        const oldParent = path.join(platformRoot, 'app', 'src', 'main', 'java', 'com', 'akqa', 'sparksatelliteweather');
        if (fs.existsSync(oldParent) && fs.readdirSync(oldParent).length === 0) {
          fs.rmdirSync(oldParent);
        }
      } catch {
        /* ignore */
      }
    }

    let mainApp = fs.readFileSync(mainAppPath, 'utf8');
    const patched = injectNativeModulesIntoMainApplication(mainApp);
    if (patched !== mainApp) {
      fs.writeFileSync(mainAppPath, patched, 'utf8');
    }
    return c;
  }]);

  config = withDangerousMod(config, ['ios', async (c) => {
    const platformRoot = c.modRequest.platformProjectRoot;
    const projectRoot = c.modRequest.projectRoot;
    const appDir = findIOSAppSourceDir(platformRoot, projectRoot);
    if (!appDir) return c;
    for (const legacy of ['ConnectivityStatus.h', 'ConnectivityStatus.m', 'ConnectivityStatus.swift']) {
      const fp = path.join(appDir, legacy);
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch {
        /* ignore */
      }
    }
    fs.writeFileSync(path.join(appDir, 'ConnectivityStatus.mm'), IOS_CONNECTIVITY_MM, 'utf8');
    return c;
  }]);

  // Add iOS source file to the Xcode project and link Network.framework.
  config = withXcodeProject(config, async (c) => {
    const projectName = getProjectName(c.modRequest.projectRoot);
    let project = c.modResults;
    const groupName = projectName;
    project = addBuildSourceFileToGroup({
      filepath: `${projectName}/ConnectivityStatus.mm`,
      groupName,
      project,
    });
    project = addIosSystemFramework(project, 'Network.framework');
    project = addIosSystemFramework(project, 'SystemConfiguration.framework');
    c.modResults = project;
    return c;
  });

  return config;
}

module.exports = withConnectivityNative;
