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

export type Team = {
  id: string;
  roundId: string;
  name: string;
  createdAt: string;
  Memberships?: Array<{
    id: string;
    userId: string;
    teamId: string;
    roundId: string;
    User: { id: string; displayName: string; email: string };
  }>;
};

export const teamService = {
  listByRound(roundId: string) {
    return request<{ success: boolean; data: Team[] }>(`/rounds/${roundId}/teams`);
  },

  /** Get current user's team summary for the round. 404 if not in a team. */
  getMyTeam(roundId: string) {
    return request<{
      success: boolean;
      data: {
        id: string;
        name: string;
        rank: number;
        totalPoints: number;
        members: Array<{
          id: string;
          name: string;
          points: number;
          isCurrentUser: boolean;
          contributionPercent: number;
        }>;
      };
    }>(`/rounds/${roundId}/my-team`);
  },
  create(roundId: string, name: string) {
    return request<{ success: boolean; data: Team }>(`/rounds/${roundId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  addMember(roundId: string, teamId: string, userId: string) {
    return request<{ success: boolean; data: unknown }>(`/rounds/${roundId}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  getTeamSummary(roundId: string, teamId: string) {
    return request<{
      success: boolean;
      data: {
        id: string;
        name: string;
        rank: number;
        totalPoints: number;
        members: Array<{
          id: string;
          name: string;
          points: number;
          isCurrentUser: boolean;
          contributionPercent: number;
        }>;
      };
    }>(`/rounds/${roundId}/teams/${teamId}/summary`);
  },
};
