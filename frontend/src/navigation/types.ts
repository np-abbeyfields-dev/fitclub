import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Root = tab navigator. Each tab has its own stack so the tab bar stays visible. */
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  LeaderboardTab: NavigatorScreenParams<LeaderboardStackParamList>;
  TeamTab: NavigatorScreenParams<TeamStackParamList>;
  ChallengesTab: NavigatorScreenParams<ChallengesStackParamList>;
};

/** Home tab stack */
export type HomeStackParamList = {
  Home: undefined;
  JoinClub: undefined;
  CreateClub: undefined;
  WorkoutNew: { repeatLast?: boolean; repeatWorkoutIndex?: number } | undefined;
  Profile: undefined;
  Settings: undefined;
  ClubInfo: undefined;
  ReportBug: undefined;
  ContactUs: undefined;
  FAQ: undefined;
  Rounds: undefined;
  RoundConfig: { mode: 'create'; clubId: string } | { mode: 'edit'; roundId: string };
  Members: undefined;
  TeamsManagement: undefined;
};

/** Leaderboard tab stack (Leaderboard → Past Rounds → Round → Team → Individual) */
export type LeaderboardStackParamList = {
  Leaderboard: undefined;
  PastRounds: undefined;
  RoundLeaderboard: { roundId: string; roundName: string };
  TeamDetail: { roundId: string; teamId: string; roundName?: string; teamName: string };
  MemberActivity: { roundId: string; userId: string; userName: string };
};

/** Team tab stack */
export type TeamStackParamList = {
  Team: undefined;
};

/** Challenges tab stack */
export type ChallengesStackParamList = {
  Challenges: undefined;
  CreateCustomChallenge: { roundId: string; roundName?: string } | undefined;
  EditCustomChallenge: { challengeId: string; roundId: string };
};

/** Web app sidebar routes (stack navigator when Platform.OS === 'web') */
export type WebStackParamList = {
  Dashboard: undefined;
  Leaderboards: undefined;
  Teams: undefined;
  Members: undefined;
  Rounds: undefined;
  RoundConfig: { mode: 'create'; clubId: string } | { mode: 'edit'; roundId: string };
  Analytics: undefined;
  Settings: undefined;
  WorkoutNew: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainTabParamList {}
    interface WebParamList extends WebStackParamList {}
  }
}
