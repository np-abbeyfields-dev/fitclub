import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { LeaderboardPodium, RoundCountdown } from '../components';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import { roundService } from '../services/roundService';
import type { LeaderboardEntry, LeaderboardTab } from '../types/leaderboard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Gap label for non-first: "+N behind #1" or "+N ahead of #N" */
function getPodiumGapLabel(
  entry: LeaderboardEntry,
  firstPlacePoints: number,
  fourthPlacePoints?: number
): string | null {
  if (entry.rank === 1) return null;
  const gapToFirst = firstPlacePoints - entry.points;
  if (entry.rank === 3 && fourthPlacePoints != null && entry.points > fourthPlacePoints) {
    return `+${(entry.points - fourthPlacePoints).toLocaleString()} ahead of #4`;
  }
  return `+${gapToFirst.toLocaleString()} behind #1`;
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { colors, spacing: s, radius: r, typography, shadows, isDark } = theme;
  const { selectedClub } = useClub();

  const [tab, setTab] = useState<LeaderboardTab>('teams');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [roundName, setRoundName] = useState<string>('');
  const [roundDaysLeft, setRoundDaysLeft] = useState<number>(0);
  const [roundEndDate, setRoundEndDate] = useState<string | null>(null);
  const [individuals, setIndividuals] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const prevIndRanks = React.useRef<Map<string, number>>(new Map());
  const prevTeamRanks = React.useRef<Map<string, number>>(new Map());

  const loadLeaderboard = useCallback(async () => {
    if (!selectedClub) {
      setActiveRoundId(null);
      setRoundName('');
      setRoundDaysLeft(0);
      setRoundEndDate(null);
      setIndividuals([]);
      setTeams([]);
      prevIndRanks.current = new Map();
      prevTeamRanks.current = new Map();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const round = dash.data.activeRound ?? null;
      const roundId = round?.id ?? null;
      setActiveRoundId(roundId);
      setRoundName(round?.name ?? '');
      setRoundDaysLeft(round?.daysLeft ?? 0);
      setRoundEndDate(round?.endDate ?? null);
      if (!roundId) {
        setIndividuals([]);
        setTeams([]);
      } else {
        const [indRes, teamRes] = await Promise.all([
          roundService.getLeaderboard(roundId, 'individuals'),
          roundService.getLeaderboard(roundId, 'teams'),
        ]);
        const maxInd = indRes.data?.length ? Math.max(...indRes.data.map((e) => e.points)) : 0;
        const maxTeam = teamRes.data?.length ? Math.max(...teamRes.data.map((e) => e.points)) : 0;
        const indList = (indRes.data ?? []).map((e, i) => ({
          ...e,
          rank: i + 1,
          maxPoints: maxInd || e.points,
          rankChange: prevIndRanks.current.has(e.id)
            ? prevIndRanks.current.get(e.id)! - (i + 1)
            : undefined,
        }));
        const teamList = (teamRes.data ?? []).map((e, i) => ({
          ...e,
          rank: i + 1,
          maxPoints: maxTeam || e.points,
          rankChange: prevTeamRanks.current.has(e.id)
            ? prevTeamRanks.current.get(e.id)! - (i + 1)
            : undefined,
        }));
        prevIndRanks.current = new Map(indList.map((e) => [e.id, e.rank]));
        prevTeamRanks.current = new Map(teamList.map((e) => [e.id, e.rank]));
        setIndividuals(indList);
        setTeams(teamList);
      }
    } catch {
      setIndividuals([]);
      setTeams([]);
      setActiveRoundId(null);
      setRoundName('');
      setRoundDaysLeft(0);
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Refetch when screen gains focus (e.g. after logging a workout) so rank change ▲/▼ reflects previous vs new position.
  useFocusEffect(
    useCallback(() => {
      if (selectedClub?.id && activeRoundId) loadLeaderboard();
    }, [selectedClub?.id, activeRoundId, loadLeaderboard])
  );

  const data = tab === 'individuals' ? individuals : teams;
  const myEntry = data.find((e) => e.isCurrentUser) ?? null;
  const totalPoints = data.reduce((sum, e) => sum + e.points, 0);
  const top3 = data.filter((e) => e.rank >= 1 && e.rank <= 3);
  const rest = data.filter((e) => e.rank > 3);
  const firstPlacePoints = data[0]?.points ?? 0;
  const gapToFirst = myEntry && myEntry.rank > 1 ? firstPlacePoints - myEntry.points : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  const onTabChange = (next: LeaderboardTab) => {
    if (next === tab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
  };

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, flex: 1, justifyContent: 'center', padding: s.md }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }]}>
          Select a club to see the leaderboard.
        </Text>
      </View>
    );
  }

  if (loading && individuals.length === 0 && teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Loading…</Text>
      </View>
    );
  }

  if (!activeRoundId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, flex: 1, justifyContent: 'center', alignItems: 'center', padding: s.md }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', fontWeight: '600', marginBottom: s.sm }]}>
          No active round for this club.
        </Text>
        <TouchableOpacity onPress={() => (navigation as any).getParent()?.navigate('PastRounds')} activeOpacity={0.8}>
          <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>View Past Rounds</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: s.sm, paddingBottom: s.xxl + s.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* 1. Round header — dark surface, days left, total pts (orange) */}
        <View
          style={[
            styles.roundHeader,
            {
              backgroundColor: colors.surfaceElevated ?? colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: r.md,
              paddingVertical: s.sm,
              paddingHorizontal: s.md,
              marginBottom: s.sm,
              ...shadows.card,
            },
          ]}
        >
          <View style={[styles.roundHeaderRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: s.xs }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.title, { color: colors.text, fontWeight: '800', fontSize: 22 }]} numberOfLines={1}>
                {roundName || 'Active round'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.xs, flexWrap: 'wrap' }}>
                {activeRoundId ? (
                  <RoundCountdown daysLeft={roundDaysLeft} endDate={roundEndDate ?? undefined} variant="pill" />
                ) : null}
                <View style={{ backgroundColor: colors.border, width: 1, height: 14 }} />
                <Text style={[typography.label, { color: colors.energy, fontWeight: '800' }]}>
                  {totalPoints.toLocaleString()} pts
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => (navigation as any).getParent()?.navigate('PastRounds')}
              activeOpacity={0.8}
              style={{ paddingVertical: s.xs, paddingHorizontal: s.xs }}
            >
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                View Past Rounds
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. You're leading / gap to #1 — dark bar, high-contrast text, gold icon when leading */}
        {myEntry && (
          <View
            style={[
              styles.insightStrip,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? colors.surface : (colors.surfaceElevated ?? colors.card),
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: r.md,
                paddingVertical: s.sm,
                paddingHorizontal: s.md,
                marginBottom: s.sm,
                ...shadows.sm,
              },
            ]}
          >
            <Ionicons
              name="trophy"
              size={20}
              color={myEntry.rank === 1 ? colors.gold : colors.textSecondary}
            />
            <Text
              style={[
                typography.body,
                {
                  color: colors.textPrimary,
                  fontWeight: '700',
                  marginLeft: s.sm,
                  fontSize: 15,
                },
              ]}
            >
              {myEntry.rank === 1 ? "You're leading this round" : `+${gapToFirst.toLocaleString()} behind #1`}
            </Text>
          </View>
        )}

        {/* 3. Teams / Individuals toggle — dark surface, primary only for selected */}
        <View
          style={[
            styles.segmentWrap,
            {
              flexDirection: 'row',
              backgroundColor: colors.surfaceElevated ?? colors.card,
              borderRadius: r.md,
              padding: 4,
              marginBottom: s.sm,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadows.sm,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => onTabChange('teams')}
            activeOpacity={0.85}
            style={[
              styles.segmentBtn,
              {
                flex: 1,
                paddingVertical: s.sm,
                borderRadius: r.sm,
                backgroundColor: tab === 'teams' ? colors.primary : colors.transparent,
              },
            ]}
          >
            <Ionicons name="people" size={18} color={tab === 'teams' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '800', color: tab === 'teams' ? colors.textInverse : colors.textPrimary }]}>
              Teams
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onTabChange('individuals')}
            activeOpacity={0.85}
            style={[
              styles.segmentBtn,
              {
                flex: 1,
                paddingVertical: s.sm,
                borderRadius: r.sm,
                backgroundColor: tab === 'individuals' ? colors.primary : colors.transparent,
              },
            ]}
          >
            <Ionicons name="person" size={18} color={tab === 'individuals' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '800', color: tab === 'individuals' ? colors.textInverse : colors.textPrimary }]}>
              Individuals
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Podium — medals, enlarged #1, gold/silver/bronze, gap labels */}
        {top3.length > 0 && (
          <LeaderboardPodium
            top3={top3}
            firstPlacePoints={firstPlacePoints}
            getGapLabel={(entry) =>
              getPodiumGapLabel(entry, firstPlacePoints, rest[0]?.points)
            }
          />
        )}

        {/* 5. Ranked list — rank, name, points, rank change (green up / red down) */}
        <View
          style={[
            styles.listHeader,
            {
              flexDirection: 'row',
              paddingHorizontal: s.sm,
              paddingVertical: s.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              marginBottom: 0,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', width: 36 }]}>#</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', flex: 1 }]}>
            {tab === 'teams' ? 'Team' : 'Name'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', textAlign: 'right', minWidth: 64 }]}>
            Pts
          </Text>
        </View>
        {rest.map((item) => (
          <View
            key={item.id}
            style={[
              styles.listRow,
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: s.sm,
                paddingHorizontal: s.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
                backgroundColor: item.isCurrentUser ? (colors.surfaceElevated ?? colors.card) : colors.transparent,
              },
            ]}
          >
            <View style={{ width: 36, alignItems: 'center' }}>
              <Text style={[typography.body, { fontWeight: '800', color: colors.textPrimary }]}>
                #{item.rank}
              </Text>
              {item.rankChange != null && item.rankChange !== 0 && (
                <Text
                  style={[
                    typography.caption,
                    {
                      fontWeight: '800',
                      fontSize: 10,
                      color: item.rankChange > 0 ? colors.success : colors.danger,
                      marginTop: 2,
                    },
                  ]}
                >
                  {item.rankChange > 0 ? `▲ ${item.rankChange}` : `▼ ${Math.abs(item.rankChange)}`} today
                </Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: s.sm, flexWrap: 'wrap' }}>
              <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary }]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.isCurrentUser && (
                <View style={{ backgroundColor: colors.border, paddingHorizontal: s.xs, paddingVertical: s.xxs, borderRadius: r.sm }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', fontSize: 10 }]}>
                    {tab === 'teams' ? 'Your Team' : 'You'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.title, { fontWeight: '800', color: colors.energy, textAlign: 'right', minWidth: 64, fontSize: 18 }]}>
              {item.points.toLocaleString()} pts
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {},
  roundHeader: {},
  roundHeaderRow: {},
  segmentWrap: {},
  segmentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  insightStrip: {},
  listHeader: {},
  listRow: {},
});
