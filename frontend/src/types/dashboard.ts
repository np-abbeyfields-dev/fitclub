export type DashboardRound = {
  id: string;
  name: string;
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
  todayPoints: number;
  dailyCap: number;
  topTeams: TeamRank[];
  recentWorkouts: RecentWorkout[];
};
