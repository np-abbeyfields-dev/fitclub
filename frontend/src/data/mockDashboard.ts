import type { DashboardData } from '../types/dashboard';

export const mockDashboard: DashboardData = {
  round: {
    id: '1',
    name: 'February 2026 Challenge',
    daysLeft: 12,
    endDate: '2026-02-28',
  },
  teamRank: {
    rank: 2,
    teamName: 'Sprint Crew',
    points: 2840,
  },
  todayPoints: 340,
  dailyCap: 500,
  topTeams: [
    { rank: 1, teamName: 'Peak Performers', points: 3120 },
    { rank: 2, teamName: 'Sprint Crew', points: 2840 },
    { rank: 3, teamName: 'Morning Movers', points: 2650 },
  ],
  recentWorkouts: [
    { id: '1', activityName: 'Running', points: 120, createdAt: '2026-02-16T08:30:00Z', userName: 'You' },
    { id: '2', activityName: 'Strength', points: 80, createdAt: '2026-02-16T07:00:00Z', userName: 'Alex' },
    { id: '3', activityName: 'Yoga', points: 45, createdAt: '2026-02-15T18:00:00Z', userName: 'You' },
    { id: '4', activityName: 'Cycling', points: 150, createdAt: '2026-02-15T12:00:00Z', userName: 'Sam' },
    { id: '5', activityName: 'Running', points: 95, createdAt: '2026-02-14T09:00:00Z', userName: 'You' },
  ],
};
