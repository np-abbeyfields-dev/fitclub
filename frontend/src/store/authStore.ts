import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const TOKEN_KEY = 'fitclub_auth_token';
const USER_KEY = 'fitclub_auth_user';

/** On Android, if SecureStore fails (e.g. after R8 or device keychain issues), persist with AsyncStorage so login still works. */
async function setAuthStorage(token: string, userJson: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, userJson);
  } catch (e) {
    if (Platform.OS === 'android') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, userJson);
    } else {
      throw e;
    }
  }
}

async function getAuthStorage(): Promise<{ token: string | null; userJson: string | null }> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (token != null && userJson != null) return { token, userJson };
  } catch {
    // SecureStore can fail on Android (keychain/backup/device issues).
  }
  if (Platform.OS === 'android') {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return { token, userJson };
  }
  return { token: null, userJson: null };
}

async function clearAuthStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    // ignore
  }
  if (Platform.OS === 'android') {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user: User, token: string) => {
    await setAuthStorage(token, JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await clearAuthStorage();
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const { token, userJson } = await getAuthStorage();
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isAuthenticated: true });
      } else {
        set({ user: null, token: null, isAuthenticated: false });
      }
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
