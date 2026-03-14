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
  scheduledStartAt: string | null;
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
  create(
    clubId: string,
    body: {
      name: string;
      startDate: string;
      endDate: string;
      scoringConfig: object;
      teamSize?: number;
      sourceRoundId?: string;
      copyTeams?: boolean;
    }
  ) {
    return request<{ success: boolean; data: Round }>(`/clubs/${clubId}/rounds`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  update(roundId: string, body: Partial<{ name: string; startDate: string; endDate: string; scoringConfig: object; teamSize: number; scheduledStartAt: string | null }>) {
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

  /** List workouts for a member in the round (for Member Activity drill-down). */
  getMemberWorkouts(roundId: string, userId: string, limit = 50) {
    return request<{
      success: boolean;
      data: Array<{
        id: string;
        roundId: string;
        activityType: string;
        durationMinutes: number | null;
        distanceKm: number | null;
        points: number;
        loggedAt: string;
      }>;
    }>(`/rounds/${roundId}/users/${userId}/workouts?limit=${limit}`);
  },

  getRoundSummary(roundId: string) {
    return request<{
      success: boolean;
      data: RoundSummary;
    }>(`/rounds/${roundId}/summary`);
  },

  /** Snake draft: state for team formation (whose turn, available members with previous-round stats). Round must be draft. */
  getDraftState(roundId: string) {
    return request<{
      success: boolean;
      data: DraftState;
    }>(`/rounds/${roundId}/draft-state`);
  },

  /** Snake draft: team on the clock picks a member. Caller must be that team's lead or admin. */
  draftPick(roundId: string, teamId: string, userId: string) {
    return request<{ success: boolean; data: unknown; message?: string }>(`/rounds/${roundId}/draft-pick`, {
      method: 'POST',
      body: JSON.stringify({ teamId, userId }),
    });
  },
};

export type PreviousRoundStat = { roundId: string; roundName: string; points: number; workouts: number };

export type DraftState = {
  roundId: string;
  roundName: string;
  pickNumber: number;
  currentTeamId: string | null;
  currentTeamName: string | null;
  isCurrentUserTurn: boolean;
  teams: Array<{ id: string; name: string; memberIds: string[]; isLeader: boolean }>;
  availableMembers: Array<{
    userId: string;
    displayName: string;
    email: string;
    previousRounds: PreviousRoundStat[];
  }>;
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
