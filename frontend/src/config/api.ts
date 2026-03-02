import { API_BASE_URL } from './environment';

export const API_CONFIG = {
  get baseURL(): string {
    return API_BASE_URL;
  },
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
};

export async function getAuthToken(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('../store/authStore');
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

export function initializeAPI(): Promise<void> {
  return Promise.resolve();
}
