import { create } from 'zustand';
import type { DashboardData } from '../types/dashboard';

export type LastLoggedWorkout = {
  activityType: string;
  durationMinutes?: number;
  distanceKm?: number;
  points: number;
};

type DashboardState = {
  dashboard: DashboardData | null;
  clubId: string | null;
  lastLoggedWorkout: LastLoggedWorkout | null;
  setDashboard: (data: DashboardData | null, clubId: string | null) => void;
  setLastLoggedWorkout: (w: LastLoggedWorkout | null) => void;
  /** Merge a just-logged workout into cached dashboard for instant UI update. */
  optimisticallyAddWorkout: (
    clubId: string,
    roundId: string,
    payload: { points: number; activityName: string }
  ) => void;
  getDashboardForClub: (clubId: string) => DashboardData | null;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboard: null,
  clubId: null,
  lastLoggedWorkout: null,

  setDashboard: (data, clubId) => set({ dashboard: data, clubId }),

  setLastLoggedWorkout: (w) => set({ lastLoggedWorkout: w }),

  optimisticallyAddWorkout: (clubId, roundId, payload) => {
    const { dashboard } = get();
    if (!dashboard || get().clubId !== clubId) return;
    const today = todayKey();
    const weekly = [...dashboard.weeklyActivity];
    const weekIdx = weekly.findIndex((d) => d.date.slice(0, 10) === today);
    if (weekIdx >= 0) {
      weekly[weekIdx] = { ...weekly[weekIdx], points: weekly[weekIdx].points + payload.points };
    } else {
      weekly.push({ date: today, points: payload.points });
    }
    set({
      dashboard: {
        ...dashboard,
        myRoundPoints: dashboard.myRoundPoints + payload.points,
        todayPoints: dashboard.todayPoints + payload.points,
        teamPointsToday: dashboard.teamPointsToday + payload.points,
        workoutCount: dashboard.workoutCount + 1,
        recentWorkouts: [
          {
            id: `opt-${Date.now()}`,
            activityName: payload.activityName,
            points: payload.points,
            createdAt: new Date().toISOString(),
            userName: undefined,
          },
          ...dashboard.recentWorkouts,
        ],
        weeklyActivity: weekly,
      },
    });
  },

  getDashboardForClub: (clubId) => {
    const { dashboard, clubId: cachedClubId } = get();
    return cachedClubId === clubId ? dashboard : null;
  },
}));
