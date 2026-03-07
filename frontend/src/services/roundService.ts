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
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed ${res.status}`);
  return data as T;
}

export type Round = {
  id: string;
  clubId: string;
  name: string;
  startDate: string;
  endDate: string;
  scoringConfig: Record<string, unknown>;
  teamSize: number | null;
  locked: boolean;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  Club?: { id: string; name: string };
};

export const roundService = {
  listByClub(clubId: string) {
    return request<{ success: boolean; data: Round[] }>(`/clubs/${clubId}/rounds`);
  },
  getById(roundId: string) {
    return request<{ success: boolean; data: Round & { Teams?: Array<{ id: string; name: string; Memberships: unknown[] }> } }>(`/rounds/${roundId}`);
  },
  create(clubId: string, body: { name: string; startDate: string; endDate: string; scoringConfig: object; teamSize?: number }) {
    return request<{ success: boolean; data: Round }>(`/clubs/${clubId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  update(roundId: string, body: Partial<{ name: string; startDate: string; endDate: string; scoringConfig: object; teamSize: number }>) {
    return request<{ success: boolean; data: Round }>(`/rounds/${roundId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  activate(roundId: string) {
    return request<{ success: boolean; data: Round }>(`/rounds/${roundId}/activate`, { method: 'POST' });
  },
  end(roundId: string) {
    return request<{ success: boolean; data: Round }>(`/rounds/${roundId}/end`, { method: 'POST' });
  },

  getLeaderboard(roundId: string, type: 'individuals' | 'teams') {
    return request<{
      success: boolean;
      data: Array<{ id: string; rank: number; name: string; points: number; maxPoints: number; isCurrentUser?: boolean }>;
    }>(`/rounds/${roundId}/leaderboard?type=${type}`);
  },

  getRoundSummary(roundId: string) {
    return request<{
      success: boolean;
      data: RoundSummary;
    }>(`/rounds/${roundId}/summary`);
  },
};

export type RoundSummary = {
  roundId: string;
  roundName: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  topIndividuals: Array<{ userId: string; name: string; points: number }>;
  topTeams: Array<{ teamName: string; totalPoints: number }>;
};
