const { version } = require('./package.json');

// App version comes from package.json ("version": "MAJOR.MINOR.PATCH") - the single place to bump it.
// versionCode = MAJOR*10000 + MINOR*100 + PATCH, e.g. 1.1.32 -> 10132 (always increases with the version).
const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10));
const versionCode = major * 10000 + minor * 100 + patch;

module.exports = {
  expo: {
    name: 'SpendHive',
    slug:'spendhive',
    version,
    scheme: 'spendhive',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/app-icon.png',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.spendhive',
      buildNumber: String(versionCode),
    },
    android: {
      package: 'com.spendhive',
      versionCode,
      allowBackup: false,
      // Expo's template adds these; file access goes through SAF / the document picker instead.
      blockedPermissions: [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/app-icon-adaptive.png',
        backgroundColor: '#262523',
      },
    },
    plugins: [
      'expo-font',
      'expo-sharing',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-logo.png',
          imageWidth: 96,
          resizeMode: 'contain',
          backgroundColor: '#262523',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            // Store .so files compressed in the APK (smaller download; extracted on install).
            useLegacyPackaging: true,
            buildArchs: ['arm64-v8a'],
          },
        },
      ],
      './plugins/withSpendHiveAndroid',
    ],
    extra: {
      eas: {
        projectId: 'ca84777f-c603-4200-a262-b0fb467ddb54',
      },
    },
    owner: 'mugil1410',
  },
};
