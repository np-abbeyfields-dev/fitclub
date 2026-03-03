import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from './theme';
import { useThemeStore, type ThemePreference } from '../store/themeStore';

type ThemeContextValue = {
  theme: Theme;
  /** Current preference (light | dark | system). */
  preference: ThemePreference;
  /** Set and persist theme preference. */
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  /** Resolved scheme for nav/StatusBar: 'light' | 'dark'. */
  resolvedColorScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  preference: 'system',
  setThemePreference: async () => {},
  resolvedColorScheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { preference, setPreference, hydrate } = useThemeStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate().then(() => setHydrated(true));
  }, [hydrate]);

  const resolvedColorScheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo<Theme>(() => {
    const isDark = resolvedColorScheme === 'dark';
    return isDark ? darkTheme : lightTheme;
  }, [resolvedColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setThemePreference: setPreference,
      resolvedColorScheme,
    }),
    [theme, preference, setPreference, resolvedColorScheme]
  );

  if (!hydrated) {
    return (
      <ThemeContext.Provider value={{ ...value, theme: lightTheme, resolvedColorScheme: systemScheme === 'dark' ? 'dark' : 'light' }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  return ctx?.theme ?? lightTheme;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: lightTheme,
      preference: 'system',
      setThemePreference: async () => {},
      resolvedColorScheme: 'light',
    };
  }
  return ctx;
}
