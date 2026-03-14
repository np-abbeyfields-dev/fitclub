import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import {
  ChallengeLaunchModal,
  CircularProgressRing,
  MilestoneModal,
  WeeklyActivityGrid,
  type MilestoneKind,
} from '../components';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { clubService, type FeedItem } from '../services/clubService';
import { roundService } from '../services/roundService';
import type { DashboardData, LastCompletedRoundRecap } from '../types/dashboard';
import { RANK_MEDAL } from '../constants/rank';

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
      contextSubtext: 'See how your team finished. Get ready for the next challenge round.',
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

type RoundRecapDesign = typeof HOME_DESIGN_LIGHT;

function RoundRecapBlock({
  recap,
  cardStyle,
  d,
  s,
  typography,
  colors,
  styles: styleRef,
  onViewFullStandings,
}: {
  recap: LastCompletedRoundRecap;
  cardStyle: object;
  d: RoundRecapDesign;
  s: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  colors: ReturnType<typeof useTheme>['colors'];
  styles: typeof styles;
  onViewFullStandings: () => void;
}) {
  const medalColor = (rank: number) => (rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze);
  return (
    <View style={{ marginBottom: d.sectionGap }}>
      {/* 1. Round Complete Card */}
      <View style={[styleRef.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
        <Text style={[typography.caption, { color: d.textSecondary, marginBottom: s.xs, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }]}>
          Round complete
        </Text>
        <Text style={[typography.title, { color: d.textPrimary, fontWeight: '800', marginBottom: s.sm }]} numberOfLines={1}>
          {recap.roundName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
          <Text style={{ fontSize: 22 }}>🥇</Text>
          <Text style={[typography.body, { color: d.textPrimary, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
            {recap.winningTeamName}
          </Text>
          <Text style={[typography.label, { color: d.primary, fontWeight: '800' }]}>
            {recap.winningTeamPoints.toLocaleString()} pts
          </Text>
        </View>
      </View>

      {/* 2. Your Team Summary */}
      {(recap.myTeamName != null || recap.myTeamRank != null) && (
        <View style={[styleRef.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
          <Text style={[typography.caption, { color: d.textSecondary, marginBottom: s.xs, fontWeight: '700' }]}>
            Your team
          </Text>
          <Text style={[typography.title, { color: d.textPrimary, fontWeight: '700', marginBottom: s.xxs }]} numberOfLines={1}>
            {recap.myTeamName ?? '—'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: s.sm, flexWrap: 'wrap' }}>
            {recap.myTeamRank != null && (
              <Text style={[typography.body, { color: d.textSecondary, fontWeight: '600' }]}>
                Rank #{recap.myTeamRank}
              </Text>
            )}
            {recap.myTeamPoints != null && (
              <Text style={[typography.label, { color: d.primary, fontWeight: '800' }]}>
                {recap.myTeamPoints.toLocaleString()} pts
              </Text>
            )}
          </View>
        </View>
      )}

      {/* 3. Your Contribution */}
      <View style={[styleRef.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
        <Text style={[typography.caption, { color: d.textSecondary, marginBottom: s.xs, fontWeight: '700' }]}>
          Your contribution
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.md, alignItems: 'baseline' }}>
          <Text style={[typography.title, { color: d.textPrimary, fontWeight: '800' }]}>
            {recap.myPoints.toLocaleString()} pts
          </Text>
          <Text style={[typography.body, { color: d.textSecondary, fontWeight: '600' }]}>
            {recap.myWorkoutCount} workout{recap.myWorkoutCount === 1 ? '' : 's'}
          </Text>
          {recap.myTeamPoints != null && recap.myTeamPoints > 0 && (
            <Text style={[typography.label, { color: d.primary, fontWeight: '700' }]}>
              {recap.contributionPercent}% of team
            </Text>
          )}
        </View>
      </View>

      {/* 4. Top 3 Podium */}
      {recap.topTeams.length > 0 && (
        <View style={[styleRef.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
          <Text style={[typography.caption, { color: d.textSecondary, marginBottom: s.sm, fontWeight: '700' }]}>
            Top 3
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: s.xs }}>
            {([2, 1, 3] as const).map((rank) => {
              const entry = recap.topTeams.find((t) => t.rank === rank);
              if (!entry) return null;
              const isFirst = rank === 1;
              return (
                <View key={entry.rank} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: isFirst ? 28 : 24, marginBottom: 2 }}>{RANK_MEDAL[rank]}</Text>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: d.cardBackground,
                      borderWidth: 1,
                      borderColor: d.border,
                      borderRadius: 10,
                      paddingVertical: s.sm,
                      paddingHorizontal: s.xs,
                      alignItems: 'center',
                      minHeight: rank === 1 ? 76 : 64,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700' }]}>#{rank}</Text>
                    <Text style={[typography.caption, { color: d.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
                      {entry.teamName}
                    </Text>
                    <Text style={[typography.label, { color: medalColor(rank), fontWeight: '800', fontSize: 13 }]}>
                      {entry.points.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 5. CTA */}
      <TouchableOpacity
        style={[
          styleRef.heroCta,
          {
            height: d.buttonHeight,
            paddingVertical: 0,
            paddingHorizontal: s.spacingXL,
            borderRadius: d.buttonRadius,
            backgroundColor: d.primary,
            justifyContent: 'center',
            alignItems: 'center',
            ...d.buttonShadow,
          },
        ]}
        onPress={onViewFullStandings}
        activeOpacity={0.85}
      >
        <Text style={[typography.section, { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }]}>
          View full standings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** Premium light fitness design — Home screen */
const HOME_DESIGN_LIGHT = {
  primary: '#FF6B35',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  progressColor: '#FF6B35',
  progressRemaining: '#E2E8F0',
  cardRadius: 22,
  cardPadding: 20,
  sectionGap: 24,
  buttonHeight: 56,
  buttonRadius: 18,
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

/** Dark mode — premium fitness (Strava / Nike Run Club style) */
const HOME_DESIGN_DARK = {
  primary: '#FF6B35',
  background: '#0F172A',
  cardBackground: '#1E293B',
  cardElevated: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  progressColor: '#FF6B35',
  progressRemaining: '#334155',
  cardRadius: 22,
  cardPadding: 20,
  sectionGap: 24,
  buttonHeight: 56,
  buttonRadius: 18,
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }),
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows, isDark } = theme;
  const user = useAuthStore((s) => s.user);
  const { clubs, selectedClub, isLoading: clubsLoading, clubsError, refreshClubs } = useClub();
  const userEmail = useAuthStore((s) => s.user?.email ?? null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<MilestoneKind | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [recapFetched, setRecapFetched] = useState<LastCompletedRoundRecap | null>(null);
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
          teamPointsToday: 0,
          topContributorsToday: [],
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
          lastCompletedRoundRecap: d.lastCompletedRoundRecap ?? null,
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
          teamPointsToday: d.teamPointsToday ?? 0,
          topContributorsToday: d.topContributorsToday ?? [],
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
      // Don't overwrite optimistic today values: refetch can lag or return 0 for teamPointsToday (e.g. solo user).
      const cached = useDashboardStore.getState().getDashboardForClub(selectedClub.id);
      if (cached && cached.round?.id === data.round?.id) {
        data = {
          ...data,
          todayPoints: Math.max(data.todayPoints, cached.todayPoints),
          teamPointsToday: Math.max(data.teamPointsToday, cached.teamPointsToday),
        };
      }
      setData(data);
      useDashboardStore.getState().setDashboard(data, selectedClub.id);
      if (data.round?.id && data.round.name !== 'No active round') setRecapFetched(null);
      if (data.lastCompletedRoundRecap) setRecapFetched(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClub || !data) return;
    if (data.round?.id && data.round.name !== 'No active round') {
      setRecapFetched(null);
      return;
    }
    if (data.lastCompletedRoundRecap) {
      setRecapFetched(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await roundService.listByClub(selectedClub.id);
        const rounds = (res.data ?? []).filter(
          (r) =>
            r.status === 'completed' ||
            (r.status === 'active' && new Date(r.endDate) < new Date(new Date().setHours(0, 0, 0, 0)))
        );
        const sorted = [...rounds].sort(
          (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
        const lastRound = sorted[0];
        if (!lastRound || cancelled) return;
        const [teamsRes, indRes] = await Promise.all([
          roundService.getLeaderboard(lastRound.id, 'teams'),
          roundService.getLeaderboard(lastRound.id, 'individuals'),
        ]);
        if (cancelled) return;
        const teams = teamsRes.data ?? [];
        const individuals = indRes.data ?? [];
        const winner = teams[0];
        const topTeams = teams.slice(0, 3).map((t, i) => ({
          rank: i + 1,
          teamName: t.name,
          points: t.points,
        }));
        const myTeam = teams.find((t) => t.isCurrentUser);
        const myEntry = individuals.find((i) => i.isCurrentUser);
        const myPoints = myEntry?.points ?? 0;
        const myTeamPoints = myTeam?.points ?? null;
        const contributionPercent =
          myTeamPoints != null && myTeamPoints > 0 ? Math.round((myPoints / myTeamPoints) * 100) : 0;
        const recap: LastCompletedRoundRecap = {
          roundId: lastRound.id,
          roundName: lastRound.name,
          winningTeamName: winner?.name ?? '—',
          winningTeamPoints: winner?.points ?? 0,
          topTeams,
          myTeamName: myTeam?.name ?? null,
          myTeamRank: myTeam?.rank ?? null,
          myTeamPoints,
          myPoints,
          myWorkoutCount: 0,
          contributionPercent,
        };
        if (!cancelled) setRecapFetched(recap);
      } catch {
        if (!cancelled) setRecapFetched(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClub?.id, data?.round?.id, data?.round?.name, data?.lastCompletedRoundRecap]);

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
        style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
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

        {/* Show error when clubs failed to load (e.g. wrong user session or network) */}
        {clubsError ? (
          <View style={{ marginBottom: s.xl, padding: s.md, backgroundColor: isDark ? colors.surfaceElevated : colors.errorMuted, borderRadius: r.md, borderWidth: 1, borderColor: colors.error }}>
            <Text style={[typography.bodySmall, { color: colors.text, marginBottom: s.xs }]}>{clubsError}</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: s.sm }]}>
              {userEmail
                ? `You're signed in as ${userEmail}. Try retrying or log out and sign in again if this is wrong.`
                : 'Try retrying or log out and sign in again.'}
            </Text>
            <TouchableOpacity
              onPress={() => refreshClubs()}
              style={{ alignSelf: 'flex-start', paddingVertical: s.xs, paddingHorizontal: s.sm }}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.primary, fontWeight: '600' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* How FitClub Works — stacked vertically so cards are readable on all screen sizes */}
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.sm }]}>How FitClub works</Text>
        <View style={{ gap: s.md, marginBottom: s.xl }}>
          <View style={[styles.emptyConceptCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardJoin, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
            <View style={[styles.emptyConceptIconWrap, { width: 44, height: 44, borderRadius: r.md, backgroundColor: isDark ? colors.surface : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: s.xs }]}>
              <Ionicons name="people" size={26} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: colors.text, marginBottom: s.xxs }]}>Join a Club</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>Fitness challenge rounds happen inside clubs with friends.</Text>
          </View>
          <View style={[styles.emptyConceptCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardCompete, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
            <View style={[styles.emptyConceptIconWrap, { width: 44, height: 44, borderRadius: r.md, backgroundColor: isDark ? colors.surface : colors.goldMuted, alignItems: 'center', justifyContent: 'center', marginBottom: s.xs }]}>
              <Ionicons name="trophy" size={26} color={colors.competition} />
            </View>
            <Text style={[typography.label, { color: colors.text, marginBottom: s.xxs }]}>Compete in Rounds</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>Each round is a new fitness competition.</Text>
          </View>
          <View style={[styles.emptyConceptCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.onboardingCardLog, borderRadius: r.md, padding: s.md, ...shadows.card }]}>
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
      <View style={[styles.container, styles.centered, { backgroundColor: colors.backgroundPrimary }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.backgroundPrimary, padding: s.md }]}>
        <Text style={[typography.body, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity onPress={() => loadDashboard()} style={{ marginTop: s.md }}>
          <Text style={[typography.label, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const weeklyActivity = data.weeklyActivity ?? [];
  const maxWeeklyWorkouts = Math.max(1, ...weeklyActivity.map((d) => d.workoutCount ?? 0));
  const myTeamRankNum = data.myTeamRank;
  const welcome = getWelcomeBanner(user?.displayName, data);

  const handleBannerCta = () => {
    if (welcome.ctaLabel === 'Log workout') (navigation as any).navigate('WorkoutNew');
    else if (welcome.ctaLabel === 'Leaderboard' || welcome.ctaLabel === 'View standings')
      (navigation as any).navigate('LeaderboardTab');
  };

  const d = isDark ? HOME_DESIGN_DARK : HOME_DESIGN_LIGHT;
  const dark = d; // alias for any code that still references dark (e.g. cached bundle)
  const cardStyle = {
    backgroundColor: d.cardBackground,
    borderRadius: d.cardRadius,
    padding: d.cardPadding,
    ...d.cardShadow,
  };

  const teamRankDiff = (() => {
    if (!data.teamRank || data.myTeamRank == null || !data.topTeamsAll?.length) return null;
    const rank = data.myTeamRank;
    const ourPoints = data.teamRank.points;
    if (rank === 1) {
      const next = data.topTeamsAll.find((t) => t.rank === 2);
      if (!next) return null;
      return { type: 'ahead' as const, pts: ourPoints - next.points, teamName: next.teamName };
    }
    const above = data.topTeamsAll.find((t) => t.rank === rank - 1);
    if (!above) return null;
    return { type: 'behind' as const, pts: above.points - ourPoints, teamName: above.teamName };
  })();

  return (
    <View style={[styles.container, { backgroundColor: d.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: d.cardPadding, paddingBottom: s.xxl + d.sectionGap }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={d.primary} />
        }
      >
        {data.round.id && data.round.name !== 'No active round' ? (
          <Animated.View style={[styles.main, { opacity: fadeAnim }]}>
            {/* 1. Team Status Card */}
            {data.teamRank && myTeamRankNum != null && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => (navigation as any).navigate('LeaderboardTab')}
                style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}
              >
                <Text style={[typography.caption, { color: d.textSecondary, marginBottom: s.xs }]}>
                  {data.round.name} · {data.round.daysLeft} day{data.round.daysLeft === 1 ? '' : 's'} left
                </Text>
                <Text style={[typography.title, { color: d.textPrimary, fontWeight: '700', marginBottom: s.xs }]} numberOfLines={1}>
                  {data.teamRank.teamName}
                </Text>
                <Text style={[typography.hero, { color: d.primary, fontWeight: '800', fontSize: 40, lineHeight: 48, marginBottom: s.spacingSmall }]}>
                  Rank #{myTeamRankNum}
                </Text>
                {teamRankDiff && (
                  <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600' }]}>
                    {teamRankDiff.type === 'ahead'
                      ? `+${teamRankDiff.pts} pts ahead of ${teamRankDiff.teamName}`
                      : `${teamRankDiff.pts} pts behind ${teamRankDiff.teamName}`}
                  </Text>
                )}
                <Text style={[typography.caption, { color: d.primary, fontWeight: '600', marginTop: s.spacingSmall, fontSize: 13 }]}>
                  View leaderboard →
                </Text>
              </TouchableOpacity>
            )}

            {/* 2. Impact Progress Ring */}
            <View style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap, alignItems: 'center' }]}>
              <View style={[styles.heroRingWrap, { height: 200 }]}>
                <CircularProgressRing
                  progress={
                    data.teamPointsToday > 0
                      ? Math.min(1, data.todayPoints / data.teamPointsToday)
                      : data.todayPoints > 0
                        ? 1
                        : 0
                  }
                  size={200}
                  strokeWidth={14}
                  animated
                  gradient={false}
                  glow={false}
                  progressColor={d.progressColor}
                  trackColor={d.progressRemaining}
                />
                <View style={[StyleSheet.absoluteFill, styles.heroRingCenter, { zIndex: 1 }]} pointerEvents="none">
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: typography.hero.fontFamily, fontSize: 52, fontWeight: '800', color: d.textPrimary, textAlign: 'center' }}>
                      {String(data.todayPoints ?? 0)}
                    </Text>
                    <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600', textAlign: 'center', fontSize: 14, marginTop: 2 }]}>
                      Team Points Today
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600', textAlign: 'center', marginTop: s.spacingSmall, fontSize: 14 }]}>
                {data.teamPointsToday === 0
                  ? data.todayPoints > 0
                    ? "You're the only one who's logged today — that's 100% of your team's points so far."
                    : 'Log the first workout for your team today.'
                  : `You contributed ${Math.round((data.todayPoints / data.teamPointsToday) * 100)}% of your team's points today.`}
              </Text>
            </View>

            {/* 3. Primary CTA */}
            <TouchableOpacity
              style={[
                styles.heroCta,
                {
                  marginBottom: d.sectionGap,
                  height: d.buttonHeight,
                  paddingVertical: 0,
                  paddingHorizontal: s.spacingXL,
                  borderRadius: d.buttonRadius,
                  backgroundColor: d.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...d.buttonShadow,
                },
              ]}
              onPress={() => (navigation as any).navigate('WorkoutNew')}
              activeOpacity={0.85}
            >
              <Text style={[typography.section, { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }]}>Log Workout</Text>
            </TouchableOpacity>

            {/* 4. Team Momentum — top contributors today */}
            <View style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
              <Text style={[typography.section, { color: d.textPrimary, fontWeight: '700', marginBottom: s.spacingMedium }]}>
                Team Momentum
              </Text>
              {(data.topContributorsToday?.length ?? 0) === 0 ? (
                <Text style={[typography.caption, { color: d.textSecondary }]}>
                  No points logged yet today. Log a workout to lead the board.
                </Text>
              ) : (
                data.topContributorsToday.slice(0, 8).map((c, index) => (
                  <View
                    key={`${c.displayName}-${index}`}
                    style={[
                      styles.feedRow,
                      {
                        borderBottomWidth: index < Math.min(8, data.topContributorsToday.length) - 1 ? 0.5 : 0,
                        borderBottomColor: d.border,
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Text style={[typography.caption, { color: d.primary, fontWeight: '700', marginRight: s.spacingSmall, minWidth: 20 }]}>
                      #{index + 1}
                    </Text>
                    <Text style={[typography.body, { color: d.textPrimary, fontWeight: '500', flex: 1 }]} numberOfLines={1}>
                      {c.displayName}
                    </Text>
                    <Text style={[typography.section, { color: d.primary, fontWeight: '700', fontSize: 14 }]}>
                      {c.points} pts
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* 5. Weekly Activity */}
            <View style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
              <Text style={[typography.section, { color: d.textPrimary, fontWeight: '700', marginBottom: s.spacingMedium }]}>
                Weekly Activity
              </Text>
              <WeeklyActivityGrid
                data={weeklyActivity}
                maxWorkouts={maxWeeklyWorkouts}
                currentStreak={data.currentStreak}
                animate
                overrides={{
                  backgroundColor: d.cardBackground,
                  labelColor: d.textSecondary,
                  activeColor: d.primary,
                  cellBorderRadius: 10,
                  gap: 10,
                }}
              />
            </View>

            {/* 6. Recent Activity */}
            <View style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
              <Text style={[typography.section, { color: d.textPrimary, fontWeight: '700', marginBottom: s.spacingMedium }]}>
                Recent Activity
              </Text>
              {feedItems.length === 0 ? (
                <Text style={[typography.caption, { color: d.textSecondary }]}>No recent activity yet.</Text>
              ) : (
                feedItems.slice(0, 8).map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.feedRow,
                      {
                        borderBottomWidth: index < Math.min(8, feedItems.length) - 1 ? 0.5 : 0,
                        borderBottomColor: d.border,
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <Ionicons name={feedItemIcon(item.type)} size={20} color={d.primary} style={{ marginRight: s.spacingSmall }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.caption, { color: d.textPrimary, fontWeight: '500' }]} numberOfLines={1}>
                        {item.actorName} {feedItemSummary(item)}
                      </Text>
                      <Text style={[typography.caption, { color: d.textSecondary, fontSize: 11, marginTop: 2 }]}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Animated.View>
        ) : (data.lastCompletedRoundRecap ?? recapFetched) ? (
          <RoundRecapBlock
            recap={data.lastCompletedRoundRecap ?? recapFetched!}
            cardStyle={cardStyle}
            d={d}
            s={s}
            typography={typography}
            colors={colors}
            styles={styles}
            onViewFullStandings={() => {
              const recap = data.lastCompletedRoundRecap ?? recapFetched!;
              (navigation as any).getParent()?.navigate('LeaderboardTab', {
                screen: 'RoundLeaderboard',
                params: { roundId: recap.roundId, roundName: recap.roundName },
              });
            }}
          />
        ) : (
          <View style={[styles.fitnessCard, cardStyle, { marginBottom: d.sectionGap }]}>
            <Text style={[typography.title, { color: d.textPrimary, fontWeight: '700', marginBottom: s.xs }]} numberOfLines={1}>
              {welcome.greeting}
            </Text>
            <Text style={[typography.body, { color: d.textSecondary, marginBottom: s.spacingSmall }]} numberOfLines={2}>
              {welcome.contextSubtext}
            </Text>
            {welcome.ctaLabel && (
              <TouchableOpacity
                style={[
                  styles.heroCta,
                  {
                    marginTop: s.spacingSmall,
                    height: d.buttonHeight,
                    paddingVertical: 0,
                    paddingHorizontal: s.spacingXL,
                    borderRadius: d.buttonRadius,
                    backgroundColor: d.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...d.buttonShadow,
                  },
                ]}
                onPress={handleBannerCta}
                activeOpacity={0.85}
              >
                <Text style={[typography.section, { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }]}>{welcome.ctaLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  heroCard: {},
  heroRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
  },
  heroRingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCta: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {},
  fitnessCard: {},
  fitnessStatCard: {},
  statRow: { flexDirection: 'row' },
  feedRow: { flexDirection: 'row', alignItems: 'center' },
});
