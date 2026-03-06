# FitClub: First version to TestFlight and Android testers

Use **EAS Build** and **EAS Submit** to build the app and send it to iOS TestFlight and Android internal testers.

## Prerequisites

- **Expo account** (free): [expo.dev](https://expo.dev) → Sign up / Log in
- **Apple Developer Program** ($99/year): For TestFlight and App Store
- **Google Play Developer** ($25 one-time): For Android internal/testing tracks

## 1. Install EAS CLI and log in

```bash
cd frontend
npm install -g eas-cli
eas login
```

## 2. Link the project to your Expo account

From `frontend/`:

```bash
eas build:configure
```

If you already have `eas.json`, this will confirm or update it. Ensure the project is linked: `eas project:link` if needed.

## 3. iOS: Build and submit to TestFlight

### First-time iOS setup

1. **App in App Store Connect**  
   In [App Store Connect](https://appstoreconnect.apple.com) → Apps → create an app (e.g. “FitClub”), note the **App ID** (numeric).

2. **Credentials** (EAS can manage these):
   ```bash
   eas credentials --platform ios
   ```
   Follow prompts to create/manage distribution certificate and provisioning profile for the `production` profile.

### Build and submit

```bash
# Build for iOS (production profile → .ipa for TestFlight)
eas build --platform ios --profile production

# After the build finishes, submit the latest build to TestFlight
eas submit --platform ios --latest
```

Or build and submit in one step:

```bash
eas build --platform ios --profile production --auto-submit
```

- In App Store Connect → TestFlight you’ll see the build. Add **Internal testers** (team) and/or **External testers** (group with email list).
- Testers get an email to install via TestFlight.

## 4. Android: Build and add testers

### First-time Android setup

1. **Google Play Console**  
   Create an app at [Google Play Console](https://play.google.com/console).  
   You need at least the **Internal testing** track (no review).

2. **First upload**  
   Google requires the **first** version of the app to be uploaded manually (e.g. AAB from EAS). After that, EAS Submit can push updates.

### Build

```bash
# Production AAB (required for Play Store / internal testing)
eas build --platform android --profile production
```

Download the `.aab` from the EAS build page, then in Play Console:

- Release → **Internal testing** → Create new release → Upload the AAB → Save → Review and roll out.

### Add testers

- Internal testing → **Testers** tab → Create list (e.g. email list) and add testers. They get a link to install the app.

### Later: submit from CLI (after first manual upload)

To submit future builds with EAS:

1. Create a **Google Service Account** with Play Console API access and download a JSON key.
2. Configure EAS:
   ```bash
   eas credentials --platform android
   ```
   Add the service account key when prompted.
3. Submit:
   ```bash
   eas submit --platform android --latest
   ```
   Default in `eas.json` is `track: "internal"`, so this goes to Internal testing.

## 5. One-off: both platforms

```bash
# Build both
eas build --platform all --profile production

# Submit iOS to TestFlight (after builds complete)
eas submit --platform ios --latest

# Android: upload the .aab from EAS to Play Console (first time), then add testers
```

## 6. Environment / API URL

The app uses `EXPO_PUBLIC_API_URL` from `app.json` → `extra`. For a staging API, either:

- Set in `app.json` → `extra.EXPO_PUBLIC_API_URL`, or  
- Use EAS Secrets and an `app.config.js` that reads the secret for builds.

## Troubleshooting

- **iOS: “No valid code signing”**  
  Run `eas credentials --platform ios` and let EAS create or select a distribution certificate and provisioning profile.

- **Android: “You need to upload the first version manually”**  
  Download the AAB from the EAS build page and upload it in Play Console → Internal testing → Create new release.

- **Build queue**  
  EAS cloud builds can wait in queue. Use `--local` for local builds if you have Xcode/Android SDK installed (slower to set up).

## References

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Submit to TestFlight](https://docs.expo.dev/submit/ios/)
- [Submit to Google Play](https://docs.expo.dev/submit/android/)
