import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { CustomTabBar } from './CustomTabBar';
import { MobileHeader } from '../components';
import { HomeStack } from './HomeStack';
import { LeaderboardStack } from './LeaderboardStack';
import { TeamStack } from './TeamStack';
import { ChallengesStack } from './ChallengesStack';

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
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="LeaderboardTab" component={LeaderboardStack} options={{ tabBarLabel: 'Leaderboard' }} />
        <Tab.Screen name="TeamTab" component={TeamStack} options={{ tabBarLabel: 'Team' }} />
        <Tab.Screen name="ChallengesTab" component={ChallengesStack} options={{ tabBarLabel: 'Challenges' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
