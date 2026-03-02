import { API_BASE_URL } from '../config/environment';
import { getAuthToken } from '../config/api';

const base = API_BASE_URL.replace(/\/+$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed ${res.status}`);
  }
  return data as T;
}

export const authService = {
  async register(email: string, password: string, displayName: string) {
    return request<{ success: boolean; data: { user: any; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  async login(email: string, password: string) {
    return request<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};
