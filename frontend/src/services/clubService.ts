import { API_BASE_URL } from '../config/environment';
import { getAuthToken } from '../config/api';

const base = API_BASE_URL.replace(/\/+$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed ${res.status}`);
  }
  return data as T;
}

export const clubService = {
  async create(name: string) {
    return request<{ success: boolean; data: any }>('/clubs', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async join(inviteCode: string) {
    return request<{ success: boolean; data: any }>('/clubs/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  },

  async listMine() {
    return request<{ success: boolean; data: any[] }>('/clubs');
  },
};
