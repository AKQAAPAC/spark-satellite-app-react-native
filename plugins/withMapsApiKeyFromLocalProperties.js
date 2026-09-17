/**
 * Expo plugin: Android Google Maps API key.
 * Uses MAPS_API_KEY from android/local.properties at build time.
 * Seeds local.properties from GOOGLE_MAPS_API_KEY (.env) when missing.
 */
const path = require('path');
const fs = require('fs');
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');
const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = AndroidConfig.Manifest;

const API_KEY_META_NAME = 'com.google.android.geo.API_KEY';
const PLACEHOLDER = '${MAPS_API_KEY}';

function parseLocalProperties(content) {
  const out = {};
  content.split('\n').forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const i = t.indexOf('=');
      if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  });
  return out;
}

function stringifyLocalProperties(props) {
  return Object.entries(props)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
}

function withMapsApiKeyFromLocalProperties(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = getMainApplicationOrThrow(config.modResults);
    addMetaDataItemToMainApplication(mainApplication, API_KEY_META_NAME, PLACEHOLDER);
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let contents = config.modResults.contents;
    if (contents.includes('MAPS_API_KEY: localProperties.getProperty')) {
      return config;
    }
    const injection = `
        def localProperties = new Properties()
        def localPropertiesFile = rootProject.file('local.properties')
        if (localPropertiesFile.exists()) {
            localProperties.load(new FileInputStream(localPropertiesFile))
        }
        manifestPlaceholders = [MAPS_API_KEY: localProperties.getProperty('MAPS_API_KEY', '')]
`;
    // Any versionName — do not pin 1.0.0 (broke after the 1.1.0 bump).
    const versionName = /(\s+versionName\s+"[^"]+"\s*\n)/;
    if (versionName.test(contents)) {
      contents = contents.replace(versionName, `$1${injection}`);
      config.modResults.contents = contents;
    }
    return config;
  });

  // withDangerousMod: read/write android/local.properties from env (no dedicated mod for it).
  config = withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const localPath = path.join(projectRoot, 'android', 'local.properties');
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '';
    let props = {};
    if (fs.existsSync(localPath)) {
      props = parseLocalProperties(fs.readFileSync(localPath, 'utf8'));
    } else {
      if (process.env.ANDROID_HOME) {
        props['sdk.dir'] = process.env.ANDROID_HOME.replace(/\\/g, '\\\\');
      }
    }
    if (key) props['MAPS_API_KEY'] = key;
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, stringifyLocalProperties(props), 'utf8');
    return config;
  }]);

  return config;
}

module.exports = withMapsApiKeyFromLocalProperties;
