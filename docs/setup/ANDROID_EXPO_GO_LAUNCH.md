# Android: "bash arg" error when launching Expo Go

If you see:

```text
Error: bash arg: -p
  bash arg: host.exp.exponent
  bash arg: -c
  bash arg: android.intent.category.LAUNCHER
  bash arg: 1
```

this comes from Expo CLI when it tries to launch Expo Go on your Android device/emulator. The launch arguments are being passed to `bash` incorrectly (upstream/Expo CLI behavior).

## Workaround

**Don’t let Expo start the app on the device.** Start the dev server and open Expo Go yourself:

1. From `frontend/` run:
   ```bash
   npx expo start
   ```
2. On your Android device or emulator, open **Expo Go** manually.
3. In Expo Go, scan the QR code from the terminal (or enter the URL) to load the app.

The “bash arg” error only happens when Expo CLI runs the “open on Android” step (e.g. pressing `a` in the terminal). If you open Expo Go and connect yourself, that step is skipped and the error goes away.

## Alternative: development build

For a full native build (no Expo Go):

```bash
cd frontend
npx expo run:android
```

That builds and runs the FitClub Android app (package `io.fitclub.app`) and uses a different launch path, so the same “bash arg” error typically does not occur.
