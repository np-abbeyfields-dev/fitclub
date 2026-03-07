/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../store/themeStore';

describe('themeStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    const { result } = renderHook(() => useThemeStore());
    await act(async () => {
      await result.current.setPreference('system');
    });
  });

  it('has default preference system', () => {
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.preference).toBe('system');
  });

  it('setPreference updates state and persists', async () => {
    const { result } = renderHook(() => useThemeStore());
    await act(async () => {
      await result.current.setPreference('dark');
    });
    expect(result.current.preference).toBe('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'fitclub_theme_preference',
      'dark'
    );
  });

  it('hydrate restores preference from AsyncStorage', async () => {
    await AsyncStorage.setItem('fitclub_theme_preference', 'light');
    const { result } = renderHook(() => useThemeStore());
    await act(async () => {
      await result.current.hydrate();
    });
    expect(result.current.preference).toBe('light');
  });

  it('hydrate ignores invalid stored value', async () => {
    await AsyncStorage.setItem('fitclub_theme_preference', 'invalid');
    const { result } = renderHook(() => useThemeStore());
    await act(async () => {
      await result.current.hydrate();
    });
    expect(result.current.preference).toBe('system');
  });
});
