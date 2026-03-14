import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { userService } from '../services/userService';

/**
 * Registers the device push token with the API when the user is authenticated (mobile only).
 * Skipped in Expo Go (SDK 53+ removed push from Expo Go; use a development build for push).
 * Run once on mount. Failures are silent so the app is not blocked.
 */
export function RegisterPushToken() {
  const done = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (done.current) return;
    // Push notifications are not supported in Expo Go (SDK 53+). Use a dev build for push.
    if (Constants.appOwnership === 'expo') return;

    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== 'granted') {
          const { status: requested } = await Notifications.requestPermissionsAsync();
          status = requested;
        }
        if (status !== 'granted' || cancelled) return;

        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // uses app.json / app.config.js if needed
        });
        const token = tokenResult?.data?.trim();
        if (!token || cancelled) return;

        await userService.registerPushToken(token, Platform.OS as 'ios' | 'android');
        if (!cancelled) done.current = true;
      } catch {
        // Silent: push registration is best-effort
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
