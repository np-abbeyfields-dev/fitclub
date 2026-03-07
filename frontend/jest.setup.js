// Jest setup for FitClub frontend (React Native / Expo)

process.env.EXPO_NO_DOTENV = '1';
process.env.EXPO_NO_WINTER = '1';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store (used by authStore)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo modules used by components
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style }, children);
  },
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gesture-handler', () => ({}));

// useAppTheme: avoid useColorScheme() from pulling native modules; provide light theme in tests
jest.mock('./src/theme/useAppTheme', () => ({
  useAppTheme: () => require('./src/theme/light').lightTheme,
}));

// Mock @expo/vector-icons so components don't require native assets
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props) => React.createElement(View, { ...props, testID: 'mock-icon' });
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap: { fitness: 1, trophy: 1, body: 1 } }),
    MaterialIcons: Object.assign(MockIcon, { glyphMap: {} }),
    MaterialCommunityIcons: Object.assign(MockIcon, { glyphMap: {} }),
  };
});

// Global fetch for services that call API (optional safe default)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}
if (global.fetch && global.fetch.mock && !global.fetch.getMockImplementation()) {
  global.fetch.mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
  );
}

// Suppress known act() warning from ThemeProvider hydration (async setState after hydrate())
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0] || '');
  if (msg.includes('act(...)') && msg.includes('not wrapped')) return;
  originalConsoleError.apply(console, args);
};
