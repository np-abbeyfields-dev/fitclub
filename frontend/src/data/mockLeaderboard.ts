import type { LeaderboardEntry } from '../types/leaderboard';

const MAX_POINTS = 3200;

function entry(
  id: string,
  rank: number,
  name: string,
  points: number,
  isCurrentUser = false,
  avatar?: string | null
): LeaderboardEntry {
  return {
    id,
    rank,
    name,
    avatar: avatar ?? null,
    points,
    maxPoints: MAX_POINTS,
    isCurrentUser,
  };
}

export const mockIndividuals: LeaderboardEntry[] = [
  entry('1', 1, 'Alex Morgan', 3140),
  entry('2', 2, 'Jordan Lee', 2890),
  entry('3', 3, 'Sam Chen', 2650),
  entry('4', 4, 'Riley Davis', 2420),
  entry('5', 5, 'Casey Kim', 2180),
  entry('6', 6, 'Quinn Taylor', 1950),
  entry('7', 7, 'Morgan Wright', 1720),
  entry('8', 8, 'Jamie Fox', 1580),
  entry('9', 9, 'Drew Bell', 1420),
  entry('10', 10, 'Skye Reed', 1280),
  entry('11', 11, 'Blake Hart', 1150),
  entry('12', 12, 'You', 980, true),
  entry('13', 13, 'Parker Green', 860),
  entry('14', 14, 'Avery Lane', 720),
  entry('15', 15, 'Finley Brooks', 590),
];

export const mockTeams: LeaderboardEntry[] = [
  entry('t1', 1, 'Peak Performers', 12400),
  entry('t2', 2, 'Sprint Crew', 11200, true),
  entry('t3', 3, 'Morning Movers', 9850),
  entry('t4', 4, 'Iron Squad', 8720),
  entry('t5', 5, 'Endurance Elite', 7600),
  entry('t6', 6, 'Fit Fam', 6480),
  entry('t7', 7, 'Cardio Kings', 5340),
  entry('t8', 8, 'Strength in Numbers', 4210),
];

const INDIVIDUAL_MAX = Math.max(...mockIndividuals.map((e) => e.points));
const TEAM_MAX = Math.max(...mockTeams.map((e) => e.points));

export function getIndividualsWithMax(): LeaderboardEntry[] {
  return mockIndividuals.map((e) => ({ ...e, maxPoints: INDIVIDUAL_MAX }));
}

export function getTeamsWithMax(): LeaderboardEntry[] {
  return mockTeams.map((e) => ({ ...e, maxPoints: TEAM_MAX }));
}

export function getCurrentUserRank(
  tab: 'individuals' | 'teams'
): number | null {
  const list = tab === 'individuals' ? mockIndividuals : mockTeams;
  const found = list.find((e) => e.isCurrentUser);
  return found ? found.rank : null;
}
