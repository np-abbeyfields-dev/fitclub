#!/usr/bin/env bash
# Wrapper so Android build finds Java when you run ./run-android.sh or npx expo run:android
# (gradlew looks for JAVA_HOME before reading gradle.properties.)
if [ -z "$JAVA_HOME" ]; then
  if JAVA_HOME_CANDIDATE=$(/usr/libexec/java_home -v 17 2>/dev/null); then
    export JAVA_HOME="$JAVA_HOME_CANDIDATE"
  elif [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  elif [ -d "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  else
    echo "JAVA_HOME is not set and no Java 17 found. Install with: brew install openjdk@17"
    echo "Then add to ~/.zshrc: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    exit 1
  fi
fi
exec npx expo run:android "$@"
