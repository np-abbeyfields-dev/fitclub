import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PREFERENCE_KEY = 'fitclub_theme_preference';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',

  setPreference: async (preference: ThemePreference) => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
    set({ preference });
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ preference: stored });
      }
    } catch {
      // keep default 'system'
    }
  },
}));
