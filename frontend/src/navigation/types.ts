import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Root stack: main app (tabs + settings + leaderboard + admin). WorkoutNew lives in HomeStack so tab bar stays visible. */
export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  PastRounds: undefined;
  RoundSummary: { roundId: string; roundName: string };
  RoundLeaderboard: { roundId: string; roundName: string };
  Rounds: undefined;
  RoundConfig: { mode: 'create'; clubId: string } | { mode: 'edit'; roundId: string };
  Members: undefined;
  TeamsManagement: undefined;
  ClubInfo: undefined;
};

/** Main bottom tabs: Home, Leaderboard, [Log FAB], Team, Profile */
export type MainTabParamList = {
  HomeTab: undefined;
  LeaderboardTab: undefined;
  TeamTab: undefined;
  ProfileTab: undefined;
};

/** Home tab stack (Home, JoinClub, CreateClub, WorkoutNew — tab bar stays visible) */
export type HomeStackParamList = {
  Home: undefined;
  JoinClub: undefined;
  CreateClub: undefined;
  WorkoutNew: { repeatLast?: boolean; repeatWorkoutIndex?: number } | undefined;
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

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
    interface WebParamList extends WebStackParamList {}
  }
}
