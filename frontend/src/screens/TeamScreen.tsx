import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import { teamService } from '../services/teamService';
import { Card, PointsText, LeaderboardRank } from '../components';
import { shadows } from '../theme/tokens';
import type { TeamDetail, TeamMember } from '../types/team';
import type { Theme } from '../theme/theme';

function TeamMemberCard({ member, theme: t }: { member: TeamMember; theme: Theme }) {
  const initial = member.name.charAt(0).toUpperCase();
  const isYou = member.isCurrentUser;

  return (
    <Card
        style={[
          styles.memberCard,
          {
            padding: t.spacing.sm,
            marginBottom: t.spacing.sm,
            backgroundColor: isYou ? t.colors.primaryMuted : t.colors.surface,
            borderWidth: 2,
            borderColor: isYou ? t.colors.primary : t.colors.border,
            borderRadius: t.radius.lg,
          },
          isYou && shadows.md,
        ]}
    >
      <View style={styles.memberRow}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isYou ? t.colors.primary : t.colors.borderLight,
              width: 48,
              height: 48,
              borderRadius: 24,
              marginRight: t.spacing.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { ...t.typography.h3, color: isYou ? t.colors.textInverse : t.colors.textSecondary },
            ]}
          >
            {initial}
          </Text>
        </View>
        <View style={styles.memberBody}>
          <Text
            style={[
              styles.memberName,
              { ...t.typography.body, fontWeight: isYou ? '700' : '600', color: t.colors.text, marginBottom: t.spacing.xxs },
            ]}
            numberOfLines={1}
          >
            {member.name}
            {isYou && ' (You)'}
          </Text>
          <View style={[styles.pointsRow, { gap: t.spacing.xs, marginBottom: t.spacing.xs }]}>
            <Text style={[styles.pointsLabel, { ...t.typography.bodySmall, fontWeight: '600', color: t.colors.textSecondary }]}>
              {member.points.toLocaleString()} pts
            </Text>
            <Text style={[styles.percentLabel, { ...t.typography.bodySmall, fontWeight: '800', color: t.colors.accent }]}>
              {member.contributionPercent.toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.contributionTrack, { backgroundColor: t.colors.borderLight, borderRadius: t.radius.sm }]}>
            <View
              style={[
                styles.contributionFill,
                {
                  width: `${Math.min(100, member.contributionPercent)}%`,
                  borderRadius: t.radius.sm,
                  backgroundColor: isYou ? t.colors.primary : t.colors.accent,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function TeamScreen() {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub } = useClub();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!selectedClub) {
      setTeam(null);
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const roundId = dash.data.activeRound?.id ?? null;
      if (!roundId) {
        setTeam(null);
        setLoading(false);
        return;
      }
      const res = await teamService.getMyTeam(roundId);
      const d = res.data;
      setTeam({
        id: d.id,
        name: d.name,
        rank: d.rank,
        totalPoints: d.totalPoints,
        members: d.members.map((m) => ({
          id: m.id,
          name: m.name,
          points: m.points,
          contributionPercent: m.contributionPercent,
          isCurrentUser: m.isCurrentUser,
        })),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('not in a team') || msg.includes('404')) {
        setTeam(null);
      } else {
        setError(msg || 'Failed to load team');
        setTeam(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    setLoading(true);
    loadTeam();
  }, [loadTeam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeam();
    setRefreshing(false);
  }, [loadTeam]);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>Select a club to see your team.</Text>
      </View>
    );
  }

  if (loading && !team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity onPress={() => loadTeam()} style={{ marginTop: spacing.md }}>
          <Text style={[typography.label, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          No active round or you haven't joined a team yet.
        </Text>
      </View>
    );
  }

  const isTopThree = team.rank >= 1 && team.rank <= 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Team header card */}
        <Card style={[styles.teamCard, { padding: spacing.lg }]}>
          <View style={[styles.teamHeaderRow, { gap: spacing.sm }]}>
            <View style={styles.teamTitleWrap}>
              <Text style={[styles.teamName, { ...typography.h2, color: colors.text, marginBottom: spacing.xs }]} numberOfLines={1}>
                {team.name}
              </Text>
              <View style={styles.rankBadgeWrap}>
                {isTopThree ? (
                  <LeaderboardRank rank={team.rank as 1 | 2 | 3} label={`#${team.rank}`} />
                ) : (
                  <View style={[styles.rankPill, { backgroundColor: colors.borderLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm }]}>
                    <Text style={[styles.rankPillText, { ...typography.caption, fontWeight: '700', color: colors.textSecondary }]}>
                      #{team.rank}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.totalWrap, { backgroundColor: colors.accentMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.lg, minWidth: 100 }]}>
              <Text style={[styles.totalLabel, { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xxs, textTransform: 'uppercase' }]}>Total points</Text>
              <PointsText value={team.totalPoints} accent style={styles.totalValue} />
            </View>
          </View>
        </Card>

        {/* Members section */}
        <Text style={[styles.sectionTitle, { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xxs }]}>
          Members
        </Text>
        <Text style={[styles.sectionSubtitle, { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Contribution to team total
        </Text>

        {team.members.map((member) => (
          <TeamMemberCard key={member.id} member={member} theme={theme} />
        ))}
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 48;
const TRACK_HEIGHT = 8;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {},
  teamCard: {},
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  teamTitleWrap: { flex: 1, minWidth: 0 },
  teamName: {},
  rankBadgeWrap: { alignSelf: 'flex-start' },
  rankPill: { alignItems: 'center', justifyContent: 'center' },
  rankPillText: {},
  totalWrap: { alignItems: 'center' },
  totalLabel: {},
  totalValue: { fontSize: 22 },
  sectionTitle: {},
  sectionSubtitle: {},
  memberCard: {},
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {},
  memberBody: { flex: 1, minWidth: 0 },
  memberName: {},
  memberNameBold: {},
  pointsRow: { flexDirection: 'row', alignItems: 'center' },
  pointsLabel: {},
  percentLabel: {},
  contributionTrack: {
    height: TRACK_HEIGHT,
    overflow: 'hidden',
  },
  contributionFill: { height: '100%' },
});
