const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROP = 'org.gradle.java.home';
const COMMENT = '# Set by withAndroidJavaHome plugin so Gradle finds JDK when JAVA_HOME is not set (e.g. npx expo run:android)\n';

function getJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }
  try {
    return execSync('/usr/libexec/java_home -v 17', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    // Homebrew OpenJDK 17 on Apple Silicon (default)
    const homebrew = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';
    if (fs.existsSync(path.join(homebrew, 'bin', 'java'))) {
      return homebrew;
    }
    // Intel Mac
    const homebrewIntel = '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';
    if (fs.existsSync(path.join(homebrewIntel, 'bin', 'java'))) {
      return homebrewIntel;
    }
  }
  return null;
}

function withAndroidJavaHome(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const javaHome = getJavaHome();
      if (!javaHome) {
        return config;
      }
      const gradlePropsPath = path.join(config.modRequest.platformProjectRoot, 'gradle.properties');
      let contents = await fs.promises.readFile(gradlePropsPath, 'utf8');
      // Remove any existing org.gradle.java.home line (from a previous prebuild)
      contents = contents.replace(/^# Set by withAndroidJavaHome.*\n?/m, '');
      contents = contents.replace(/^org\.gradle\.java\.home=.*\n?/m, '');
      if (!contents.trimEnd().endsWith('\n')) {
        contents += '\n';
      }
      contents += COMMENT + PROP + '=' + javaHome + '\n';
      await fs.promises.writeFile(gradlePropsPath, contents);
      return config;
    },
  ]);
}

module.exports = withAndroidJavaHome;
