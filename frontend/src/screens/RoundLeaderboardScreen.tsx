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
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { roundService } from '../services/roundService';
import type { LeaderboardEntry, LeaderboardTab } from '../types/leaderboard';
import type { RootStackParamList } from '../navigation/types';
import { RANK_MEDAL } from '../constants/rank';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PODIUM_HEIGHTS = { 1: 88, 2: 72, 3: 72 } as const;

export default function RoundLeaderboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'RoundLeaderboard'>>();
  const { roundId, roundName } = route.params;
  const { colors, spacing: s, radius: r, typography, shadows, isDark } = theme;
  const { selectedClub } = useClub();

  const [tab, setTab] = useState<LeaderboardTab>('teams');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [individuals, setIndividuals] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const prevIndRanks = React.useRef<Map<string, number>>(new Map());
  const prevTeamRanks = React.useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch {
      setIndividuals([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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
    await load();
    setRefreshing(false);
  }, [load]);

  const onTabChange = (next: LeaderboardTab) => {
    if (next === tab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
  };

  const goBack = () => (navigation as any).goBack();

  if (loading && data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header: back + round name + Ended — respect safe area */}
      <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
            {roundName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.xxs }}>
            <View style={{ backgroundColor: colors.textSecondary, paddingHorizontal: s.xs, paddingVertical: s.xxs, borderRadius: r.sm }}>
              <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '700' }]}>Ended</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
              {totalPoints.toLocaleString()} pts total
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: s.sm, paddingBottom: s.xxl + s.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Insight strip — dark surface only, high-contrast text, gold icon when #1 */}
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
                marginTop: s.sm,
                marginBottom: s.sm,
              },
            ]}
          >
            {myEntry.rank === 1 ? (
              <>
                <Ionicons name="trophy" size={20} color={colors.gold} />
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', marginLeft: s.sm, fontSize: 15 }]}>
                  You were #1
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="trophy-outline" size={18} color={colors.textSecondary} />
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', marginLeft: s.sm, fontSize: 15 }]}>
                  {gapToFirst.toLocaleString()} pts behind #1
                </Text>
              </>
            )}
          </View>
        )}

        {/* Segment */}
        <View style={[styles.segmentWrap, { flexDirection: 'row', backgroundColor: colors.card, borderRadius: r.md, padding: s.xxs, marginBottom: s.sm, borderWidth: 1, borderColor: colors.border, ...shadows.card }]}>
          <TouchableOpacity
            onPress={() => onTabChange('teams')}
            activeOpacity={0.85}
            style={[styles.segmentBtn, { flex: 1, paddingVertical: s.sm, borderRadius: r.sm - 2, backgroundColor: tab === 'teams' ? colors.primary : colors.transparent }]}
          >
            <Ionicons name="people" size={18} color={tab === 'teams' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '700', color: tab === 'teams' ? colors.textInverse : colors.textPrimary }]}>Teams</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onTabChange('individuals')}
            activeOpacity={0.85}
            style={[styles.segmentBtn, { flex: 1, paddingVertical: s.sm, borderRadius: r.sm - 2, backgroundColor: tab === 'individuals' ? colors.primary : colors.transparent }]}
          >
            <Ionicons name="person" size={18} color={tab === 'individuals' ? colors.textInverse : colors.textSecondary} />
            <Text style={[typography.label, { fontWeight: '700', color: tab === 'individuals' ? colors.textInverse : colors.textPrimary }]}>Individuals</Text>
          </TouchableOpacity>
        </View>

        {/* Podium */}
        {top3.length > 0 && (
          <View style={[styles.podiumRow, { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: s.sm, gap: s.xs }]}>
            {[2, 1, 3].map((rank) => {
              const entry = top3.find((e) => e.rank === rank);
              if (!entry) return null;
              return (
                <View key={entry.id} style={[styles.podiumSlot, { flex: 1, alignItems: 'center' }]}>
                  <Text style={styles.medalPodium}>{RANK_MEDAL[rank as 1 | 2 | 3]}</Text>
                  <View
                    style={[
                      styles.podiumBlock,
                      {
                        height: PODIUM_HEIGHTS[rank as 1 | 2 | 3],
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xxs }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>#{rank}</Text>
                      {entry.rankChange != null && entry.rankChange !== 0 && (
                        <Text style={[typography.caption, { fontSize: 10, fontWeight: '800', color: entry.rankChange > 0 ? colors.success : colors.danger }]}>
                          {entry.rankChange > 0 ? `▲${entry.rankChange}` : `▼${Math.abs(entry.rankChange)}`}
                        </Text>
                      )}
                    </View>
                    <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>{entry.name}</Text>
                    <Text style={[typography.label, { color: rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze, fontWeight: '800' }]}>{entry.points.toLocaleString()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* List header */}
        <View style={[styles.listHeader, { flexDirection: 'row', paddingHorizontal: s.xs, paddingVertical: s.xs, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: s.xs }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', width: 32 }]}>#</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', flex: 1 }]}>{tab === 'teams' ? 'Team' : 'Name'}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', textAlign: 'right', minWidth: 56 }]}>Pts</Text>
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
              },
            ]}
          >
            <View style={{ width: 32, alignItems: 'center' }}>
              <Text style={[typography.bodySmall, { fontWeight: '800', color: colors.textPrimary }]}>#{item.rank}</Text>
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
              <Text style={[typography.body, { fontWeight: '700', color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              {item.isCurrentUser && (
                <View style={{ backgroundColor: colors.energy, paddingHorizontal: s.xs, paddingVertical: s.xxs, borderRadius: r.sm }}>
                  <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '700', fontSize: 10 }]}>
                    {tab === 'teams' ? 'Your Team' : 'You'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.label, { fontWeight: '800', color: colors.energy, textAlign: 'right', minWidth: 56 }]}>{item.points.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  insightStrip: {},
  segmentWrap: {},
  segmentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  podiumRow: {},
  podiumSlot: {},
  podiumBlock: { width: '100%', alignItems: 'center' },
  medalPodium: { fontSize: 28, marginTop: 4 },
  listHeader: {},
  listRow: {},
});
