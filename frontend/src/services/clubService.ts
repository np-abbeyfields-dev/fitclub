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

export type ClubWithRole = {
  id: string;
  name: string;
  inviteCode?: string;
  role: 'admin' | 'member';
  joinedAt?: string;
};

export type ClubMember = {
  id: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  displayName: string;
  email: string;
  team?: { teamId: string; teamName: string } | null;
};

export const clubService = {
  create(name: string) {
    return request<{ success: boolean; data: ClubWithRole & { inviteCode: string } }>('/clubs', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  join(inviteCode: string) {
    return request<{ success: boolean; data: unknown }>('/clubs/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  },
  listMine() {
    return request<{ success: boolean; data: ClubWithRole[] }>('/clubs');
  },
  getById(clubId: string) {
    return request<{ success: boolean; data: ClubWithRole }>(`/clubs/${clubId}`);
  },
  listMembers(clubId: string, params?: { search?: string; activeRoundId?: string }) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.activeRoundId) sp.set('activeRoundId', params.activeRoundId);
    const q = sp.toString();
    return request<{ success: boolean; data: ClubMember[] }>(`/clubs/${clubId}/members${q ? `?${q}` : ''}`);
  },
  setMemberRole(clubId: string, userId: string, role: 'admin' | 'member') {
    return request<{ success: boolean; data: unknown }>(`/clubs/${clubId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  removeMember(clubId: string, userId: string) {
    return request<{ success: boolean }>(`/clubs/${clubId}/members/${userId}`, { method: 'DELETE' });
  },

  getDashboard(clubId: string) {
    return request<{
      success: boolean;
      data: {
        activeRound: { id: string; name: string; endDate: string; daysLeft: number } | null;
        membersCount: number;
        teams: Array<{ id: string; name: string; points: number }>;
        topTeams: Array<{ rank: number; teamName: string; points: number }>;
        recentWorkouts: Array<{ id: string; activityName: string; points: number; createdAt: string; userName: string }>;
        todayPoints: number;
        dailyCap: number;
        myTeamRank: number | null;
        myTeamName: string | null;
      };
    }>(`/clubs/${clubId}/dashboard`);
  },
};
