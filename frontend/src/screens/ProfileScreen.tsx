import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { Card, Button, PointsText, Sparkline } from '../components';
import { mockProfileStats } from '../data/mockProfile';
import type { ProfileStats } from '../types/profile';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { colors, spacing, radius, typography } = theme;

  const [stats, setStats] = useState<ProfileStats>(mockProfileStats);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    setStats(mockProfileStats);
    setRefreshing(false);
  }, []);

  const onSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    await logout();
  };

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Settings */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { ...typography.h1, color: colors.text }]}>Profile</Text>
          <TouchableOpacity
            onPress={onSettings}
            style={{ padding: spacing.xxs }}
            hitSlop={spacing.sm}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Avatar + name card */}
        <Card style={[styles.avatarCard, { paddingVertical: spacing.lg, marginBottom: spacing.md }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryMuted, borderRadius: radius.full, marginBottom: spacing.sm }]}>
            <Text style={[styles.avatarText, { ...typography.display, color: colors.primary }]}>{initial}</Text>
          </View>
          <Text style={[styles.displayName, { ...typography.h2, color: colors.text }]} numberOfLines={1}>
            {user?.displayName || 'Member'}
          </Text>
          <Text style={[styles.email, { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs }]} numberOfLines={1}>
            {user?.email}
          </Text>
        </Card>

        {/* Stats: points, workouts, streak */}
        <View style={[styles.statsRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <Card style={[styles.statCard, { padding: spacing.sm, flex: 1 }]}>
            <Ionicons name="trophy-outline" size={22} color={colors.accent} />
            <Text style={[styles.statValue, { ...typography.h2, color: colors.text, marginTop: spacing.xs }]}>
              <PointsText value={stats.pointsThisRound} accent={false} />
            </Text>
            <Text style={[styles.statLabel, { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs }]}>Points this round</Text>
          </Card>
          <Card style={[styles.statCard, { padding: spacing.sm, flex: 1 }]}>
            <Ionicons name="fitness-outline" size={22} color={colors.primary} />
            <Text style={[styles.statValue, { ...typography.h2, color: colors.text, marginTop: spacing.xs }]}>{stats.totalWorkouts}</Text>
            <Text style={[styles.statLabel, { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs }]}>Workouts</Text>
          </Card>
          <Card style={[styles.statCard, { padding: spacing.sm, flex: 1 }]}>
            <Ionicons name="flame-outline" size={22} color={colors.warning} />
            <Text style={[styles.statValue, { ...typography.h2, color: colors.text, marginTop: spacing.xs }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs }]}>Day streak</Text>
          </Card>
        </View>

        {/* Weekly sparkline */}
        <Card style={[styles.sparklineCard, { padding: spacing.sm, marginBottom: spacing.md }]}>
          <Text style={[styles.sparklineTitle, { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs }]}>
            This week
          </Text>
          <Sparkline data={stats.weeklyPoints} width={280} height={56} />
          <View style={[styles.dayLabels, { marginTop: spacing.xs, paddingHorizontal: spacing.xxs }]}>
            {DAY_LABELS.map((label) => (
              <Text
                key={label}
                style={[styles.dayLabel, { ...typography.caption, color: colors.textMuted, fontSize: 10 }]}
              >
                {label}
              </Text>
            ))}
          </View>
        </Card>

        <Button
          title="Sign out"
          onPress={handleLogout}
          variant="secondary"
          fullWidth
          icon={<Ionicons name="log-out-outline" size={20} color={colors.primary} />}
          style={{ marginTop: spacing.xs }}
        />
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {},
  scroll: { flex: 1 },
  scrollContent: {},
  avatarCard: { alignItems: 'center' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {},
  displayName: {},
  email: {},
  statsRow: { flexDirection: 'row' },
  statCard: { alignItems: 'center' },
  statValue: {},
  statLabel: {},
  sparklineCard: {},
  sparklineTitle: {},
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayLabel: {},
});
