import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { filled: 'home', outline: 'home-outline' },
  LeaderboardTab: { filled: 'trophy', outline: 'trophy-outline' },
  TeamTab: { filled: 'people', outline: 'people-outline' },
  ProfileTab: { filled: 'person', outline: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  LeaderboardTab: 'Leaderboard',
  TeamTab: 'Team',
  ProfileTab: 'Profile',
};

const FAB_SIZE = 56;
const FAB_FLOAT_OFFSET = 20;
const PRESS_SCALE = 0.92;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, spacing: s, radius: r } = theme;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onFABPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: PRESS_SCALE,
      useNativeDriver: true,
      speed: 80,
      bounciness: 4,
    }).start();
  };

  const onFABPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 80,
      bounciness: 8,
    }).start();
  };

  const onFABPress = () => {
    navigation.getParent()?.navigate('HomeTab', { screen: 'WorkoutNew' });
  };

  const tabBarHeight = 64 + insets.bottom;
  const visibleRoutes = state.routes;
  const leftTabs = visibleRoutes.slice(0, 2);
  const rightTabs = visibleRoutes.slice(2, 4);

  const renderTab = (route: (typeof state.routes)[0], _index: number) => {
    const isFocused = state.routes[state.index].name === route.name;
    const { options } = descriptors[route.key];
    const badge = options.tabBarBadge as number | string | undefined;
    const icons = TAB_ICONS[route.name] ?? { filled: 'ellipse', outline: 'ellipse-outline' };
    const label = TAB_LABELS[route.name] ?? route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        onPress={onPress}
        style={styles.tabTouch}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.tabInner,
            {
              backgroundColor: 'transparent',
              borderRadius: r.sm,
              paddingVertical: 6,
              paddingHorizontal: 10,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={isFocused ? icons.filled : icons.outline}
              size={22}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
            {badge != null && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={[styles.badgeText, { color: colors.textInverse }]} numberOfLines={1}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.label,
              {
                color: isFocused ? colors.primary : colors.textSecondary,
                fontWeight: isFocused ? '800' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          height: tabBarHeight,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.half}>{leftTabs.map((r, i) => renderTab(r, i))}</View>

        <View style={[styles.fabSlot, { marginTop: -FAB_FLOAT_OFFSET }]}>
          <TouchableOpacity
            onPress={onFABPress}
            onPressIn={onFABPressIn}
            onPressOut={onFABPressOut}
            activeOpacity={1}
            style={styles.fabTouchable}
          >
            <Animated.View
              style={[
                styles.fabCircle,
                {
                  width: FAB_SIZE,
                  height: FAB_SIZE,
                  borderRadius: FAB_SIZE / 2,
                  backgroundColor: colors.success,
                  borderWidth: 3,
                  borderColor: colors.success,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  transform: [{ scale: scaleAnim }],
                  ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
                },
              ]}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.fabLabel, { color: colors.textSecondary, fontWeight: '700' }]}>Log</Text>
        </View>

        <View style={styles.half}>{rightTabs.map((r, i) => renderTab(r, i + 2))}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  fabSlot: {
    flex: 0,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  tabTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
