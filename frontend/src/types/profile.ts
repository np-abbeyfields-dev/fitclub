/** Points per day for the last 7 days (oldest first) */
export type ProfileStats = {
  pointsThisRound: number;
  totalWorkouts: number;
  currentStreak: number;
  /** Last 7 days, [day0, day1, ... day6] */
  weeklyPoints: number[];
};
