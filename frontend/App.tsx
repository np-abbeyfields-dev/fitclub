import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from './src/store/authStore';
import { initializeAPI } from './src/config/api';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import JoinClubScreen from './src/screens/JoinClubScreen';
import CreateClubScreen from './src/screens/CreateClubScreen';
import HomeScreen from './src/screens/HomeScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Screen = 'login' | 'register' | 'home' | 'joinClub' | 'createClub';

export default function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('login');

  useEffect(() => {
    initializeAPI();
    initializeAuth().then(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setScreen((s) => (isAuthenticated ? 'home' : 'login'));
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (screen === 'login') {
    return (
      <SafeAreaProvider>
        <LoginScreen
          onRegister={() => setScreen('register')}
          onSuccess={() => setScreen('home')}
        />
      </SafeAreaProvider>
    );
  }

  if (screen === 'register') {
    return (
      <SafeAreaProvider>
        <RegisterScreen
          onLogin={() => setScreen('login')}
          onSuccess={() => setScreen('home')}
        />
      </SafeAreaProvider>
    );
  }

  if (screen === 'joinClub') {
    return (
      <SafeAreaProvider>
        <JoinClubScreen
          onSuccess={() => setScreen('home')}
          onBack={() => setScreen('home')}
        />
      </SafeAreaProvider>
    );
  }

  if (screen === 'createClub') {
    return (
      <SafeAreaProvider>
        <CreateClubScreen
          onSuccess={() => setScreen('home')}
          onBack={() => setScreen('home')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <HomeScreen
        onCreateClub={() => setScreen('createClub')}
        onJoinClub={() => setScreen('joinClub')}
        onLogout={() => setScreen('login')}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});
