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
  if (!res.ok) throw new Error((data as any)?.error || (data as any)?.message || `Request failed ${res.status}`);
  return data as T;
}

export type CustomChallenge = {
  id: string;
  roundId: string;
  clubId: string;
  name: string;
  description?: string;
  icon?: string;
  pointsAwarded: number;
  createdByUserId: string;
  createdBy?: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  completedToday: boolean;
};

export type CreateCustomChallengeInput = {
  name: string;
  description?: string;
  icon?: string;
  pointsAwarded: number;
};

export type UpdateCustomChallengeInput = {
  name?: string;
  description?: string;
  icon?: string;
  pointsAwarded?: number;
};

export const customChallengeService = {
  listByRound(roundId: string) {
    return request<{ success: boolean; data: CustomChallenge[] }>(`/rounds/${roundId}/custom-challenges`);
  },

  create(roundId: string, data: CreateCustomChallengeInput) {
    return request<{ success: boolean; data: CustomChallenge }>(`/rounds/${roundId}/custom-challenges`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: UpdateCustomChallengeInput) {
    return request<{ success: boolean; data: CustomChallenge }>(`/custom-challenges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return request<{ success: boolean }>(`/custom-challenges/${id}`, { method: 'DELETE' });
  },

  complete(id: string, date?: string) {
    return request<{ success: boolean; data: { id: string; pointsAwarded: number; alreadyCompleted?: boolean } }>(
      `/custom-challenges/${id}/complete`,
      { method: 'POST', body: JSON.stringify(date != null ? { date } : {}) }
    );
  },

  uncomplete(id: string, date?: string) {
    return request<{ success: boolean }>(`/custom-challenges/${id}/uncomplete`, {
      method: 'POST',
      body: JSON.stringify(date != null ? { date } : {}),
    });
  },
};
