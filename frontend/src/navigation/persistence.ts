import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_STATE_KEY = 'fitclub_nav_state';

/** Route names that no longer exist; if present in saved state, we discard it. */
const STALE_ROUTE_NAMES = ['RootStack', 'RoundSummaryScreen'];

function stateContainsStaleRoutes(state: object): boolean {
  const json = JSON.stringify(state);
  return STALE_ROUTE_NAMES.some((name) => json.includes(`"${name}"`));
}

export async function getPersistedNavState(): Promise<object | undefined> {
  try {
    const raw = await AsyncStorage.getItem(NAV_STATE_KEY);
    if (!raw) return undefined;
    const state = JSON.parse(raw) as object;
    if (stateContainsStaleRoutes(state)) {
      await AsyncStorage.removeItem(NAV_STATE_KEY);
      return undefined;
    }
    return state;
  } catch {
    return undefined;
  }
}

export function saveNavState(state: object | undefined) {
  if (!state) return;
  AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state)).catch(() => {});
}
