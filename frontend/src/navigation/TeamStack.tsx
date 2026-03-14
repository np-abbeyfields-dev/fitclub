import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TeamStackParamList } from './types';
import TeamScreen from '../screens/TeamScreen';

const Stack = createNativeStackNavigator<TeamStackParamList>();

export function TeamStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Team" component={TeamScreen} />
    </Stack.Navigator>
  );
}
