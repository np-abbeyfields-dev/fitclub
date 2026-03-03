import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Root stack: main app (tabs + workout + settings) */
export type RootStackParamList = {
  MainTabs: undefined;
  WorkoutNew: undefined;
  Settings: undefined;
};

/** Main bottom tabs: Profile first (top/left), Challenges last (bottom/right) */
export type MainTabParamList = {
  ProfileTab: undefined;
  HomeTab: undefined;
  LeaderboardTab: undefined;
  TeamTab: undefined;
  ChallengesTab: undefined;
};

/** Home tab stack (Home, JoinClub, CreateClub live here for tab bar to stay visible) */
export type HomeStackParamList = {
  Home: undefined;
  JoinClub: undefined;
  CreateClub: undefined;
};

/** Web app sidebar routes (stack navigator when Platform.OS === 'web') */
export type WebStackParamList = {
  Dashboard: undefined;
  Leaderboards: undefined;
  Teams: undefined;
  Members: undefined;
  Rounds: undefined;
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
