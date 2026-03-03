import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  Card,
  CircularProgressRing,
} from '../components';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import type { DashboardData } from '../types/dashboard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RANK_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors, spacing, radius, typography, shadows } = theme;
  const { selectedClub } = useClub();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = async () => {
    if (!selectedClub) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
    try {
      const res = await clubService.getDashboard(selectedClub.id);
      const d = res.data;
      if (!d.activeRound) {
        setData({
          round: { id: '', name: 'No active round', daysLeft: 0, endDate: '' },
          teamRank: null,
          todayPoints: 0,
          dailyCap: d.dailyCap,
          topTeams: [],
          recentWorkouts: [],
        });
      } else {
        const topTeams: Array<{ rank: 1 | 2 | 3; teamName: string; points: number }> = d.topTeams
          .filter((t) => t.rank >= 1 && t.rank <= 3)
          .map((t) => ({ rank: t.rank as 1 | 2 | 3, teamName: t.teamName, points: t.points }));
        const teamRank =
          d.myTeamRank != null && d.myTeamName
            ? {
                rank: Math.min(3, d.myTeamRank) as 1 | 2 | 3,
                teamName: d.myTeamName,
                points: d.topTeams.find((t) => t.rank === d.myTeamRank)?.points ?? 0,
              }
            : null;
        setData({
          round: {
            id: d.activeRound.id,
            name: d.activeRound.name,
            daysLeft: d.activeRound.daysLeft,
            endDate: d.activeRound.endDate,
          },
          teamRank,
          todayPoints: d.todayPoints,
          dailyCap: d.dailyCap,
          topTeams,
          recentWorkouts: d.recentWorkouts,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDashboard();
  }, [selectedClub?.id]);

  useEffect(() => {
    if (data) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[styles.roundName, { ...typography.body, color: colors.textMuted, textAlign: 'center' }]}>
          Select or create a club to see your dashboard.
        </Text>
        <View style={[styles.footerActions, { marginTop: spacing.xl, gap: spacing.sm }]}>
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, gap: spacing.xs }]}
            onPress={() => (navigation as any).navigate('CreateClub')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.footerBtnText, { ...typography.label, color: colors.primary }]}>Create a club</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, gap: spacing.xs }]}
            onPress={() => (navigation as any).navigate('JoinClub')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.footerBtnText, { ...typography.label, color: colors.primary }]}>Join a club</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity onPress={() => loadDashboard()} style={{ marginTop: spacing.md }}>
          <Text style={[typography.label, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const progress = data.dailyCap > 0 ? data.todayPoints / data.dailyCap : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            padding: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl + spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Top Section: Round + Badges */}
        <Animated.View style={[styles.topSection, { opacity: fadeAnim, marginBottom: spacing.md }]}>
          <Text style={[styles.roundName, { ...typography.h2, color: colors.text, marginBottom: spacing.sm }]} numberOfLines={1}>
            {data.round.name}
          </Text>
          <View style={[styles.badgesRow, { gap: spacing.sm }]}>
            <View style={[styles.badge, { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, gap: spacing.xs }]}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[styles.badgeText, { ...typography.caption, fontWeight: '700', color: colors.primary }]}>
                {data.round.daysLeft} days left
              </Text>
            </View>
            {data.teamRank && (
              <View style={[styles.badge, { backgroundColor: colors.silverMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, gap: spacing.xs }]}>
                <Text style={styles.badgeEmoji}>{RANK_EMOJI[data.teamRank.rank]}</Text>
                <Text style={[styles.badgeText, { ...typography.caption, fontWeight: '700', color: colors.text }]}>
                  {data.teamRank.rank === 1 ? '1st' : data.teamRank.rank === 2 ? '2nd' : '3rd'} Place
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Main: Points card — 16px grid, primary metric + ring, premium elevated surface */}
        <Card style={[styles.mainCard, { padding: spacing.sm, backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.todayLabel, { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Today's Points
          </Text>
          <Text style={[styles.pointsPrimary, { fontSize: 40, fontWeight: '800', lineHeight: 48, color: colors.accent, marginBottom: spacing.xxs }]}>
            {data.todayPoints.toLocaleString()}{' '}
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textMuted }}>pts</Text>
          </Text>
          <Text style={[styles.capSecondary, { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.sm }]}>
            of {data.dailyCap} daily cap
          </Text>
          <View style={styles.ringWrap}>
            <CircularProgressRing
              progress={progress}
              size={135}
              strokeWidth={10}
              animated
              gradient
              glow
            />
            <View style={StyleSheet.absoluteFill}>
              <View style={styles.ringCenter}>
                <Text style={[styles.ringPercent, { ...typography.h3, color: colors.accent }]}>
                  {Math.round(progress * 100)}%
                </Text>
                <Text style={[styles.ringSub, { ...typography.caption, color: colors.textMuted, marginTop: 2 }]}>
                  daily goal
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Top Teams — premium cards with left accent stripe */}
        <Text style={[styles.sectionTitle, { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Top Teams
        </Text>
        <View style={[styles.topTeamsList, { gap: spacing.sm }]}>
          {data.topTeams.map((team) => {
            const isTop3 = team.rank >= 1 && team.rank <= 3;
            const stripeColor =
              team.rank === 1 ? colors.gold : team.rank === 2 ? colors.silver : colors.bronze;
            const pointsColor =
              team.rank === 1 ? colors.gold : team.rank === 2 ? colors.silver : colors.bronze;
            return (
              <View
                key={team.rank}
                style={[
                  styles.teamCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingLeft: 0,
                    paddingVertical: spacing.sm,
                    paddingRight: spacing.sm,
                    ...(isTop3 ? shadows.sm : {}),
                    ...(Platform.OS === 'android' && isTop3 ? { elevation: 2 } : {}),
                  },
                ]}
              >
                <View style={[styles.teamCardStripe, { backgroundColor: stripeColor, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg }]} />
                <View style={[styles.teamCardRow, { marginLeft: spacing.sm, gap: spacing.sm }]}>
                  <Text style={styles.teamMedal}>{RANK_EMOJI[team.rank as 1 | 2 | 3]}</Text>
                  <Text style={[styles.teamRankNum, { ...typography.caption, fontWeight: '700', color: colors.textMuted }]}>
                    #{team.rank}
                  </Text>
                  <Text style={[styles.teamName, { ...typography.body, fontWeight: '700', color: colors.text, flex: 1 }]} numberOfLines={1}>
                    {team.teamName}
                  </Text>
                  <Text style={[styles.teamPoints, { ...typography.label, fontWeight: '800', color: pointsColor }]}>
                    {team.points.toLocaleString()} pts
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent Activity */}
        <Text style={[styles.sectionTitle, { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Recent Activity
        </Text>
        <Card noPadding elevated>
          {data.recentWorkouts.length === 0 ? (
            <View style={[styles.emptyActivityWrap, { paddingVertical: spacing.lg, paddingHorizontal: spacing.md }]}>
              <Ionicons name="fitness-outline" size={32} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
              <Text style={[styles.emptyActivity, { ...typography.body, color: colors.textMuted, textAlign: 'center' }]}>
                No workouts yet. Use the green button below to log one.
              </Text>
            </View>
          ) : (
            data.recentWorkouts.map((w, index) => (
              <View
                key={w.id}
                style={[
                  styles.activityRow,
                  {
                    borderBottomWidth: index < data.recentWorkouts.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View style={[styles.activityIconWrap, { backgroundColor: colors.accentMuted, borderRadius: radius.full, marginRight: spacing.sm }]}>
                  <Ionicons name="fitness" size={18} color={colors.accent} />
                </View>
                <View style={styles.activityBody}>
                  <Text style={[styles.activityName, { ...typography.body, fontWeight: '700', color: colors.text }]}>{w.activityName}</Text>
                  <Text style={[styles.activityMeta, { ...typography.caption, color: colors.textMuted, marginTop: spacing.xxs }]}>
                    {w.userName ?? 'You'} · {formatRelativeTime(w.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.activityPoints, { ...typography.body, fontWeight: '800', color: colors.accent }]}>+{w.points}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Secondary: Create / Join club */}
        <View style={[styles.footerActions, { marginTop: spacing.xl, gap: spacing.sm }]}>
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, gap: spacing.xs }]}
            onPress={() => (navigation as any).navigate('CreateClub')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.footerBtnText, { ...typography.label, color: colors.primary }]}>Create a club</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, gap: spacing.xs }]}
            onPress={() => (navigation as any).navigate('JoinClub')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.footerBtnText, { ...typography.label, color: colors.primary }]}>Join a club</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const RING_SIZE = 135;
const ACTIVITY_ICON_SIZE = 40;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {},
  topSection: {},
  roundName: {},
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center' },
  badgeText: {},
  badgeEmoji: { fontSize: 14 },
  mainCard: { alignItems: 'center' },
  todayLabel: {},
  pointsPrimary: {},
  capSecondary: {},
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringPercent: {},
  ringSub: {},
  sectionTitle: {},
  topTeamsList: {},
  teamCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  teamCardStripe: {
    width: 5,
  },
  teamCardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  teamMedal: { fontSize: 20 },
  teamRankNum: {},
  teamName: {},
  teamPoints: {},
  activityRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  activityIconWrap: {
    width: ACTIVITY_ICON_SIZE,
    height: ACTIVITY_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: { flex: 1, minWidth: 0 },
  activityName: {},
  activityMeta: {},
  activityPoints: {},
  emptyActivityWrap: { alignItems: 'center', justifyContent: 'center' },
  emptyActivity: {},
  footerActions: { flexDirection: 'row', flexWrap: 'wrap' },
  footerBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerBtnText: {},
});
