import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import SettingsScreen from '../screens/SettingsScreen';
import PastRoundsScreen from '../screens/PastRoundsScreen';
import RoundLeaderboardScreen from '../screens/RoundLeaderboardScreen';
import RoundsScreen from '../screens/RoundsScreen';
import MembersScreen from '../screens/MembersScreen';
import TeamsManagementScreen from '../screens/TeamsManagementScreen';
import ClubInfoScreen from '../screens/ClubInfoScreen';
import { RegisterPushToken } from '../components/RegisterPushToken';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <>
      <RegisterPushToken />
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PastRounds" component={PastRoundsScreen} />
      <Stack.Screen name="RoundLeaderboard" component={RoundLeaderboardScreen} />
      <Stack.Screen name="Rounds" component={RoundsScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="TeamsManagement" component={TeamsManagementScreen} />
      <Stack.Screen name="ClubInfo" component={ClubInfoScreen} />
    </Stack.Navigator>
    </>
  );
}
