// Native Android tweaks that `expo prebuild` would otherwise drop, since android/ is generated.
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod, withGradleProperties } = require('expo/config-plugins');

// Must be JDK 17: AGP's Prefab invocation (used by react-native-worklets' CMake build)
// misreads a JVM security warning newer JDKs print to stderr as a fatal error.
const JAVA_HOME = 'C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot';

const BUILD_GRADLE_MARKER = '// @spendhive-apk-outputs';
const BUILD_GRADLE_EXTRA = `
${BUILD_GRADLE_MARKER}
android {
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "arm64-v8a"
        }
    }
    // Name APKs <applicationId>_<timestamp>[_debug].apk, e.g. com.spendhive_20260927-1830.apk
    def buildTimestamp = new Date().format("yyyyMMddHHmm")
    applicationVariants.all { variant ->
        variant.outputs.all {
            def suffix = variant.buildType.name == "release" ? "" : "_\${variant.buildType.name}"
            outputFileName = "\${variant.applicationId}_\${buildTimestamp}\${suffix}.apk"
        }
    }
}
`;

/** Copies plugins/android-res/** (Notifee's ic_notification + its shrinkResources keep rule) into res/. */
function withNotificationResources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'plugins', 'android-res');
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      fs.cpSync(src, dest, { recursive: true });
      return cfg;
    },
  ]);
}

function withApkOutputs(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(BUILD_GRADLE_MARKER)) {
      cfg.modResults.contents += BUILD_GRADLE_EXTRA;
    }
    return cfg;
  });
}

function withJavaHome(config) {
  return withGradleProperties(config, (cfg) => {
    if (!fs.existsSync(JAVA_HOME)) return cfg; // e.g. EAS / other machines use their own JDK

    const props = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'org.gradle.java.home'));
    props.push({ type: 'property', key: 'org.gradle.java.home', value: JAVA_HOME });
    cfg.modResults = props;
    return cfg;
  });
}

module.exports = function withSpendHiveAndroid(config) {
  return withJavaHome(withApkOutputs(withNotificationResources(config)));
};
