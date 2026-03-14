# Running on Android

The Android build needs a Java 17 JDK. Use one of these:

- **`npm run android`** — sets JAVA_HOME and runs the app (recommended).
- **`./run-android.sh`** — same, use if you prefer a script.

To make `npx expo run:android` work without the wrapper (e.g. from any terminal), add to your `~/.zshrc`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || echo "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home")
```

Then run `source ~/.zshrc` or open a new terminal.
