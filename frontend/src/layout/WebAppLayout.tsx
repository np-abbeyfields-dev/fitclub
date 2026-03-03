import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { WebSidebar } from './WebSidebar';
import { WebTopBar } from './WebTopBar';
import { WebStack } from '../navigation/WebStack';
import type { WebRouteId } from './webNavConfig';
import type { WebStackParamList } from '../navigation/types';

import { useTheme } from '../theme/ThemeContext';

const WEB_SIDEBAR_ROUTES: WebRouteId[] = [
  'Dashboard',
  'Leaderboards',
  'Teams',
  'Members',
  'Rounds',
  'Analytics',
  'Settings',
];

function getActiveRouteFromState(
  state: { routes: { name: string }[]; index: number } | undefined
): WebRouteId {
  if (!state?.routes?.length) return 'Dashboard';
  const route = state.routes[state.index];
  const name = route?.name as keyof WebStackParamList;
  if (WEB_SIDEBAR_ROUTES.includes(name as WebRouteId)) return name as WebRouteId;
  return 'Dashboard';
}

export function WebAppLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const navigationRef = useRef<NavigationContainerRef<WebStackParamList>>(null);
  const [activeRoute, setActiveRoute] = useState<WebRouteId>('Dashboard');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const id = setTimeout(() => {
      const ref = navigationRef.current;
      if (!ref) return;
      const state = ref.getState();
      setActiveRoute(getActiveRouteFromState(state ?? undefined));
      unsubscribe = ref.addListener('state', () => {
        setActiveRoute(getActiveRouteFromState(ref.getState() ?? undefined));
      });
    }, 0);
    return () => {
      clearTimeout(id);
      unsubscribe?.();
    };
  }, []);

  const onNavigate = useCallback((route: WebRouteId) => {
    navigationRef.current?.navigate(route);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WebSidebar activeRoute={activeRoute} onNavigate={onNavigate} />
      <View style={styles.main}>
        <WebTopBar />
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <WebStack ref={navigationRef} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
