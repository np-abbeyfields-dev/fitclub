import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import { roundService } from '../services/roundService';
import { LeaderboardRow } from '../components/LeaderboardRow';
import type { LeaderboardEntry, LeaderboardTab } from '../types/leaderboard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub } = useClub();

  const [tab, setTab] = useState<LeaderboardTab>('individuals');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [individuals, setIndividuals] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedClub) {
      setActiveRoundId(null);
      setIndividuals([]);
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const roundId = dash.data.activeRound?.id ?? null;
      setActiveRoundId(roundId);
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
        setIndividuals((indRes.data ?? []).map((e) => ({ ...e, maxPoints: maxInd || e.points })));
        setTeams((teamRes.data ?? []).map((e) => ({ ...e, maxPoints: maxTeam || e.points })));
      }
    } catch {
      setIndividuals([]);
      setTeams([]);
      setActiveRoundId(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const data = tab === 'individuals' ? individuals : teams;
  const myRank = data.find((e) => e.isCurrentUser)?.rank ?? null;

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

  const renderItem = useCallback(
    ({ item }: { item: LeaderboardEntry }) => <LeaderboardRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.id, []);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>Select a club to see the leaderboard.</Text>
      </View>
    );
  }

  if (loading && individuals.length === 0 && teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  if (!activeRoundId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>No active round for this club.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }]}>
        <Text style={[styles.title, { ...typography.h1, color: colors.text }]}>Leaderboard</Text>
        <Text style={[styles.subtitle, { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs }]}>
          Compete and climb the ranks
        </Text>

        {/* Tabs */}
        <View style={[styles.tabs, { marginTop: spacing.md, gap: spacing.xs }]}>
          <TouchableOpacity
            onPress={() => onTabChange('individuals')}
            activeOpacity={0.8}
            style={[
              styles.tab,
              {
                backgroundColor: tab === 'individuals' ? colors.primary : colors.surface,
                borderColor: tab === 'individuals' ? colors.primary : colors.border,
                borderWidth: 2,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Ionicons
              name="person"
              size={18}
              color={tab === 'individuals' ? colors.textInverse : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { ...typography.label, fontWeight: '700', color: tab === 'individuals' ? colors.textInverse : colors.text },
              ]}
            >
              Individuals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onTabChange('teams')}
            activeOpacity={0.8}
            style={[
              styles.tab,
              {
                backgroundColor: tab === 'teams' ? colors.primary : colors.surface,
                borderColor: tab === 'teams' ? colors.primary : colors.border,
                borderWidth: 2,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Ionicons
              name="people"
              size={18}
              color={tab === 'teams' ? colors.textInverse : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { ...typography.label, fontWeight: '700', color: tab === 'teams' ? colors.textInverse : colors.text },
              ]}
            >
              Teams
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky "You are #N" banner */}
      {myRank != null && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.primaryMuted,
              borderBottomColor: colors.border,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              gap: spacing.xs,
            },
          ]}
        >
          <Ionicons name="trophy" size={18} color={colors.primary} />
          <Text style={[styles.bannerText, { ...typography.label, fontWeight: '800', color: colors.primary }]}>
            You are #{myRank}
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  title: {},
  subtitle: {},
  tabs: { flexDirection: 'row' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabLabel: {},
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  bannerText: {},
  listContent: {},
});
