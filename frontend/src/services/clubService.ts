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

/** Role is derived from ClubMembership only; never stored on User. */
export type ClubRole = 'admin' | 'team_lead' | 'member';

export type ClubWithRole = {
  id: string;
  name: string;
  inviteCode?: string;
  role: ClubRole;
  joinedAt?: string;
};

export type ClubMember = {
  id: string;
  userId: string;
  role: ClubRole;
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
  update(clubId: string, data: { name: string }) {
    return request<{ success: boolean; data: { id: string; name: string; createdAt: string } }>(`/clubs/${clubId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  listMembers(clubId: string, params?: { search?: string; activeRoundId?: string }) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.activeRoundId) sp.set('activeRoundId', params.activeRoundId);
    const q = sp.toString();
    return request<{ success: boolean; data: ClubMember[] }>(`/clubs/${clubId}/members${q ? `?${q}` : ''}`);
  },
  setMemberRole(clubId: string, userId: string, role: ClubRole) {
    return request<{ success: boolean; data: unknown }>(`/clubs/${clubId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  removeMember(clubId: string, userId: string) {
    return request<{ success: boolean }>(`/clubs/${clubId}/members/${userId}`, { method: 'DELETE' });
  },

  /** Any club member. Sends invite email; backend includes invite code in email. */
  inviteByEmail(clubId: string, email: string) {
    return request<{ success: boolean; message?: string }>(`/clubs/${clubId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  },

  getDashboard(clubId: string) {
    return request<{
      success: boolean;
      data: {
        activeRound: { id: string; name: string; startDate?: string; endDate: string; daysLeft: number } | null;
        membersCount: number;
        teams: Array<{ id: string; name: string; points: number }>;
        topTeams: Array<{ rank: number; teamName: string; points: number }>;
        recentWorkouts: Array<{ id: string; activityName: string; points: number; createdAt: string; userName: string }>;
        todayPoints: number;
        teamPointsToday: number;
        topContributorsToday: Array<{ displayName: string; points: number }>;
        dailyCap: number;
        myTeamRank: number | null;
        myTeamName: string | null;
        myRoundPoints: number;
        myTeamTotal: number;
        workoutCount: number;
        weeklyActivity: Array<{ date: string; points: number; workoutCount?: number }>;
        currentStreak: number;
        estimatedCalories: number;
        lastCompletedRoundRecap?: {
          roundId: string;
          roundName: string;
          winningTeamName: string;
          winningTeamPoints: number;
          topTeams: Array<{ rank: number; teamName: string; points: number }>;
          myTeamName: string | null;
          myTeamRank: number | null;
          myTeamPoints: number | null;
          myPoints: number;
          myWorkoutCount: number;
          contributionPercent: number;
        } | null;
      };
    }>(`/clubs/${clubId}/dashboard`);
  },

  /** Activity feed (FITCLUB_MASTER_SPEC §7.9). */
  getFeed(clubId: string, params?: { before?: string; limit?: number }) {
    const sp = new URLSearchParams();
    if (params?.before) sp.set('before', params.before);
    if (params?.limit != null) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return request<{
      success: boolean;
      data: { items: FeedItem[]; nextCursor: string | null };
    }>(`/clubs/${clubId}/feed${q ? `?${q}` : ''}`);
  },
};

/** Activity feed item (FITCLUB_MASTER_SPEC §5.12). */
export type FeedItemType =
  | 'WORKOUT_LOGGED'
  | 'STREAK_REACHED'
  | 'TEAM_JOINED'
  | 'ROUND_STARTED'
  | 'TEAM_CREATED'
  | 'MILESTONE_REACHED';

export type FeedItem = {
  id: string;
  type: FeedItemType;
  actorUserId: string;
  actorName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
