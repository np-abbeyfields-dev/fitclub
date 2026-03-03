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
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  ProfileTab: { filled: 'person', outline: 'person-outline' },
  HomeTab: { filled: 'home', outline: 'home-outline' },
  LeaderboardTab: { filled: 'trophy', outline: 'trophy-outline' },
  TeamTab: { filled: 'people', outline: 'people-outline' },
  ChallengesTab: { filled: 'medal', outline: 'medal-outline' },
};

const TAB_LABELS: Record<string, string> = {
  ProfileTab: 'Profile',
  HomeTab: 'Home',
  LeaderboardTab: 'Leaderboard',
  TeamTab: 'Team',
  ChallengesTab: 'Challenges',
};

const FAB_SIZE = 52;
const FAB_FLOAT_OFFSET = 18;
const PRESS_SCALE = 0.88;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = theme;
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
    navigation.getParent()?.navigate('WorkoutNew');
  };

  const tabBarHeight = 64 + insets.bottom;
  const visibleRoutes = state.routes.filter((r) => r.name !== 'ProfileTab');
  const leftTabs = visibleRoutes.slice(0, 2);
  const rightTabs = visibleRoutes.slice(2, visibleRoutes.length);

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
        activeOpacity={0.7}
      >
        <View style={[styles.tabInner, isFocused && { backgroundColor: colors.primaryMuted }]}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isFocused ? icons.filled : icons.outline}
              size={24}
              color={isFocused ? colors.primary : colors.textMuted}
            />
            {badge != null && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.label,
              { color: isFocused ? colors.primary : colors.textMuted },
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
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
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
                  backgroundColor: colors.accent,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.22,
                  shadowRadius: 8,
                  transform: [{ scale: scaleAnim }],
                  ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
                },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.text} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.half}>{rightTabs.map((r, i) => renderTab(r, i + 2))}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
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
    minWidth: 72,
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
  tabTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
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
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
