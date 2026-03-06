export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Role is never stored on User; it comes from ClubMembership per club (see ClubWithRole). */
}

export interface Club {
  id: string;
  name: string;
  inviteCode: string;
  joinedAt?: string;
}
