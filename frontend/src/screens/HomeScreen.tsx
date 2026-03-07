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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import {
  Card,
  ChallengeLaunchModal,
  CircularProgressRing,
  HeroMetricCard,
  MetricCard,
  MilestoneModal,
  RoundCountdown,
  WeeklyActivityGrid,
  type MilestoneKind,
} from '../components';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { clubService, type FeedItem } from '../services/clubService';
import type { DashboardData } from '../types/dashboard';
import { RANK_EMOJI } from '../constants/rank';

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

function feedItemSummary(item: FeedItem): string {
  const m = item.metadata;
  switch (item.type) {
    case 'WORKOUT_LOGGED':
      return `logged a workout · ${Math.round(Number(m.points) ?? 0)} pts`;
    case 'STREAK_REACHED':
      return `hit a ${m.streakDays ?? '?'}-day streak`;
    case 'TEAM_JOINED':
      return `joined ${m.teamName ?? 'a team'}`;
    case 'ROUND_STARTED':
      return `started round ${m.roundName ?? ''}`;
    case 'TEAM_CREATED':
      return `created team ${m.teamName ?? ''}`;
    default:
      return 'updated activity';
  }
}

function feedItemIcon(type: FeedItem['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'WORKOUT_LOGGED': return 'fitness-outline';
    case 'STREAK_REACHED': return 'flame-outline';
    case 'TEAM_JOINED': return 'people-outline';
    case 'ROUND_STARTED': return 'flag-outline';
    case 'TEAM_CREATED': return 'add-circle-outline';
    default: return 'ellipse-outline';
  }
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
      contextHeadline: 'Round completed',
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

const PROGRESS_BAR_HEIGHT = 8;

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows, isDark } = theme;
  const user = useAuthStore((s) => s.user);
  const { clubs, selectedClub, isLoading: clubsLoading } = useClub();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<MilestoneKind | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
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

  const loadFeed = useCallback(async () => {
    if (!selectedClub) return;
    try {
      const res = await clubService.getFeed(selectedClub.id, { limit: 15 });
      setFeedItems(res.data?.items ?? []);
    } catch {
      setFeedItems([]);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    if (!selectedClub) {
      setData(null);
      setFeedItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const cached = useDashboardStore.getState().getDashboardForClub(selectedClub.id);
    if (cached) setData(cached);
    loadDashboard();
    loadFeed();
  }, [selectedClub?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (!selectedClub) return;
      const cached = useDashboardStore.getState().getDashboardForClub(selectedClub.id);
      if (cached) setData(cached);
      loadDashboard();
      loadFeed();
    }, [selectedClub?.id, loadFeed])
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
    await Promise.all([loadDashboard(), loadFeed()]);
    setRefreshing(false);
  };

  if (!clubsLoading && (clubs ?? []).length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.emptyScrollContent, { padding: s.lg, paddingBottom: s.xxl + s.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — subtle gradient */}
        <LinearGradient
          colors={[colors.primarySoft, colors.background] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.emptyHero, { marginBottom: s.xl, borderRadius: r.lg, padding: s.lg, overflow: 'hidden' }]}
        >
          <View style={[styles.emptyHeroIconWrap, { backgroundColor: colors.card, borderRadius: r.lg, padding: s.lg, marginBottom: s.md, ...shadows.sm }]}>
            <Ionicons name="fitness" size={48} color={colors.primary} />
          </View>
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginBottom: s.xs }]}>Welcome to FitClub</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
            Compete with friends, track workouts, and climb the leaderboard.
          </Text>
        </LinearGradient>

        {/* How FitClub Works */}
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.sm }]}>How FitClub works</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.xl }}>
          <View style={[styles.emptyConceptCard, { flex: 1, minWidth: 100, backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardJoin, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
            <View style={[styles.emptyConceptIconWrap, { width: 44, height: 44, borderRadius: r.md, backgroundColor: isDark ? colors.surface : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: s.xs }]}>
              <Ionicons name="people" size={26} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: colors.text, marginBottom: s.xxs }]}>Join a Club</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>Fitness challenges happen inside clubs with friends.</Text>
          </View>
          <View style={[styles.emptyConceptCard, { flex: 1, minWidth: 100, backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardCompete, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
            <View style={[styles.emptyConceptIconWrap, { width: 44, height: 44, borderRadius: r.md, backgroundColor: isDark ? colors.surface : colors.goldMuted, alignItems: 'center', justifyContent: 'center', marginBottom: s.xs }]}>
              <Ionicons name="trophy" size={26} color={colors.competition} />
            </View>
            <Text style={[typography.label, { color: colors.text, marginBottom: s.xxs }]}>Compete in Rounds</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>Each round is a new fitness competition.</Text>
          </View>
          <View style={[styles.emptyConceptCard, { flex: 1, minWidth: 100, backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardLog, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
            <View style={[styles.emptyConceptIconWrap, { width: 44, height: 44, borderRadius: r.md, backgroundColor: isDark ? colors.surface : colors.energySoft, alignItems: 'center', justifyContent: 'center', marginBottom: s.xs }]}>
              <Ionicons name="flame" size={26} color={colors.energy} />
            </View>
            <Text style={[typography.label, { color: colors.text, marginBottom: s.xxs }]}>Log Workouts</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>Earn points and climb the leaderboard.</Text>
          </View>
        </View>

        {/* Primary actions */}
        <View style={{ gap: s.sm, marginBottom: s.lg }}>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('CreateClub')}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: r.md, paddingVertical: s.md, paddingHorizontal: s.lg, alignItems: 'center', justifyContent: 'center' }]}
            activeOpacity={0.85}
          >
            <Text style={[typography.label, { color: colors.textInverse, fontWeight: '700' }]}>Create a Club</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('JoinClub')}
            style={[styles.emptySecondaryBtn, { borderRadius: r.md, paddingVertical: s.md, paddingHorizontal: s.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <Text style={[typography.label, { color: colors.primary, fontWeight: '600' }]}>Join with Invite Code</Text>
          </TouchableOpacity>
        </View>

        {/* Social proof */}
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>300+ athletes already competing</Text>
      </ScrollView>
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

  const weeklyActivity = data.weeklyActivity ?? [];
  const topTeamsAll = data.topTeamsAll ?? [];
  const maxWeeklyWorkouts = Math.max(1, ...weeklyActivity.map((d) => d.workoutCount ?? 0));
  const contributionPct = data.myTeamTotal > 0 ? (data.myRoundPoints / data.myTeamTotal) * 100 : 0;
  const myTeamRankNum = data.myTeamRank;
  const teamAbove =
    myTeamRankNum != null && myTeamRankNum > 1
      ? topTeamsAll.find((t) => t.rank === myTeamRankNum - 1)
      : null;
  const gapToNext = teamAbove ? teamAbove.points - data.myTeamTotal : 0;
  const welcome = getWelcomeBanner(user?.displayName, data);

  const handleBannerCta = () => {
    if (welcome.ctaLabel === 'Log workout') (navigation as any).navigate('WorkoutNew');
    else if (welcome.ctaLabel === 'Leaderboard' || welcome.ctaLabel === 'View standings')
      (navigation as any).navigate('LeaderboardTab');
  };

  const weeklyPoints = weeklyActivity.reduce((sum, d) => sum + (d.points ?? 0), 0);

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
        {/* A. Hero — compact round banner: title, days left, pts this week, team, CTA */}
        {data.round.id && data.round.name !== 'No active round' ? (
          <View style={{ marginBottom: data.teamRank ? s.sm : s.md }}>
            <HeroMetricCard
              roundTitle={data.round.name}
              daysLeft={data.round.daysLeft}
              endDate={data.round.endDate}
              pointsThisWeek={weeklyPoints}
              ctaLabel={welcome.ctaLabel ?? undefined}
              onCtaPress={handleBannerCta}
            />
          </View>
        ) : (
          <LinearGradient
            colors={[colors.heroGradientStart, colors.heroGradientEnd] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.welcomeBanner,
              {
                borderRadius: r.md,
                paddingHorizontal: s.md,
                paddingVertical: s.sm,
                marginBottom: s.sm,
                overflow: 'hidden',
              },
            ]}
          >
            <Text style={[typography.h3, { color: colors.textInverse, marginBottom: s.xxs, fontWeight: '800' }]} numberOfLines={1}>
              {welcome.greeting}
            </Text>
            <Text style={[typography.caption, { color: colors.heroTextMuted, fontWeight: '600' }]} numberOfLines={1}>
              {welcome.contextHeadline}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.heroTextMuted, fontWeight: '500', marginTop: s.xxs }]} numberOfLines={2}>
              {welcome.contextSubtext}
            </Text>
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
          </LinearGradient>
        )}

        {/* Your Team — prominent card with team name and rank (combined) */}
        {data.teamRank && myTeamRankNum != null && (
          <Card
            style={[
              styles.yourTeamCard,
              {
                padding: s.md,
                marginBottom: s.sm,
                backgroundColor: colors.card,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: s.xs }]}>
              Your Team
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.xxs }}>
              <Ionicons name="people" size={22} color={colors.primary} />
              <Text style={[typography.h2, { color: colors.text, fontWeight: '800', fontSize: 20 }]} numberOfLines={1}>
                {data.teamRank.teamName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, flexWrap: 'wrap' }}>
              {myTeamRankNum <= 3 ? (
                <Text style={{ fontSize: 18 }}>{RANK_EMOJI[myTeamRankNum as 1 | 2 | 3]}</Text>
              ) : null}
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                Rank #{myTeamRankNum} in this round
              </Text>
            </View>
            {gapToNext > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xs, fontWeight: '600' }]}>
                {gapToNext} pts to next rank
              </Text>
            )}
          </Card>
        )}

        {/* Daily Goal — ring + cap; "Daily cap reached" in success when met */}
        {data.round.id && data.dailyCap > 0 && (
          <View
            style={[
              styles.dailyProgressCard,
              {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? colors.surfaceElevated : colors.primarySoft,
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
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Daily Goal</Text>
              <Text style={[typography.h3, { color: data.todayPoints >= data.dailyCap ? colors.success : colors.energy, fontWeight: '800' }]}>
                {data.todayPoints} / {data.dailyCap}
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    marginTop: s.xxs,
                    fontWeight: '600',
                    color: data.todayPoints >= data.dailyCap ? colors.success : colors.textSecondary,
                  },
                ]}
              >
                {data.todayPoints >= data.dailyCap ? 'Daily cap reached' : `${data.dailyCap - data.todayPoints} pts left today`}
              </Text>
            </View>
          </View>
        )}

        <Animated.View style={[styles.main, { opacity: fadeAnim }]}>
          {/* B. Personal Performance — metric cards with accent + watermark */}
          <View style={[styles.statRow, { gap: s.xs, marginBottom: s.sm }]}>
            <MetricCard
              value={data.workoutCount}
              label="Workouts"
              accent="energy"
              icon="fitness"
              style={{ flex: 1 }}
            />
            <MetricCard
              value={data.estimatedCalories}
              label="Calories"
              accent="primary"
              icon="flash"
              style={{ flex: 1 }}
            />
            <MetricCard
              value={data.currentStreak}
              label="Day streak"
              accent="success"
              icon="flame"
              style={{ flex: 1 }}
            />
          </View>

          {/* C. Weekly activity — grid with rounded bars, shadow, streak highlight */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xs, fontWeight: '700' }]}>
            Weekly Activity
          </Text>
          <View style={{ marginBottom: s.xs }}>
            <WeeklyActivityGrid
              data={weeklyActivity}
              maxWorkouts={maxWeeklyWorkouts}
              currentStreak={data.currentStreak}
              animate
            />
          </View>

          {/* D. Your Contribution — strong hierarchy: points, label, %, rank, progress bar */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xs, fontWeight: '700' }]}>
            Your contribution
          </Text>
          <Card style={[styles.contributionCard, { padding: s.md, marginBottom: s.sm, backgroundColor: isDark ? colors.surfaceElevated : colors.energySoft, borderRadius: r.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: s.xs }}>
              <View>
                <Text style={[typography.hero, { color: colors.energy, fontWeight: '800', letterSpacing: -0.5 }]}>
                  {data.myRoundPoints.toLocaleString()}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs, fontWeight: '600' }]}>
                  Your points this round
                </Text>
              </View>
              {data.teamRank && myTeamRankNum != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
                  <Text style={[typography.section, { color: colors.competition, fontWeight: '800' }]}>
                    Rank #{myTeamRankNum}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.label, { color: colors.energy, marginTop: s.sm, fontWeight: '700' }]}>
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
              Team total <Text style={{ color: colors.energy, fontWeight: '700' }}>{data.myTeamTotal.toLocaleString()} pts</Text>
            </Text>
          </Card>

          {/* Activity feed (FITCLUB_MASTER_SPEC §7.9) */}
          <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
            Activity
          </Text>
          <View
            style={[
              styles.feedCard,
              {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: r.md,
                paddingVertical: s.xs,
                marginBottom: s.sm,
                ...shadows.card,
              },
            ]}
          >
            {feedItems.length === 0 ? (
              <View style={{ padding: s.md, alignItems: 'center' }}>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>No recent activity yet.</Text>
              </View>
            ) : (
              feedItems.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: s.sm,
                    paddingHorizontal: s.md,
                    borderBottomWidth: index < feedItems.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <View style={{ marginRight: s.sm }}>
                    <Ionicons name={feedItemIcon(item.type)} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.bodySmall, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      <Text style={{ fontWeight: '700' }}>{item.actorName}</Text>
                      {' '}{feedItemSummary(item)}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Quick Log — last three workouts with one-tap repeat */}
          {data.recentWorkouts.length > 0 && data.round.id && (
            <>
              <Text style={[styles.sectionTitle, typography.caption, { color: colors.textPrimary, marginBottom: s.xxs, fontWeight: '700' }]}>
                Quick log
              </Text>
              <View style={{ gap: s.xs, marginBottom: s.sm }}>
                {data.recentWorkouts.slice(0, 3).map((w, index) => (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.85}
                    onPress={() => (navigation as any).navigate('WorkoutNew', { repeatLast: true, repeatWorkoutIndex: index })}
                    style={[
                      styles.quickLogCard,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.card,
                        borderRadius: r.md,
                        padding: s.sm,
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
                      <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary }]} numberOfLines={1}>
                        {w.activityName}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs }]}>
                        {formatRelativeTime(w.createdAt)} · +{w.points} pts
                      </Text>
                    </View>
                    <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>Repeat</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  emptyScrollContent: {},
  emptyHero: { alignItems: 'center' },
  emptyHeroIconWrap: {},
  emptyConceptCard: {},
  emptyConceptIconWrap: {},
  emptySecondaryBtn: {},
  welcomeBanner: {},
  bannerCta: { alignSelf: 'flex-start' },
  main: {},
  statRow: { flexDirection: 'row' },
  sectionTitle: {},
  contributionCard: {},
  feedCard: {},
  progressTrack: {},
  progressFill: {},
  yourTeamCard: {},
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
