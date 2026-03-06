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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import { roundService } from '../services/roundService';
import type { LeaderboardEntry, LeaderboardTab } from '../types/leaderboard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RANK_MEDAL: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const PODIUM_HEIGHTS = { 1: 88, 2: 72, 3: 72 } as const;

export default function LeaderboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;
  const { selectedClub } = useClub();

  const [tab, setTab] = useState<LeaderboardTab>('teams');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [roundName, setRoundName] = useState<string>('');
  const [roundDaysLeft, setRoundDaysLeft] = useState<number>(0);
  const [individuals, setIndividuals] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const prevIndRanks = React.useRef<Map<string, number>>(new Map());
  const prevTeamRanks = React.useRef<Map<string, number>>(new Map());

  const loadLeaderboard = useCallback(async () => {
    if (!selectedClub) {
      setActiveRoundId(null);
      setRoundName('');
      setRoundDaysLeft(0);
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
        {/* 1. Header: round name, days left, total pts, View Past Rounds link */}
        <View
          style={[
            styles.roundHeader,
            {
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: r.sm,
              paddingVertical: s.sm,
              paddingHorizontal: s.md,
              marginBottom: s.sm,
              ...shadows.sm,
            },
          ]}
        >
          <View style={[styles.roundHeaderRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: s.xs }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                {roundName || 'Active round'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: 2 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  {roundDaysLeft} day{roundDaysLeft === 1 ? '' : 's'} left
                </Text>
                <View style={[styles.roundTotal, { backgroundColor: colors.border, width: 1, height: 12 }]} />
                <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>
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

        {/* 2. Competitive Insight Strip: leading or gap to #1 */}
        {myEntry && (
          <View
            style={[
              styles.insightStrip,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: myEntry.rank === 1 ? colors.accentMuted : colors.statCardBackground,
                borderWidth: 1,
                borderColor: myEntry.rank === 1 ? colors.accent : colors.border,
                borderRadius: r.sm,
                paddingVertical: s.xs,
                paddingHorizontal: s.sm,
                marginBottom: s.sm,
              },
            ]}
          >
            {myEntry.rank === 1 ? (
              <>
                <Ionicons name="trophy" size={16} color={colors.accent} />
                <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '800', marginLeft: s.sm }]}>
                  You're leading
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="trophy-outline" size={14} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', marginLeft: s.xxs }]}>
                  {gapToFirst.toLocaleString()} pts to #1
                </Text>
              </>
            )}
          </View>
        )}

        <View style={[styles.segmentWrap, { flexDirection: 'row', backgroundColor: colors.card, borderRadius: r.md, padding: s.xxs, marginBottom: s.sm, borderWidth: 1, borderColor: colors.border, ...shadows.card }]}>
          <TouchableOpacity
            onPress={() => onTabChange('teams')}
            activeOpacity={0.85}
            style={[
              styles.segmentBtn,
              {
                flex: 1,
                paddingVertical: s.sm,
                borderRadius: r.sm - 2,
                backgroundColor: tab === 'teams' ? colors.primary : 'transparent',
              },
            ]}
          >
            <Ionicons name="people" size={18} color={tab === 'teams' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '700', color: tab === 'teams' ? colors.textInverse : colors.textPrimary }]}>
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
                borderRadius: r.sm - 2,
                backgroundColor: tab === 'individuals' ? colors.primary : 'transparent',
              },
            ]}
          >
            <Ionicons name="person" size={18} color={tab === 'individuals' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '700', color: tab === 'individuals' ? colors.textInverse : colors.textPrimary }]}>
              Individuals
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Segmented Toggle — Teams (default) / Individuals */}
        {top3.length > 0 && (
          <View style={[styles.podiumRow, { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: s.sm, gap: s.xs }]}>
            {/* #2 left */}
            {top3.find((e) => e.rank === 2) && (
              <View style={[styles.podiumSlot, { flex: 1, alignItems: 'center' }]}>
                <Text style={styles.medalPodium}>{RANK_MEDAL[2]}</Text>
                <View
                  style={[
                    styles.podiumBlock,
                    {
                      height: PODIUM_HEIGHTS[2],
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderBottomLeftRadius: r.sm,
                      borderBottomRightRadius: r.sm,
                      justifyContent: 'flex-end',
                      paddingBottom: s.xs,
                      marginTop: s.xxs,
                      ...shadows.card,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>#2</Text>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
                    {top3.find((e) => e.rank === 2)!.name}
                  </Text>
                  <Text style={[typography.label, { color: colors.competition, fontWeight: '800' }]}>
                    {top3.find((e) => e.rank === 2)!.points.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
            {/* #1 center */}
            {top3.find((e) => e.rank === 1) && (
              <View style={[styles.podiumSlot, { flex: 1, alignItems: 'center' }]}>
                <Text style={styles.medalPodium}>{RANK_MEDAL[1]}</Text>
                <View
                  style={[
                    styles.podiumBlock,
                    {
                      height: PODIUM_HEIGHTS[1],
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderBottomLeftRadius: r.sm,
                      borderBottomRightRadius: r.sm,
                      justifyContent: 'flex-end',
                      paddingBottom: s.xs,
                      marginTop: s.xxs,
                      ...shadows.card,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>#1</Text>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
                    {top3.find((e) => e.rank === 1)!.name}
                  </Text>
                  <Text style={[typography.label, { color: colors.competition, fontWeight: '800' }]}>
                    {top3.find((e) => e.rank === 1)!.points.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
            {/* #3 right */}
            {top3.find((e) => e.rank === 3) && (
              <View style={[styles.podiumSlot, { flex: 1, alignItems: 'center' }]}>
                <Text style={styles.medalPodium}>{RANK_MEDAL[3]}</Text>
                <View
                  style={[
                    styles.podiumBlock,
                    {
                      height: PODIUM_HEIGHTS[3],
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderBottomLeftRadius: r.sm,
                      borderBottomRightRadius: r.sm,
                      justifyContent: 'flex-end',
                      paddingBottom: s.xs,
                      marginTop: s.xxs,
                      ...shadows.card,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>#3</Text>
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
                    {top3.find((e) => e.rank === 3)!.name}
                  </Text>
                  <Text style={[typography.label, { color: colors.competition, fontWeight: '800' }]}>
                    {top3.find((e) => e.rank === 3)!.points.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 4. Full ranked list (rank 4+) */}
        <View style={[styles.listHeader, { flexDirection: 'row', paddingHorizontal: s.xs, paddingVertical: s.xs, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: s.xs }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', width: 32 }]}>#</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', flex: 1 }]}>
            {tab === 'teams' ? 'Team' : 'Name'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', textAlign: 'right', minWidth: 56 }]}>
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
                paddingVertical: s.xs + 2,
                paddingHorizontal: s.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: item.isCurrentUser ? colors.accentMuted : colors.transparent,
                marginBottom: 0,
              },
            ]}
          >
            <View style={{ width: 32, alignItems: 'center' }}>
              <Text style={[typography.bodySmall, { fontWeight: '800', color: colors.textPrimary }]}>
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
                      marginTop: 1,
                    },
                  ]}
                >
                  {item.rankChange > 0 ? `▲${item.rankChange}` : `▼${Math.abs(item.rankChange)}`}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
              <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isCurrentUser && (
                <View style={{ backgroundColor: colors.energy, paddingHorizontal: s.xs, paddingVertical: s.xxs, borderRadius: r.sm }}>
                  <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '700', fontSize: 10 }]}>
                    {tab === 'teams' ? 'Your Team' : 'You'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.label, { fontWeight: '800', color: colors.energy, textAlign: 'right', minWidth: 56 }]}>
              {item.points.toLocaleString()}
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
  roundTotal: {},
  segmentWrap: {},
  segmentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  insightStrip: {},
  podiumRow: {},
  podiumSlot: {},
  podiumBlock: { width: '100%', alignItems: 'center' },
  medalPodium: { fontSize: 28, marginTop: 4 },
  listHeader: {},
  listRow: {},
});
