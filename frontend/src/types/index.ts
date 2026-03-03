export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Used to show/hide admin-only routes (e.g. Rounds, Analytics, Settings) */
  role?: 'admin' | 'member';
}

export interface Club {
  id: string;
  name: string;
  inviteCode: string;
  role?: string;
  joinedAt?: string;
}
