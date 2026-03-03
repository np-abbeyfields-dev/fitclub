export type TeamMember = {
  id: string;
  name: string;
  avatar?: string | null;
  points: number;
  /** 0–100, share of team total */
  contributionPercent: number;
  isCurrentUser?: boolean;
};

export type TeamDetail = {
  id: string;
  name: string;
  rank: number;
  totalPoints: number;
  members: TeamMember[];
};
