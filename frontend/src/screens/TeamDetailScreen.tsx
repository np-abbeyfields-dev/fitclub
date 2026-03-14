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
import { teamService } from '../services/teamService';
import type { LeaderboardStackParamList } from '../navigation/types';

/** Typography hierarchy for this screen — system font (SF Pro on iOS). */
const TEAM_DETAIL_TYPO = {
  pageTitle: { fontSize: 29, fontWeight: '700' as const },
  sectionHeader: { fontSize: 17, fontWeight: '600' as const },
  pointsValue: { fontSize: 17, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
  secondaryLabel: { fontSize: 13, fontWeight: '400' as const },
  memberName: { fontSize: 16, fontWeight: '600' as const },
};

type TeamSummaryMember = {
  id: string;
  userId?: string;
  name: string;
  points: number;
  workoutCount?: number;
  challengeCount?: number;
  isCurrentUser: boolean;
  contributionPercent: number;
};

export default function TeamDetailScreen() {
  const route = useRoute<RouteProp<LeaderboardStackParamList, 'TeamDetail'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { roundId, teamId, roundName, teamName } = route.params;
  const { colors, spacing: s, radius: r, typography, shadows } = theme;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<{
    id: string;
    name: string;
    rank: number;
    totalPoints: number;
    members: TeamSummaryMember[];
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await teamService.getTeamSummary(roundId, teamId);
      setTeam(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team');
      setTeam(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roundId, teamId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goBack = () => navigation.goBack();

  const onMemberPress = (member: TeamSummaryMember) => {
    if (member.userId) {
      (navigation as any).navigate('MemberActivity', {
        roundId,
        userId: member.userId,
        userName: member.name,
      });
    }
  };

  if (loading && !team) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const topPerformer = team?.members.length
    ? team.members.reduce((best, m) => (m.points > best.points ? m : best), team.members[0])
    : null;
  const maxPoints = topPerformer?.points ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + s.sm,
            paddingBottom: s.sm,
            paddingHorizontal: s.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <TouchableOpacity onPress={goBack} style={{ padding: s.xs, marginRight: s.sm }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[TEAM_DETAIL_TYPO.pageTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
          {team?.name ?? teamName}
        </Text>
      </View>

      {error && !team ? (
        <View style={[styles.centered, { flex: 1, padding: s.lg }]}>
          <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary, textAlign: 'center', marginBottom: s.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{ padding: s.sm }}
          >
            <Text style={[TEAM_DETAIL_TYPO.sectionHeader, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : team ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: s.md, paddingBottom: s.xxl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Header Card: team name, rank, total points, member count */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: r.md,
                padding: s.md,
                marginBottom: s.md,
                borderWidth: 1,
                borderColor: colors.border,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[TEAM_DETAIL_TYPO.pageTitle, { color: colors.text, marginBottom: s.xs }]} numberOfLines={1}>
              {team.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s.sm, marginTop: s.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xxs }}>
                <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary }]}>Rank</Text>
                <Text style={[TEAM_DETAIL_TYPO.pointsValue, { color: colors.primary }]}>#{team.rank}</Text>
              </View>
              <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary }]}>·</Text>
              <Text style={[TEAM_DETAIL_TYPO.pointsValue, { color: colors.text }]}>
                {team.totalPoints.toLocaleString()} pts
              </Text>
              <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary }]}>·</Text>
              <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary }]}>
                {team.members.length} member{team.members.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Top Performer */}
          {topPerformer && (
            <>
              <Text style={[TEAM_DETAIL_TYPO.sectionHeader, { color: colors.text, marginBottom: s.sm }]}>
                Top performer
              </Text>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderRadius: r.md,
                    padding: s.md,
                    marginBottom: s.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="trophy" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[TEAM_DETAIL_TYPO.memberName, { color: colors.text }]} numberOfLines={1}>
                      {topPerformer.name}
                      {topPerformer.isCurrentUser ? ' (You)' : ''}
                    </Text>
                    <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary, marginTop: 2 }]}>
                      <Text style={[TEAM_DETAIL_TYPO.pointsValue, { color: colors.primary }]}>
                        {topPerformer.points.toLocaleString()} pts
                      </Text>
                      {' · '}
                      {topPerformer.workoutCount ?? 0} workout{(topPerformer.workoutCount ?? 0) !== 1 ? 's' : ''}
                      {(topPerformer.challengeCount ?? 0) > 0 && (
                        <> · {topPerformer.challengeCount} challenge{(topPerformer.challengeCount ?? 0) !== 1 ? 's' : ''}</>
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Member list */}
          <Text style={[TEAM_DETAIL_TYPO.sectionHeader, { color: colors.text, marginBottom: s.xs }]}>
            Team members
          </Text>
          <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary, marginBottom: s.sm }]}>
            Points include workouts and challenge completions.
          </Text>
          {team.members.map((member) => {
            const pressable = !!member.userId;
            const barRatio = maxPoints > 0 ? Math.min(1, member.points / maxPoints) : 0;
            const workoutsLabel = `${member.workoutCount ?? 0} workout${(member.workoutCount ?? 0) !== 1 ? 's' : ''}`;
            const challengesLabel =
              (member.challengeCount ?? 0) > 0
                ? ` · ${member.challengeCount} challenge${(member.challengeCount ?? 0) !== 1 ? 's' : ''}`
                : '';
            const Wrapper = pressable ? TouchableOpacity : View;
            return (
              <Wrapper
                key={member.id}
                onPress={pressable ? () => onMemberPress(member) : undefined}
                activeOpacity={pressable ? 0.7 : 1}
                style={[
                  styles.memberRow,
                  {
                    backgroundColor: colors.card,
                    borderRadius: r.sm,
                    paddingVertical: s.sm,
                    paddingHorizontal: s.md,
                    marginBottom: s.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...shadows.sm,
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.xxs }}>
                    <Text style={[TEAM_DETAIL_TYPO.memberName, { color: colors.text }]} numberOfLines={1}>
                      {member.name}
                      {member.isCurrentUser ? ' (You)' : ''}
                    </Text>
                    <Text style={[TEAM_DETAIL_TYPO.secondaryLabel, { color: colors.textSecondary }]}>
                      <Text style={[TEAM_DETAIL_TYPO.pointsValue, { color: colors.primary }]}>
                        {member.points.toLocaleString()} pts
                      </Text>
                      {' · '}
                      {workoutsLabel}
                      {challengesLabel}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${barRatio * 100}%`,
                        backgroundColor: colors.primary,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
                {pressable && (
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: s.sm }} />
                )}
              </Wrapper>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  card: {},
  memberRow: { flexDirection: 'row', alignItems: 'center' },
});
