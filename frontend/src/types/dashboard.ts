export type DashboardRound = {
  id: string;
  name: string;
  startDate?: string;
  daysLeft: number;
  endDate: string;
};

export type TeamRank = {
  rank: 1 | 2 | 3;
  teamName: string;
  points: number;
};

export type RecentWorkout = {
  id: string;
  activityName: string;
  points: number;
  createdAt: string;
  userName?: string;
};

export type DashboardData = {
  round: DashboardRound;
  teamRank: TeamRank | null;
  myTeamRank: number | null;
  todayPoints: number;
  dailyCap: number;
  topTeams: TeamRank[];
  topTeamsAll: Array<{ rank: number; teamName: string; points: number }>;
  recentWorkouts: RecentWorkout[];
  myRoundPoints: number;
  myTeamTotal: number;
  workoutCount: number;
  weeklyActivity: Array<{ date: string; points: number; workoutCount?: number }>;
  currentStreak: number;
  estimatedCalories: number;
};
