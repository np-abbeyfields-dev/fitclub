import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { ClubSwitcherSheet } from './ClubSwitcherSheet';

const HEADER_CONTENT_HEIGHT = 44;
const AVATAR_SIZE = 32;

export function MobileHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, spacing, typography } = theme;
  const { selectedClub } = useClub();
  const user = useAuthStore((s) => s.user);
  const [sheetVisible, setSheetVisible] = useState(false);

  const openSheet = useCallback(() => setSheetVisible(true), []);
  const closeSheet = useCallback(() => setSheetVisible(false), []);
  const openProfile = useCallback(() => {
    const nav = navigation as any;
    const tabNav = typeof nav.getParent === 'function' ? nav.getParent() : nav;
    (tabNav as any).navigate('HomeTab', { screen: 'Profile' });
  }, [navigation]);

  const displayName = selectedClub?.name ?? 'FitClub';
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: spacing.xs,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.row, { minHeight: HEADER_CONTENT_HEIGHT, paddingTop: insets.top }]}>
        <TouchableOpacity
          style={[styles.clubButton, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }]}
          onPress={openSheet}
          activeOpacity={0.7}
        >
          <Text style={[styles.title, { ...typography.h3, color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openProfile}
          activeOpacity={0.7}
          style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }]}
        >
          <Text style={[typography.caption, { color: theme.isDark ? colors.text : colors.primary, fontWeight: '800' }]}>{initial}</Text>
        </TouchableOpacity>
      </View>
      <ClubSwitcherSheet visible={sheetVisible} onClose={closeSheet} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clubButton: {
    minWidth: 0,
  },
  title: {},
  avatar: {},
});
