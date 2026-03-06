export type TeamMember = {
  id: string;
  userId?: string;
  name: string;
  avatar?: string | null;
  points: number;
  /** 0–100, share of team total */
  contributionPercent: number;
  isCurrentUser?: boolean;
  /** First member in list is Team Lead for display */
  isTeamLead?: boolean;
};

export type TeamDetail = {
  id: string;
  name: string;
  rank: number;
  totalPoints: number;
  members: TeamMember[];
};
