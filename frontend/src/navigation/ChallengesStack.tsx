import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ChallengesStackParamList } from './types';
import ChallengesScreen from '../screens/ChallengesScreen';
import CreateCustomChallengeScreen from '../screens/CreateCustomChallengeScreen';
import EditCustomChallengeScreen from '../screens/EditCustomChallengeScreen';

const Stack = createNativeStackNavigator<ChallengesStackParamList>();

export function ChallengesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="CreateCustomChallenge" component={CreateCustomChallengeScreen} />
      <Stack.Screen name="EditCustomChallenge" component={EditCustomChallengeScreen} />
    </Stack.Navigator>
  );
}
