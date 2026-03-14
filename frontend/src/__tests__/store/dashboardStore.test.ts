/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '../../store/dashboardStore';
import type { DashboardData } from '../../types/dashboard';

const mockDashboard: DashboardData = {
  round: {
    id: 'r1',
    name: 'Round 1',
    daysLeft: 7,
    endDate: '2025-04-01',
  },
  teamRank: { rank: 1, teamName: 'Team A', points: 100 },
  myTeamRank: 1,
  todayPoints: 10,
  teamPointsToday: 25,
  topContributorsToday: [],
  dailyCap: 50,
  topTeams: [],
  topTeamsAll: [],
  recentWorkouts: [],
  myRoundPoints: 50,
  myTeamTotal: 100,
  workoutCount: 5,
  weeklyActivity: [
    { date: '2025-03-01', points: 10 },
    { date: '2025-03-05', points: 15 },
  ],
  currentStreak: 3,
  estimatedCalories: 500,
};

describe('dashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      dashboard: null,
      clubId: null,
      lastLoggedWorkout: null,
    });
  });

  it('has initial null dashboard', () => {
    const { result } = renderHook(() => useDashboardStore());
    expect(result.current.dashboard).toBe(null);
    expect(result.current.clubId).toBe(null);
  });

  it('setDashboard stores data and clubId', () => {
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setDashboard(mockDashboard, 'club-1');
    });
    expect(result.current.dashboard).toEqual(mockDashboard);
    expect(result.current.clubId).toBe('club-1');
  });

  it('getDashboardForClub returns dashboard only for matching club', () => {
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setDashboard(mockDashboard, 'club-1');
    });
    expect(result.current.getDashboardForClub('club-1')).toEqual(mockDashboard);
    expect(result.current.getDashboardForClub('club-2')).toBe(null);
  });

  it('optimisticallyAddWorkout updates points and recentWorkouts', () => {
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setDashboard(mockDashboard, 'club-1');
    });
    act(() => {
      result.current.optimisticallyAddWorkout('club-1', 'r1', {
        points: 8,
        activityName: 'Running',
      });
    });
    const dashboard = result.current.dashboard!;
    expect(dashboard.myRoundPoints).toBe(58);
    expect(dashboard.todayPoints).toBe(18);
    expect(dashboard.teamPointsToday).toBe(33);
    expect(dashboard.workoutCount).toBe(6);
    expect(dashboard.recentWorkouts[0].activityName).toBe('Running');
    expect(dashboard.recentWorkouts[0].points).toBe(8);
  });

  it('optimisticallyAddWorkout no-ops when clubId does not match', () => {
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setDashboard(mockDashboard, 'club-1');
    });
    act(() => {
      result.current.optimisticallyAddWorkout('club-2', 'r1', {
        points: 8,
        activityName: 'Running',
      });
    });
    expect(result.current.dashboard!.myRoundPoints).toBe(50);
  });

  it('setLastLoggedWorkout stores last workout', () => {
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setLastLoggedWorkout({
        activityType: 'Running',
        durationMinutes: 30,
        points: 6,
      });
    });
    expect(result.current.lastLoggedWorkout).toEqual({
      activityType: 'Running',
      durationMinutes: 30,
      points: 6,
    });
  });
});
