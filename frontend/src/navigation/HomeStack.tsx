import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import JoinClubScreen from '../screens/JoinClubScreen';
import CreateClubScreen from '../screens/CreateClubScreen';
import WorkoutNewScreen from '../screens/WorkoutNewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ClubInfoScreen from '../screens/ClubInfoScreen';
import ReportBugScreen from '../screens/ReportBugScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import FAQScreen from '../screens/FAQScreen';
import RoundsScreen from '../screens/RoundsScreen';
import RoundConfigScreen from '../screens/RoundConfigScreen';
import MembersScreen from '../screens/MembersScreen';
import TeamsManagementScreen from '../screens/TeamsManagementScreen';

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
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ClubInfo" component={ClubInfoScreen} />
      <Stack.Screen name="ReportBug" component={ReportBugScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="Rounds" component={RoundsScreen} />
      <Stack.Screen name="RoundConfig" component={RoundConfigScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="TeamsManagement" component={TeamsManagementScreen} />
    </Stack.Navigator>
  );
}
