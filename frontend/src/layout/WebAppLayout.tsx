import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { WebSidebar } from './WebSidebar';
import { WebTopBar } from './WebTopBar';
import { WebStack } from '../navigation/WebStack';
import type { WebRouteId } from './webNavConfig';
import type { WebStackParamList } from '../navigation/types';

import { useTheme } from '../theme';

type WebAppLayoutProps = {
  containerRef: React.RefObject<NavigationContainerRef<WebStackParamList> | null>;
};

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

export function WebAppLayout({ containerRef }: WebAppLayoutProps) {
  const theme = useTheme();
  const { colors } = theme;
  const stackRef = useRef<NavigationContainerRef<WebStackParamList>>(null);
  const [activeRoute, setActiveRoute] = useState<WebRouteId>('Dashboard');

  const getState = useCallback(() => {
    const container = containerRef.current;
    if (container && typeof (container as any).getRootState === 'function') {
      return (container as any).getRootState();
    }
    return stackRef.current?.getState?.();
  }, [containerRef]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const id = setTimeout(() => {
      const ref = containerRef.current ?? stackRef.current;
      if (!ref) return;
      const state = getState();
      setActiveRoute(getActiveRouteFromState(state ?? undefined));
      unsubscribe = ref.addListener?.('state', () => {
        setActiveRoute(getActiveRouteFromState(getState() ?? undefined));
      });
    }, 0);
    return () => {
      clearTimeout(id);
      unsubscribe?.();
    };
  }, [containerRef, getState]);

  const onNavigate = useCallback(
    (route: WebRouteId) => {
      const ref = containerRef.current ?? stackRef.current;
      if (!ref) return;
      if (typeof (ref as any).navigate === 'function') {
        (ref as any).navigate(route);
      } else if (typeof ref.dispatch === 'function') {
        ref.dispatch(
          CommonActions.navigate({
            name: route,
          })
        );
      }
    },
    [containerRef]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WebSidebar activeRoute={activeRoute} onNavigate={onNavigate} />
      <View style={styles.main}>
        <WebTopBar />
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <WebStack ref={stackRef} />
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
    zIndex: 0,
    position: 'relative',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
