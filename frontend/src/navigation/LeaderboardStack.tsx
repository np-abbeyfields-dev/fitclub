import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { LeaderboardStackParamList } from './types';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PastRoundsScreen from '../screens/PastRoundsScreen';
import RoundLeaderboardScreen from '../screens/RoundLeaderboardScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import MemberActivityScreen from '../screens/MemberActivityScreen';

const Stack = createNativeStackNavigator<LeaderboardStackParamList>();

export function LeaderboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="PastRounds" component={PastRoundsScreen} />
      <Stack.Screen name="RoundLeaderboard" component={RoundLeaderboardScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="MemberActivity" component={MemberActivityScreen} />
    </Stack.Navigator>
  );
}
