import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_STATE_KEY = 'fitclub_nav_state';

export async function getPersistedNavState(): Promise<object | undefined> {
  try {
    const raw = await AsyncStorage.getItem(NAV_STATE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as object;
  } catch {
    return undefined;
  }
}

export function saveNavState(state: object | undefined) {
  if (!state) return;
  AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state)).catch(() => {});
}
