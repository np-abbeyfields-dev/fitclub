import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { roundService, type Round } from '../services/roundService';
import type { LeaderboardEntry } from '../types/leaderboard';

type PastRoundRow = {
  round: Round;
  winnerName: string | null;
  myRank: number | null;
  totalPoints: number;
};

export default function PastRoundsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;
  const { selectedClub } = useClub();

  const [rows, setRows] = useState<PastRoundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const res = await roundService.listByClub(selectedClub.id);
      const completed = (res.data ?? []).filter((round) => round.status === 'completed').slice(0, 20);
      const withSummary: PastRoundRow[] = [];
      for (const round of completed) {
        try {
          const lb = await roundService.getLeaderboard(round.id, 'teams');
          const list = (lb.data ?? []) as LeaderboardEntry[];
          const maxP = list.length ? Math.max(...list.map((e) => e.points)) : 0;
          const entries = list.map((e) => ({ ...e, maxPoints: maxP || e.points }));
          const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
          const winner = entries.find((e) => e.rank === 1);
          const myEntry = entries.find((e) => e.isCurrentUser);
          withSummary.push({
            round,
            winnerName: winner?.name ?? null,
            myRank: myEntry?.rank ?? null,
            totalPoints,
          });
        } catch {
          withSummary.push({ round, winnerName: null, myRank: null, totalPoints: 0 });
        }
      }
      setRows(withSummary);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openRound = (roundId: string, roundName: string) => {
    (navigation as any).navigate('RoundSummary', { roundId, roundName });
  };

  const goBack = () => (navigation as any).goBack();

  const formatEndDate = (endDate: string) => {
    try {
      const d = new Date(endDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, flex: 1, justifyContent: 'center', padding: s.md }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }]}>
          Select a club to see past rounds.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header with back — respect safe area so title doesn't sit under Dynamic Island */}
      <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '800', flex: 1 }]}>Past Rounds</Text>
      </View>

      {loading ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.centered, { flex: 1, padding: s.lg }]}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }]}>
            No past rounds yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: s.sm, paddingBottom: s.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row) => (
            <TouchableOpacity
              key={row.round.id}
              activeOpacity={0.85}
              onPress={() => openRound(row.round.id, row.round.name)}
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: r.sm,
                  padding: s.md,
                  marginBottom: s.sm,
                  ...shadows.sm,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                  {row.round.name}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  Ended {formatEndDate(row.round.endDate)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: 4 }}>
                {row.winnerName && (
                  <Text style={[typography.caption, { color: colors.competition, fontWeight: '700' }]}>
                    Won by {row.winnerName}
                  </Text>
                )}
                {row.myRank != null && (
                  <Text style={[typography.caption, { color: colors.competition, fontWeight: '600' }]}>
                    Your rank #{row.myRank}
                  </Text>
                )}
                <Text style={[typography.caption, { color: colors.energy, fontWeight: '600' }]}>
                  {row.totalPoints.toLocaleString()} pts total
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  row: {},
});
