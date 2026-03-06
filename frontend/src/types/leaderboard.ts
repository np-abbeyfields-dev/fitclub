export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  avatar?: string | null;
  points: number;
  /** For progress bar: max in current list or round */
  maxPoints: number;
  /** Current user's entry (for highlighting / "You are #N") */
  isCurrentUser?: boolean;
  /** Rank change from previous snapshot: positive = moved up, negative = moved down */
  rankChange?: number;
};

export type LeaderboardTab = 'individuals' | 'teams';
