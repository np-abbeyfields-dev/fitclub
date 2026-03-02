export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Club {
  id: string;
  name: string;
  inviteCode: string;
  role?: string;
  joinedAt?: string;
}
