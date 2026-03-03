import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';

const HEADER_CONTENT_HEIGHT = 48;

export function MobileHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { colors, spacing, radius, typography } = theme;

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  const onProfilePress = () => {
    (navigation as any).navigate('MainTabs', { screen: 'ProfileTab' });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.row, { minHeight: HEADER_CONTENT_HEIGHT, paddingTop: insets.top }]}>
        <Text style={[styles.title, { ...typography.h3, color: colors.text }]} numberOfLines={1}>
          FitClub
        </Text>
        <TouchableOpacity
          onPress={onProfilePress}
          style={[
            styles.avatarBtn,
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          activeOpacity={0.8}
          accessibilityLabel="Profile"
        >
          <Text style={[styles.avatarText, { ...typography.label, color: colors.primary }]}>{initial}</Text>
        </TouchableOpacity>
      </View>
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
  title: {},
  avatarBtn: {},
  avatarText: {},
});
