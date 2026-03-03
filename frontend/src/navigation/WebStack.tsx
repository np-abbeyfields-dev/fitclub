import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { WebStackParamList } from './types';

import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import TeamScreen from '../screens/TeamScreen';
import TeamsManagementScreen from '../screens/TeamsManagementScreen';
import MembersScreen from '../screens/MembersScreen';
import RoundsScreen from '../screens/RoundsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WorkoutNewScreen from '../screens/WorkoutNewScreen';

const Stack = createNativeStackNavigator<WebStackParamList>();

export const WebStack = React.forwardRef<
  NavigationContainerRef<WebStackParamList>,
  Record<string, never>
>(function WebStack(_, ref) {
  return (
    <Stack.Navigator
      ref={ref}
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
      initialRouteName="Dashboard"
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Leaderboards" component={LeaderboardScreen} />
      <Stack.Screen name="Teams" component={TeamsManagementScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="Rounds" component={RoundsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="WorkoutNew" component={WorkoutNewScreen} />
    </Stack.Navigator>
  );
});
