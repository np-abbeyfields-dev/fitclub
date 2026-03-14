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

/** Leaderboard screen design tokens (competition visibility). */
const LEADERBOARD_DARK = {
  background: '#0F172A',
  card: '#1E293B',
  accent: '#FF6B35',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  gold: '#FACC15',
  silver: '#94A3B8',
  bronze: '#B45309',
} as const;

const LEADERBOARD_LIGHT = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  accent: '#2563EB',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  gold: '#FACC15',
  silver: '#94A3B8',
  bronze: '#B45309',
} as const;

function formatRoundEndDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Gap label for non-first: "+N behind #1" */
function getGapFromLeaderLabel(entry: LeaderboardEntry, firstPlacePoints: number): string | null {
  if (entry.rank === 1) return null;
  const gap = firstPlacePoints - entry.points;
  return `+${gap.toLocaleString()} behind #1`;
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { spacing: s, radius: r, typography } = theme;
  const { selectedClub } = useClub();
  const d = theme.isDark ? LEADERBOARD_DARK : LEADERBOARD_LIGHT;

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
  const isTeamLeading = tab === 'teams' && myEntry?.rank === 1;
  const isIndividualLeading = tab === 'individuals' && myEntry?.rank === 1;
  const showLeadingBanner = isTeamLeading || isIndividualLeading;

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
      <View style={[styles.container, { backgroundColor: d.background, flex: 1, justifyContent: 'center', padding: s.md }]}>
        <Text style={[typography.body, { color: d.textSecondary, textAlign: 'center', fontWeight: '600' }]}>
          Select a club to see the leaderboard.
        </Text>
      </View>
    );
  }

  if (loading && individuals.length === 0 && teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: d.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: d.textSecondary, fontWeight: '600' }]}>Loading…</Text>
      </View>
    );
  }

  if (!activeRoundId) {
    return (
      <View style={[styles.container, { backgroundColor: d.background, flex: 1, justifyContent: 'center', alignItems: 'center', padding: s.md }]}>
        <Text style={[typography.body, { color: d.textSecondary, textAlign: 'center', fontWeight: '600', marginBottom: s.sm }]}>
          No active round for this club.
        </Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('PastRounds')} activeOpacity={0.8}>
          <Text style={[typography.label, { color: d.accent, fontWeight: '700' }]}>View Past Rounds</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const endDateFormatted = formatRoundEndDate(roundEndDate);

  return (
    <View style={[styles.container, { backgroundColor: d.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: s.md, paddingBottom: s.xxl + s.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={d.accent} />
        }
      >
        {/* 1. Round Header — date, days remaining, total points */}
        <View
          style={[
            styles.roundHeader,
            {
              backgroundColor: d.card,
              borderRadius: r.md,
              paddingVertical: s.md,
              paddingHorizontal: s.md,
              marginBottom: s.md,
            },
          ]}
        >
          <View style={[styles.roundHeaderRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: s.sm }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.title, { color: d.textPrimary, fontWeight: '800', fontSize: 20 }]} numberOfLines={1}>
                {roundName || 'Active round'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.xs, flexWrap: 'wrap' }}>
                {endDateFormatted ? (
                  <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600' }]}>
                    Ends {endDateFormatted}
                  </Text>
                ) : null}
                {activeRoundId ? (
                  <>
                    {endDateFormatted ? <Text style={[typography.caption, { color: d.textSecondary }]}>·</Text> : null}
                    <RoundCountdown daysLeft={roundDaysLeft} endDate={roundEndDate ?? undefined} variant="pill" />
                  </>
                ) : null}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '600' }]}>Total points</Text>
              <Text style={[typography.title, { color: d.accent, fontWeight: '800', fontSize: 22 }]}>
                {totalPoints.toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('PastRounds')}
            activeOpacity={0.8}
            style={{ marginTop: s.sm, paddingVertical: s.xs }}
          >
            <Text style={[typography.caption, { color: d.accent, fontWeight: '700' }]}>View Past Rounds</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Round Status Banner — "Your team is leading" / "You're leading" */}
        {showLeadingBanner && (
          <View
            style={[
              styles.statusBanner,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.card,
                borderRadius: r.md,
                paddingVertical: s.sm,
                paddingHorizontal: s.md,
                marginBottom: s.md,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={[typography.body, { color: d.textPrimary, fontWeight: '700', marginLeft: s.sm, fontSize: 15 }]}>
              {isTeamLeading ? 'Your team is leading this round' : "You're leading this round"}
            </Text>
          </View>
        )}

        {/* 3. Segmented Control — Teams | Individuals */}
        <View
          style={[
            styles.segmentWrap,
            {
              flexDirection: 'row',
              backgroundColor: d.card,
              borderRadius: r.md,
              padding: 4,
              marginBottom: s.md,
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
                backgroundColor: tab === 'teams' ? d.accent : 'transparent',
              },
            ]}
          >
            <Ionicons name="people" size={18} color={tab === 'teams' ? d.textPrimary : d.textSecondary} />
            <Text style={[typography.label, { fontWeight: '800', color: tab === 'teams' ? d.textPrimary : d.textSecondary }]}>
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
                backgroundColor: tab === 'individuals' ? d.accent : 'transparent',
              },
            ]}
          >
            <Ionicons name="person" size={18} color={tab === 'individuals' ? d.textPrimary : d.textSecondary} />
            <Text style={[typography.label, { fontWeight: '800', color: tab === 'individuals' ? d.textPrimary : d.textSecondary }]}>
              Individuals
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Podium — top 3, #1 larger, team name, points, gap to leader for #2/#3; teams tab: cards clickable → Team Detail */}
        {top3.length > 0 && (
          <LeaderboardPodium
            top3={top3}
            firstPlacePoints={firstPlacePoints}
            getGapLabel={(entry) => getGapFromLeaderLabel(entry, firstPlacePoints)}
            onPressEntry={tab === 'teams' && activeRoundId ? (entry) => (navigation as any).navigate('TeamDetail', { roundId: activeRoundId, teamId: entry.id, roundName, teamName: entry.name }) : undefined}
            overrides={{
              cardBackground: d.card,
              textPrimary: d.textPrimary,
              textSecondary: d.textSecondary,
              accent: d.accent,
              gold: d.gold,
              silver: d.silver,
              bronze: d.bronze,
              firstCardScale: 1.2,
            }}
          />
        )}

        {/* 5. Full Leaderboard List — rank, name, points, gap from leader */}
        {rest.length > 0 && (
          <View style={[styles.listSection, { marginTop: s.sm }]}>
            <View
              style={[
                styles.listHeader,
                {
                  flexDirection: 'row',
                  paddingHorizontal: s.sm,
                  paddingVertical: s.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: d.textSecondary,
                  marginBottom: 0,
                },
              ]}
            >
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700', width: 40 }]}>Rank</Text>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700', flex: 1 }]}>
                {tab === 'teams' ? 'Team' : 'Name'}
              </Text>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700', textAlign: 'right', minWidth: 56 }]}>Pts</Text>
              <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700', textAlign: 'right', minWidth: 72 }]}>Gap</Text>
            </View>
            {rest.map((item) => {
              const rowContent = (
                <>
                  <View style={{ width: 40 }}>
                    <Text style={[typography.body, { fontWeight: '800', color: d.textPrimary }]}>#{item.rank}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: s.xs, flexWrap: 'wrap' }}>
                    <Text style={[typography.body, { fontWeight: '600', color: d.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.isCurrentUser && (
                      <Text style={[typography.caption, { color: d.textSecondary, fontWeight: '700', fontSize: 11 }]}>
                        {tab === 'teams' ? 'Your team' : 'You'}
                      </Text>
                    )}
                  </View>
                  <Text style={[typography.body, { fontWeight: '700', color: d.accent, textAlign: 'right', minWidth: 56 }]}>
                    {item.points.toLocaleString()}
                  </Text>
                  <Text style={[typography.caption, { color: d.textSecondary, textAlign: 'right', minWidth: 72 }]}>
                    +{(firstPlacePoints - item.points).toLocaleString()}
                  </Text>
                </>
              );
              const rowStyle = [
                styles.listRow,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: s.sm,
                  paddingHorizontal: s.sm,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: d.textSecondary,
                  backgroundColor: item.isCurrentUser ? d.card : 'transparent',
                },
              ];
              const isTeamRow = tab === 'teams';
              if (isTeamRow && activeRoundId) {
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={rowStyle}
                    onPress={() => (navigation as any).navigate('TeamDetail', { roundId: activeRoundId, teamId: item.id, roundName, teamName: item.name })}
                    activeOpacity={0.8}
                  >
                    {rowContent}
                  </TouchableOpacity>
                );
              }
              return (
                <View key={item.id} style={rowStyle}>
                  {rowContent}
                </View>
              );
            })}
          </View>
        )}

        {data.length > 0 && data.length <= 3 && (
          <View style={{ paddingVertical: s.lg, paddingHorizontal: s.sm, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: d.textSecondary, textAlign: 'center' }]}>
              All entries are shown in the podium above.
            </Text>
          </View>
        )}
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
  statusBanner: {},
  segmentWrap: {},
  segmentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  listSection: {},
  listHeader: {},
  listRow: {},
});
