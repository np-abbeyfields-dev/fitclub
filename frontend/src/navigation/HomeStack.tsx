import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import JoinClubScreen from '../screens/JoinClubScreen';
import CreateClubScreen from '../screens/CreateClubScreen';
import WorkoutNewScreen from '../screens/WorkoutNewScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="JoinClub" component={JoinClubScreen} />
      <Stack.Screen name="CreateClub" component={CreateClubScreen} />
      <Stack.Screen name="WorkoutNew" component={WorkoutNewScreen} />
    </Stack.Navigator>
  );
}
