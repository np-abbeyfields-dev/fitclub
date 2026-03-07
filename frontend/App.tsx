import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/dm-sans/useFonts';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { useAuthStore } from './src/store/authStore';
import { initializeAPI } from './src/config/api';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { injectWebReset } from './src/theme/globalStyles';
import { getPersistedNavState, saveNavState } from './src/navigation/persistence';
import { navLightTheme, navDarkTheme } from './src/navigation/theme';

import { AuthStack } from './src/navigation/AuthStack';
import { RootStack } from './src/navigation/RootStack';
import { WebAppLayout } from './src/layout/WebAppLayout';
import { ClubProvider } from './src/context/ClubContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function LoadingView() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const [navReady, setNavReady] = useState(false);
  const [initialState, setInitialState] = useState<React.ComponentProps<typeof NavigationContainer>['initialState']>(undefined);
  const theme = useTheme();
  const navTheme = theme.isDark ? navDarkTheme : navLightTheme;

  useEffect(() => {
    initializeAPI();
    initializeAuth().then(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getPersistedNavState()
        .then((state) => setInitialState((state as React.ComponentProps<typeof NavigationContainer>['initialState']) ?? undefined))
        .finally(() => setNavReady(true));
    } else {
      setInitialState(undefined);
      setNavReady(true);
    }
  }, [isAuthenticated]);

  if (isLoading || (isAuthenticated && !navReady)) {
    return <LoadingView />;
  }

  const isWeb = Platform.OS === 'web';

  return (
    <NavigationContainer
      key={isAuthenticated ? 'main' : 'auth'}
      theme={navTheme}
      initialState={isAuthenticated && !isWeb ? initialState : undefined}
      onStateChange={(state) => {
        if (isAuthenticated && !isWeb && state) saveNavState(state);
      }}
    >
      {isAuthenticated ? (
        <ClubProvider>
          {isWeb ? (
            <WebAppLayout />
          ) : (
            <RootStack />
          )}
        </ClubProvider>
      ) : (
        <AuthStack onLoginSuccess={() => {}} />
      )}
    </NavigationContainer>
  );
}

function AppStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    injectWebReset();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStatusBar />
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
