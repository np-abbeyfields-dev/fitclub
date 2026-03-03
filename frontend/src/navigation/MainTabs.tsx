import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { CustomTabBar } from './CustomTabBar';
import { MobileHeader } from '../components';
import { HomeStack } from './HomeStack';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import TeamScreen from '../screens/TeamScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoundsScreen from '../screens/RoundsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <View style={styles.container}>
      <MobileHeader />
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
        }}
        initialRouteName="HomeTab"
      >
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile', tabBarButton: () => null }}
        />
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="LeaderboardTab"
          component={LeaderboardScreen}
          options={{ tabBarLabel: 'Leaderboard' }}
        />
        <Tab.Screen
          name="TeamTab"
          component={TeamScreen}
          options={{ tabBarLabel: 'Team' }}
        />
        <Tab.Screen
          name="ChallengesTab"
          component={RoundsScreen}
          options={{ tabBarLabel: 'Challenges' }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
