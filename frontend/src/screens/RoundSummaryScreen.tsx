import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { roundService, type RoundSummary } from '../services/roundService';
import type { RootStackParamList } from '../navigation/types';
import { RANK_EMOJI } from '../constants/rank';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function RoundSummaryScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RoundSummary'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;
  const { roundId, roundName } = route.params;

  const [data, setData] = useState<RoundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await roundService.getRoundSummary(roundId);
      setData(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roundId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goBack = () => navigation.goBack();
  const openLeaderboard = () =>
    (navigation as any).navigate('RoundLeaderboard', { roundId, roundName });

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, padding: s.md }]}>
        <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', flex: 1 }]}>Round Summary</Text>
        </View>
        <View style={[styles.centered, { flex: 1, padding: s.lg }]}>
          <Text style={[typography.body, { color: colors.error, textAlign: 'center', marginBottom: s.md }]}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ padding: s.sm }}>
            <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const summary = data!;
  const winningTeam = summary.topTeams[0] ?? null;
  const topContributors = summary.topIndividuals.slice(0, 10);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
            {summary.roundName}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, fontWeight: '600' }]}>
            {formatDate(summary.startDate)} – {formatDate(summary.endDate)} · {summary.totalPoints.toLocaleString()} pts total
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: s.md, paddingBottom: s.xxl + s.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Winning team */}
        {winningTeam && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.xs, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Winning team
            </Text>
            <Card
              style={[
                styles.winnerCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: r.md,
                  padding: s.md,
                  marginBottom: s.lg,
                  borderWidth: 2,
                  borderColor: colors.energy,
                  ...shadows.card,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
                <View style={[styles.trophyWrap, { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.energy, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="trophy" size={28} color={colors.textInverse} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                    {winningTeam.teamName}
                  </Text>
                  <Text style={[typography.label, { color: colors.energy, fontWeight: '700', marginTop: 2 }]}>
                    {winningTeam.totalPoints.toLocaleString()} pts
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Top contributors */}
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.xs, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          Top contributors
        </Text>
        <Card noPadding style={{ backgroundColor: colors.card, borderRadius: r.md, marginBottom: s.lg, overflow: 'hidden', ...shadows.card }}>
          {topContributors.length === 0 ? (
            <View style={{ padding: s.md, alignItems: 'center' }}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>No workouts logged this round.</Text>
            </View>
          ) : (
            topContributors.map((person, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              return (
                <View
                  key={person.userId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: s.sm,
                    paddingHorizontal: s.md,
                    borderBottomWidth: index < topContributors.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {isTop3 ? (
                      <Text style={[typography.h3, { color: rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze }]}>{RANK_EMOJI[rank as 1 | 2 | 3]}</Text>
                    ) : (
                      <Text style={[typography.label, { color: colors.competition, fontWeight: '700' }]}>#{rank}</Text>
                    )}
                  </View>
                  <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: s.sm }]}>
                    <Text style={[typography.label, { color: colors.primary, fontWeight: '800' }]}>{person.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      {person.name}
                    </Text>
                  </View>
                  <Text style={[typography.label, { color: colors.energy, fontWeight: '700' }]}>
                    {person.points.toLocaleString()} pts
                  </Text>
                </View>
              );
            })
          )}
        </Card>

        <TouchableOpacity
          onPress={openLeaderboard}
          activeOpacity={0.85}
          style={[
            styles.leaderboardBtn,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              borderRadius: r.md,
              paddingVertical: s.sm,
              paddingHorizontal: s.md,
              gap: s.xs,
            },
          ]}
        >
          <Ionicons name="podium-outline" size={20} color={colors.textInverse} />
          <Text style={[typography.label, { color: colors.textInverse, fontWeight: '700' }]}>View full leaderboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  winnerCard: {},
  trophyWrap: {},
  avatar: {},
  leaderboardBtn: {},
});
