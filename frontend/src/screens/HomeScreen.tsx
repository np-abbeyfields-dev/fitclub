import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card, ChallengeLaunchModal, CircularProgressRing, MilestoneModal, type MilestoneKind } from '../components';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { clubService } from '../services/clubService';
import type { DashboardData } from '../types/dashboard';

const CHALLENGE_LAUNCH_SEEN_KEY = (roundId: string) => `challengeLaunchSeen_${roundId}`;
const MILESTONES_SEEN_KEY = 'fitclub_milestones_seen';

type MilestonesSeen = Partial<Record<MilestoneKind, boolean>>;

async function getMilestonesSeen(): Promise<MilestonesSeen> {
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_SEEN_KEY);
    if (raw) return JSON.parse(raw) as MilestonesSeen;
  } catch {}
  return {};
}

async function setMilestoneSeen(kind: MilestoneKind): Promise<void> {
  const seen = await getMilestonesSeen();
  seen[kind] = true;
  await AsyncStorage.setItem(MILESTONES_SEEN_KEY, JSON.stringify(seen));
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

function shortDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

type WelcomeBannerConfig = {
  greeting: string;
  contextHeadline: string;
  contextSubtext: string;
  ctaLabel?: string;
};

function getWelcomeBanner(displayName: string | undefined, data: DashboardData): WelcomeBannerConfig {
  const name = displayName?.trim() || 'there';
  const noActiveRound = data.round.name === 'No active round' || !data.round.id;

  if (noActiveRound) {
    return {
      greeting: `Welcome back, ${name}`,
      contextHeadline: 'Round ended',
      contextSubtext: 'See how your team finished. Get ready for the next challenge.',
      ctaLabel: 'View standings',
    };
  }

  if (data.workoutCount === 0) {
    return {
      greeting: `Hey ${name}`,
      contextHeadline: "You're in — log your first workout",
      contextSubtext: 'Start earning points for your team. Every workout counts.',
      ctaLabel: 'Log workout',
    };
  }

  const days = data.round.daysLeft;
  const subtext =
    days > 14
      ? 'Plenty of time to climb the leaderboard.'
      : days > 7
        ? 'One week to go — keep the momentum.'
        : days > 1
          ? 'Final stretch. Make it count.'
          : days === 1
            ? 'Last day! Push for those points.'
            : 'Final hours. Go for it.';

  return {
    greeting: `Welcome back, ${name}`,
    contextHeadline: `${data.round.daysLeft} day${data.round.daysLeft === 1 ? '' : 's'} left`,
    contextSubtext: subtext,
    ctaLabel: 'Leaderboard',
  };
}

const BAR_CHART_HEIGHT = 72;
const PROGRESS_BAR_HEIGHT = 8;

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;
  const user = useAuthStore((s) => s.user);
  const { clubs, selectedClub } = useClub();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<MilestoneKind | null>(null);
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
      let data: DashboardData;
      if (!d.activeRound) {
        data = {
          round: { id: '', name: 'No active round', daysLeft: 0, endDate: '' },
          teamRank: null,
          myTeamRank: null,
          todayPoints: 0,
          dailyCap: d.dailyCap,
          topTeams: [],
          topTeamsAll: [],
          recentWorkouts: [],
          myRoundPoints: d.myRoundPoints ?? 0,
          myTeamTotal: d.myTeamTotal ?? 0,
          workoutCount: d.workoutCount ?? 0,
          weeklyActivity: d.weeklyActivity ?? [],
          currentStreak: d.currentStreak ?? 0,
          estimatedCalories: d.estimatedCalories ?? 0,
        };
      } else {
        const topTeamsAll = d.topTeams;
        const topTeams = topTeamsAll
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
        data = {
          round: {
            id: d.activeRound.id,
            name: d.activeRound.name,
            startDate: d.activeRound.startDate,
            daysLeft: d.activeRound.daysLeft,
            endDate: d.activeRound.endDate,
          },
          teamRank,
          myTeamRank: d.myTeamRank ?? null,
          todayPoints: d.todayPoints,
          dailyCap: d.dailyCap,
          topTeams,
          topTeamsAll,
          recentWorkouts: d.recentWorkouts,
          myRoundPoints: d.myRoundPoints ?? 0,
          myTeamTotal: d.myTeamTotal ?? 0,
          workoutCount: d.workoutCount ?? 0,
          weeklyActivity: d.weeklyActivity ?? [],
          currentStreak: d.currentStreak ?? 0,
          estimatedCalories: d.estimatedCalories ?? 0,
        };
      }
      setData(data);
      useDashboardStore.getState().setDashboard(data, selectedClub.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClub) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const cached = useDashboardStore.getState().getDashboardForClub(selectedClub.id);
    if (cached) setData(cached);
    loadDashboard();
  }, [selectedClub?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (!selectedClub) return;
      const cached = useDashboardStore.getState().getDashboardForClub(selectedClub.id);
      if (cached) setData(cached);
      loadDashboard();
    }, [selectedClub?.id])
  );

  useEffect(() => {
    if (!data?.round?.id || data.round.name === 'No active round') {
      setShowLaunchModal(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(CHALLENGE_LAUNCH_SEEN_KEY(data.round.id));
        if (!cancelled && !seen) setShowLaunchModal(true);
      } catch {
        if (!cancelled) setShowLaunchModal(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data?.round?.id]);

  const dismissLaunchModal = useCallback(() => {
    if (!data?.round?.id) return;
    AsyncStorage.setItem(CHALLENGE_LAUNCH_SEEN_KEY(data.round.id), '1').catch(() => {});
    setShowLaunchModal(false);
  }, [data?.round?.id]);

  useEffect(() => {
    if (!data?.round?.id || data.round.name === 'No active round') return;
    let cancelled = false;
    (async () => {
      const seen = await getMilestonesSeen();
      if (cancelled) return;
      if (data.workoutCount >= 5 && !seen.workouts5) {
        setMilestoneToShow('workouts5');
        return;
      }
      if (data.myRoundPoints >= 100 && !seen.points100) {
        setMilestoneToShow('points100');
        return;
      }
      if (data.currentStreak >= 7 && !seen.streak7) {
        setMilestoneToShow('streak7');
        return;
      }
      if (data.currentStreak >= 5 && !seen.streak5) {
        setMilestoneToShow('streak5');
        return;
      }
      if (data.currentStreak >= 3 && !seen.streak3) {
        setMilestoneToShow('streak3');
        return;
      }
    })();
    return () => { cancelled = true; };
  }, [data?.round?.id, data?.workoutCount, data?.myRoundPoints, data?.currentStreak]);

  const dismissMilestoneModal = useCallback(async () => {
    if (milestoneToShow) {
      await setMilestoneSeen(milestoneToShow);
      setMilestoneToShow(null);
    }
  }, [milestoneToShow]);

  useEffect(() => {
    if (data) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (clubs.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, padding: s.md }]}>
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: s.xs }]}>No clubs yet</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: s.md }]}>
          Create or join a club in Profile to see your dashboard.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: r.md, paddingVertical: s.sm, paddingHorizontal: s.lg }]}
          onPress={() => (navigation as any).navigate('ProfileTab')}
          activeOpacity={0.85}
        >
          <Text style={[typography.label, { color: colors.textInverse }]}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, padding: s.md }]}>
        <Text style={[typography.body, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity onPress={() => loadDashboard()} style={{ marginTop: s.md }}>
          <Text style={[typography.label, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const maxWeekly = Math.max(1, ...data.weeklyActivity.map((d) => d.points));
  const contributionPct = data.myTeamTotal > 0 ? (data.myRoundPoints / data.myTeamTotal) * 100 : 0;
  const myTeamRankNum = data.myTeamRank;
  const teamAbove =
    myTeamRankNum != null && myTeamRankNum > 1
      ? data.topTeamsAll.find((t) => t.rank === myTeamRankNum - 1)
      : null;
  const gapToNext = teamAbove ? teamAbove.points - data.myTeamTotal : 0;
  const welcome = getWelcomeBanner(user?.displayName, data);

  const handleBannerCta = () => {
    if (welcome.ctaLabel === 'Log workout') (navigation as any).navigate('WorkoutNew');
    else if (welcome.ctaLabel === 'Leaderboard' || welcome.ctaLabel === 'View standings')
      (navigation as any).navigate('LeaderboardTab');
  };

  const weeklyPoints = data.weeklyActivity.reduce((sum, d) => sum + d.points, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: s.sm, paddingBottom: s.xxl + s.md, gap: 0 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* A. Hero — background primary, text white, metric large */}
        <View
          style={[
            styles.welcomeBanner,
            {
              backgroundColor: colors.primary,
              borderRadius: r.sm,
              paddingHorizontal: s.md,
              paddingVertical: s.md,
              marginBottom: data.teamRank ? s.xs : s.sm,
              overflow: 'hidden',
            },
          ]}
        >
          {data.round.id && data.round.name !== 'No active round' ? (
            <>
              <Text style={[typography.caption, { color: colors.heroTextMuted, marginBottom: s.xxs, fontWeight: '600' }]} numberOfLines={1}>
                {welcome.greeting}
              </Text>
              <Text style={[typography.h3, { color: colors.textInverse, marginBottom: s.xxs, fontWeight: '800' }]} numberOfLines={2}>
                {data.round.name}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.heroTextMuted, marginBottom: s.xxs, fontWeight: '700' }]}>
                {data.round.daysLeft} day{data.round.daysLeft === 1 ? '' : 's'} left
              </Text>
              {data.teamRank?.teamName && (
                <Text style={[typography.caption, { color: colors.heroTextMuted, marginBottom: s.xxs, fontWeight: '600' }]} numberOfLines={1}>
                  Team: {data.teamRank.teamName}
                </Text>
              )}
              <Text style={[typography.bodySmall, { color: colors.heroTextMuted, fontWeight: '500' }]} numberOfLines={2}>
                {welcome.contextSubtext}
              </Text>
            </>
          ) : (
            <>
              <Text style={[typography.h3, { color: colors.textInverse, marginBottom: s.xxs, fontWeight: '800' }]} numberOfLines={1}>
                {welcome.greeting}
              </Text>
              <Text style={[typography.caption, { color: colors.heroTextMuted, marginBottom: s.xxs, fontWeight: '600' }]} numberOfLines={1}>
                {welcome.contextHeadline}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.heroTextMuted, fontWeight: '500' }]} numberOfLines={2}>
                {welcome.contextSubtext}
              </Text>
            </>
          )}
          <View style={[styles.welcomeStatRow, { flexDirection: 'row', alignItems: 'baseline', marginTop: s.sm, gap: s.xs }]}>
            <Text style={[typography.metric, { color: colors.textInverse, letterSpacing: -0.5 }]}>{weeklyPoints}</Text>
            <Text style={[typography.caption, { color: colors.heroTextMuted, fontWeight: '700' }]}>pts this week</Text>
          </View>
          {welcome.ctaLabel && (
            <TouchableOpacity
              style={[
                styles.bannerCta,
                {
                  marginTop: s.sm,
                  paddingVertical: s.xs,
                  paddingHorizontal: s.sm,
                  borderRadius: r.sm,
                  borderWidth: 1.5,
                  borderColor: colors.heroTextMuted,
                  backgroundColor: colors.transparent,
                },
              ]}
              onPress={handleBannerCta}
              activeOpacity={0.85}
            >
              <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '600' }]}>
                {welcome.ctaLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Competitive indicator — directly below hero */}
        {data.teamRank && (
          <View
            style={[
              styles.competitiveStrip,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: r.md,
                paddingVertical: s.sm,
                paddingHorizontal: s.md,
                marginBottom: s.sm,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadows.card,
              },
            ]}
          >
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Team rank</Text>
              <Text style={[typography.h2, { color: colors.primary, fontWeight: '800' }]}>
                #{myTeamRankNum} {myTeamRankNum != null && myTeamRankNum <= 3 ? RANK_EMOJI[myTeamRankNum as 1 | 2 | 3] : ''}
              </Text>
            </View>
            {gapToNext > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>To next rank</Text>
                <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '700' }]}>{gapToNext} pts</Text>
              </View>
            )}
          </View>
        )}

        {/* Daily progress — ring + label toward daily cap */}
        {data.round.id && data.dailyCap > 0 && (
          <View
            style={[
              styles.dailyProgressCard,
              {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderRadius: r.md,
                padding: s.sm,
                marginBottom: s.sm,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadows.card,
              },
            ]}
          >
            <CircularProgressRing
              progress={Math.min(1, data.todayPoints / data.dailyCap)}
              size={56}
              strokeWidth={6}
              animated
              gradient
              glow={false}
            />
            <View style={{ marginLeft: s.sm, flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Daily points</Text>
              <Text style={[typography.h3, { color: colors.energy, fontWeight: '800' }]}>
                {data.todayPoints} / {data.dailyCap}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs, fontWeight: '500' }]}>
                {data.todayPoints >= data.dailyCap ? 'Daily cap reached' : `${data.dailyCap - data.todayPoints} pts left today`}
              </Text>
            </View>
          </View>
        )}

        <Animated.View style={[styles.main, { opacity: fadeAnim }]}>
          {/* B. Personal Performance Cards (primary focus) */}
          <View style={[styles.statRow, { gap: s.xs, marginBottom: s.xs }]}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: r.md,
                  paddingVertical: s.sm,
                  paddingHorizontal: s.xs,
                  flex: 1,
                  ...shadows.card,
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={styles.statCardWatermark}>
                <Ionicons name="fitness" size={44} color={colors.energy} style={{ opacity: 0.06 }} />
              </View>
              <Text style={[typography.metric, { color: colors.energy }]}>{data.workoutCount}</Text>
              <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 0, fontWeight: '700' }]}>Workouts</Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: r.md,
                  paddingVertical: s.sm,
                  paddingHorizontal: s.xs,
                  flex: 1,
                  ...shadows.card,
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={styles.statCardWatermark}>
                <Ionicons name="flash" size={44} color={colors.energy} style={{ opacity: 0.06 }} />
              </View>
              <Text style={[typography.metric, { color: colors.energy }]}>{data.estimatedCalories}</Text>
              <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 0, fontWeight: '700' }]}>Calories</Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: r.md,
                  paddingVertical: s.sm,
                  paddingHorizontal: s.xs,
                  flex: 1,
                  ...shadows.card,
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={styles.statCardWatermark}>
                <Ionicons name="flame" size={44} color={colors.success} style={{ opacity: 0.08 }} />
              </View>
              <Text style={[typography.metric, { color: colors.success }]}>{data.currentStreak}</Text>
              <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 0, fontWeight: '700' }]}>Day streak</Text>
            </View>
          </View>

          {/* C. Weekly Activity — styled chart container, accent active bars */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
            Weekly activity
          </Text>
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: r.md,
                paddingVertical: s.sm,
                paddingHorizontal: s.sm,
                marginBottom: s.xs,
                ...shadows.card,
              },
            ]}
          >
            <View
              style={[
                styles.barRow,
                {
                  height: BAR_CHART_HEIGHT + s.xs,
                  alignItems: 'flex-end',
                  flexDirection: 'row',
                  gap: s.xxs,
                },
              ]}
            >
              {data.weeklyActivity.map((day, index) => {
                const barHeight =
                  maxWeekly > 0 ? Math.max(4, (day.points / maxWeekly) * BAR_CHART_HEIGHT) : 4;
                const hasPoints = day.points > 0;
                const isInStreak =
                  hasPoints && data.currentStreak > 0 && 6 - index < data.currentStreak;
                return (
                  <View
                    key={day.date}
                    style={[styles.barWrap, { flex: 1, height: BAR_CHART_HEIGHT, justifyContent: 'flex-end' }]}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: hasPoints
                            ? isInStreak
                              ? colors.success
                              : colors.energy
                            : colors.chartInactive,
                          borderRadius: r.sm,
                          borderWidth: isInStreak ? 2 : 0,
                          borderColor: colors.success,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            <View style={[styles.barLabels, { flexDirection: 'row', justifyContent: 'space-between', marginTop: s.xs }]}>
              {data.weeklyActivity.map((day) => (
                <Text key={day.date} style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  {shortDay(day.date)}
                </Text>
              ))}
            </View>
          </View>

          {/* D. Contribution Card — emphasis on points, competitive framing */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
            Your contribution
          </Text>
          <Card style={[styles.contributionCard, { padding: s.md, marginBottom: s.xs, backgroundColor: colors.card, borderRadius: r.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: s.xs }}>
              <Text style={[typography.metric, { color: colors.energy }]}>
                {data.myRoundPoints.toLocaleString()}
                <Text style={[typography.label, { color: colors.textSecondary }]}> pts</Text>
              </Text>
              {data.teamRank && myTeamRankNum != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xxs }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Rank</Text>
                  <Text style={[typography.h3, { color: colors.primary, fontWeight: '800' }]}>#{myTeamRankNum}</Text>
                  {gapToNext > 0 && (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>· {gapToNext} to next</Text>
                  )}
                </View>
              )}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs, fontWeight: '500' }]}>
              Your points this round
            </Text>
            <Text style={[typography.label, { color: colors.primary, marginTop: s.sm, fontWeight: '700' }]}>
              {contributionPct.toFixed(0)}% of team total
            </Text>
            <View
              style={[
                styles.progressTrack,
                {
                  height: PROGRESS_BAR_HEIGHT,
                  backgroundColor: colors.chartInactive,
                  borderRadius: r.sm,
                  overflow: 'hidden',
                  marginTop: s.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, contributionPct)}%`,
                    height: '100%',
                    backgroundColor: colors.energy,
                    borderRadius: r.sm,
                  },
                ]}
              />
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xs, fontWeight: '500' }]}>
              Team total {data.myTeamTotal.toLocaleString()} pts
            </Text>
          </Card>

          {/* E. Team Summary */}
          {data.teamRank && (
            <>
              <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
                Team summary
              </Text>
              <Card style={[styles.teamSummaryCard, { padding: s.md, marginBottom: s.xs, backgroundColor: colors.card, borderRadius: r.md }]}>
                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: s.xxs }]} numberOfLines={1}>
                  {data.teamRank.teamName}
                </Text>
                <View style={[styles.teamSummaryRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Rank</Text>
                    <Text style={[typography.h2, { color: colors.competition }]}>
                      #{myTeamRankNum} {myTeamRankNum != null && myTeamRankNum <= 3 ? RANK_EMOJI[myTeamRankNum as 1 | 2 | 3] : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Team points</Text>
                    <Text style={[typography.metric, { color: colors.energy }]}>{data.myTeamTotal.toLocaleString()}</Text>
                  </View>
                </View>
              </Card>
            </>
          )}

          {/* Quick Log — last workout with one-tap repeat */}
          {data.recentWorkouts.length > 0 && data.round.id && (
            <>
              <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
                Quick log
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => (navigation as any).navigate('WorkoutNew', { repeatLast: true })}
                style={[
                  styles.quickLogCard,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    borderRadius: r.md,
                    padding: s.sm,
                    marginBottom: s.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...shadows.card,
                  },
                ]}
              >
                <View
                  style={[
                    styles.quickLogIconWrap,
                    {
                      backgroundColor: colors.accentMuted,
                      borderRadius: r.full,
                      marginRight: s.sm,
                    },
                  ]}
                >
                  <Ionicons name="repeat" size={20} color={colors.accent} />
                </View>
                <View style={styles.quickLogBody}>
                  <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary }]}>
                    {data.recentWorkouts[0].activityName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs }]}>
                    Last: {formatRelativeTime(data.recentWorkouts[0].createdAt)} · +{data.recentWorkouts[0].points} pts
                  </Text>
                </View>
                <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>Repeat</Text>
              </TouchableOpacity>
            </>
          )}

          {/* F. Recent Activity */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
            Recent activity
          </Text>
          <Card noPadding elevated style={{ backgroundColor: colors.card, borderRadius: r.md }}>
            {data.recentWorkouts.length === 0 ? (
              <View style={[styles.emptyActivityWrap, { paddingVertical: s.md, paddingHorizontal: s.sm }]}>
                <Ionicons name="fitness-outline" size={24} color={colors.textSecondary} style={{ marginBottom: s.xs }} />
                <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                  No workouts yet. Log one to start earning points.
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
                      padding: s.sm,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.activityIconWrap,
                      {
                        backgroundColor: colors.accentMuted,
                        borderRadius: r.full,
                        marginRight: s.sm,
                      },
                    ]}
                  >
                    <Ionicons name="fitness" size={16} color={colors.accent} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={[typography.body, { fontWeight: '600', color: colors.textPrimary }]}>{w.activityName}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs }]}>
                      {w.userName ?? 'You'} · {formatRelativeTime(w.createdAt)}
                    </Text>
                  </View>
                  <Text style={[typography.label, { color: colors.accent }]}>+{w.points}</Text>
                </View>
              ))
            )}
          </Card>
        </Animated.View>
      </ScrollView>

      <ChallengeLaunchModal
        visible={showLaunchModal}
        round={data.round}
        teamName={data.teamRank?.teamName ?? null}
        onDismiss={dismissLaunchModal}
        onViewLeaderboard={() => (navigation as any).navigate('LeaderboardTab')}
        onLogWorkout={() => (navigation as any).navigate('WorkoutNew')}
      />
      <MilestoneModal
        visible={milestoneToShow != null}
        milestone={milestoneToShow}
        onDismiss={dismissMilestoneModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: {},
  welcomeBanner: {},
  bannerCta: { alignSelf: 'flex-start' },
  main: {},
  statRow: { flexDirection: 'row' },
  statCard: {},
  statCardWatermark: { position: 'absolute', right: -4, bottom: -4 },
  sectionTitle: {},
  chartCard: {},
  barRow: {},
  barWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  barLabels: {},
  contributionCard: {},
  progressTrack: {},
  progressFill: {},
  competitiveStrip: {},
  teamSummaryCard: {},
  teamSummaryRow: {},
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  activityIconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1, minWidth: 0 },
  emptyActivityWrap: { alignItems: 'center' },
  primaryBtn: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  dailyProgressCard: {},
  quickLogCard: {},
  quickLogIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  quickLogBody: { flex: 1, minWidth: 0 },
});
