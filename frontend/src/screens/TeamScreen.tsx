import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { clubService } from '../services/clubService';
import { teamService, type Team } from '../services/teamService';
import { Card, PointsText, LeaderboardRank } from '../components';
import type { TeamDetail, TeamMember } from '../types/team';
import type { ClubMember } from '../services/clubService';

const RANK_EMOJI: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function MemberRow({
  member,
  theme: t,
  canManage,
  onRemove,
}: {
  member: TeamMember & { userId?: string };
  theme: ReturnType<typeof useTheme>;
  canManage: boolean;
  onRemove: () => void;
}) {
  const initial = member.name.charAt(0).toUpperCase();
  const isYou = member.isCurrentUser;
  const roleLabel = member.isTeamLead ? 'Team Lead' : 'Member';

  return (
    <View
      style={[
        styles.memberRow,
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: t.spacing.sm,
          paddingHorizontal: t.spacing.sm,
          backgroundColor: isYou ? t.colors.primaryMuted : t.colors.surface,
          borderRadius: t.radius.sm,
          borderWidth: 1,
          borderColor: isYou ? t.colors.primary : t.colors.border,
          marginBottom: t.spacing.xs,
        },
      ]}
    >
      <View style={[styles.avatar, { width: 44, height: 44, borderRadius: 22, backgroundColor: isYou ? t.colors.primary : t.colors.borderLight, alignItems: 'center', justifyContent: 'center', marginRight: t.spacing.sm }]}>
        <Text style={[t.typography.h3, { color: isYou ? t.colors.heroText : t.colors.textSecondary }]}>{initial}</Text>
      </View>
      <View style={[styles.memberBody, { flex: 1, minWidth: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, flexWrap: 'wrap' }}>
          <Text style={[t.typography.body, { fontWeight: '800', color: t.colors.text }]} numberOfLines={1}>
            {member.name}
            {isYou && ' (You)'}
          </Text>
          <View style={{ backgroundColor: member.isTeamLead ? t.colors.primary : t.colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.sm }}>
            <Text style={[t.typography.caption, { color: member.isTeamLead ? t.colors.heroText : t.colors.textSecondary, fontWeight: '700', fontSize: 10 }]}>{roleLabel}</Text>
          </View>
        </View>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSecondary, fontWeight: '600', marginTop: 2 }]}>
          {member.points.toLocaleString()} pts · {member.contributionPercent.toFixed(0)}%
        </Text>
      </View>
      {canManage && !isYou && member.userId && (
        <TouchableOpacity onPress={onRemove} style={{ padding: t.spacing.xs }} hitSlop={8}>
          <Ionicons name="person-remove-outline" size={22} color={t.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TeamScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows } = theme;
  const { selectedClub, canManageTeam } = useClub();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [roundInfo, setRoundInfo] = useState<{ id: string; name: string; daysLeft: number } | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setRoundInfo(null);
      setTeam(null);
      setTeamsList([]);
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const active = dash.data?.activeRound;
      if (!active?.id) {
        setRoundInfo(null);
        setTeam(null);
        setTeamsList([]);
        setLoading(false);
        return;
      }
      const daysLeft = Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      setRoundInfo({ id: active.id, name: active.name, daysLeft });

      try {
        const res = await teamService.getMyTeam(active.id);
        const d = res.data;
        const members: (TeamMember & { userId?: string; isTeamLead?: boolean })[] = (d.members || []).map((m: any, i: number) => ({
          id: m.id,
          userId: m.userId,
          name: m.name,
          points: m.points,
          contributionPercent: m.contributionPercent,
          isCurrentUser: m.isCurrentUser,
          isTeamLead: i === 0,
        }));
        setTeam({
          id: d.id,
          name: d.name,
          rank: d.rank,
          totalPoints: d.totalPoints,
          members,
        });
      } catch {
        setTeam(null);
      }

      const teamsRes = await teamService.listByRound(active.id);
      setTeamsList(teamsRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRoundInfo(null);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openAddModal = useCallback(async () => {
    if (!selectedClub || !roundInfo || !team) return;
    setAddError(null);
    setSearchQuery('');
    setAddModalOpen(true);
    try {
      const res = await clubService.listMembers(selectedClub.id, { activeRoundId: roundInfo.id });
      setClubMembers(res.data || []);
    } catch {
      setClubMembers([]);
    }
  }, [selectedClub, roundInfo, team]);

  const addMemberToTeam = useCallback(
    async (userId: string) => {
      if (!roundInfo || !team) return;
      setAddBusy(true);
      setAddError(null);
      try {
        await teamService.addMember(roundInfo.id, team.id, userId);
        setAddModalOpen(false);
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to add member';
        setAddError(msg.includes('already on a team') ? 'This person is already on another team for this round.' : msg);
      } finally {
        setAddBusy(false);
      }
    },
    [roundInfo, team, load]
  );

  const removeMember = useCallback(
    (member: TeamMember & { userId?: string }) => {
      if (!member.userId || !roundInfo || !team) return;
      Alert.alert('Remove member', `Remove ${member.name} from ${team.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamService.removeMember(roundInfo.id, team.id, member.userId);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove');
            }
          },
        },
      ]);
    },
    [roundInfo, team, load]
  );

  const createTeam = useCallback(async () => {
    const name = createName.trim();
    if (!name || !roundInfo || !currentUserId) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const createRes = await teamService.create(roundInfo.id, name);
      const newTeam = createRes.data as Team;
      await teamService.addMember(roundInfo.id, newTeam.id, currentUserId);
      setCreateModalOpen(false);
      setCreateName('');
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create team');
    } finally {
      setCreateBusy(false);
    }
  }, [createName, roundInfo, currentUserId, load]);

  const joinTeam = useCallback(
    async (teamId: string) => {
      if (!roundInfo || !currentUserId) return;
      setJoinBusy(true);
      setJoinError(null);
      try {
        await teamService.addMember(roundInfo.id, teamId, currentUserId);
        setJoinModalOpen(false);
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to join';
        setJoinError(msg.includes('already on a team') ? 'You are already on a team for this round.' : msg);
      } finally {
        setJoinBusy(false);
      }
    },
    [roundInfo, currentUserId, load]
  );

  const canManage = canManageTeam;
  const inTeam = team != null;
  const availableToAdd = clubMembers.filter((m) => {
    const inOurTeam = team?.members.some((mem) => (mem as any).userId === m.userId);
    const inOtherTeam = m.team && m.team.teamId !== team?.id;
    return !inOurTeam && !inOtherTeam;
  });
  const searchFiltered = searchQuery.trim()
    ? availableToAdd.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableToAdd;

  if (!selectedClub) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>Select a club to see your team.</Text>
      </View>
    );
  }

  if (loading && !roundInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!roundInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, padding: spacing.md }]}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>No active round. Check back when a challenge is running.</Text>
      </View>
    );
  }

  if (!inTeam) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.roundHeader, { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>{roundInfo.name}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginTop: 4 }]}>{roundInfo.daysLeft} days left</Text>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }]}>You're not on a team</Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, marginBottom: spacing.md }]}>Create a new team or join an existing one for this round.</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }]}
            onPress={() => { setCreateError(null); setCreateName(''); setCreateModalOpen(true); }}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.heroText} />
            <Text style={[typography.label, { color: colors.heroText, fontWeight: '800' }]}>Create team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { paddingVertical: spacing.md, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }]}
            onPress={() => { setJoinError(null); setJoinModalOpen(true); }}
          >
            <Ionicons name="people-outline" size={22} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary, fontWeight: '800' }]}>Join team</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={createModalOpen} transparent animationType="fade">
          <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setCreateModalOpen(false)}>
            <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>Create team</Text>
              {createError && <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.sm }]}>{createError}</Text>}
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Team name</Text>
              <TextInput value={createName} onChangeText={setCreateName} placeholder="e.g. Team Alpha" placeholderTextColor={colors.textMuted} style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.text }]} />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity style={[styles.outlineBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]} onPress={() => setCreateModalOpen(false)}>
                  <Text style={[typography.label, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary }]} onPress={createTeam} disabled={createBusy || !createName.trim()}>
                  {createBusy ? <ActivityIndicator size="small" color={colors.heroText} /> : <Text style={[typography.label, { color: colors.heroText, fontWeight: '700' }]}>Create</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={joinModalOpen} transparent animationType="fade">
          <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setJoinModalOpen(false)}>
            <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>Join a team</Text>
              {joinError && <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.sm }]}>{joinError}</Text>}
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {teamsList.map((t) => (
                  <TouchableOpacity key={t.id} style={[styles.teamOption, { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.card, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border }]} onPress={() => joinTeam(t.id)} disabled={joinBusy}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.outlineBtn, { marginTop: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]} onPress={() => setJoinModalOpen(false)}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  const isTopThree = team.rank >= 1 && team.rank <= 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Current Round Header */}
        <View style={[styles.roundHeader, { padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.heroGradientStart, borderRadius: radius.sm, overflow: 'hidden', ...shadows.sm }]}>
          <Text style={[typography.caption, { color: colors.heroTextMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }]}>{roundInfo.name}</Text>
          <Text style={[typography.h3, { color: colors.heroText, fontWeight: '800', marginTop: 4 }]}>{team.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.heroTextMuted, fontWeight: '700' }]}>{roundInfo.daysLeft} days left</Text>
            <Text style={[typography.caption, { color: colors.heroText, fontWeight: '800' }]}>{team.totalPoints.toLocaleString()} pts</Text>
          </View>
        </View>

        {/* 2. Team Performance Card */}
        <View style={[styles.perfCard, { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, ...shadows.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' }]}>Team rank</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>#{team.rank}</Text>
                {isTopThree && <Text style={{ fontSize: 20 }}>{RANK_EMOJI[team.rank as 1 | 2 | 3]}</Text>}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Total points</Text>
              <PointsText value={team.totalPoints} accent style={[typography.h2, { fontWeight: '800' }]} />
            </View>
            <View>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Members</Text>
              <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>{team.members.length}</Text>
            </View>
          </View>
        </View>

        {/* 3. Members List */}
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }]}>Members</Text>
        {team.members.map((member) => (
          <MemberRow key={member.id} member={member} theme={theme} canManage={canManage} onRemove={() => removeMember(member)} />
        ))}

        {/* 4. Team Management */}
        {canManage && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }]}>Manage team</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }]} onPress={openAddModal}>
                <Ionicons name="person-add-outline" size={20} color={colors.heroText} />
                <Text style={[typography.label, { color: colors.heroText, fontWeight: '800' }]}>Add member</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={addModalOpen} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setAddModalOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '85%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Add member</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Search club members. Only people not on another team can be added.</Text>
            {addError && <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.sm }]}>{addError}</Text>}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Name or email..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.text }]}
            />
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {searchFiltered.length === 0 ? (
                <Text style={[typography.bodySmall, { color: colors.textMuted }]}>{searchQuery.trim() ? 'No matches' : 'No one available to add (everyone is already on a team).'}</Text>
              ) : (
                searchFiltered.map((m) => (
                  <TouchableOpacity key={m.userId} style={[styles.teamOption, { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.card, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border }]} onPress={() => addMemberToTeam(m.userId)} disabled={addBusy}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{m.displayName}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{m.email}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.outlineBtn, { marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]} onPress={() => setAddModalOpen(false)}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {},
  centered: { justifyContent: 'center', alignItems: 'center' },
  roundHeader: {},
  perfCard: {},
  memberRow: {},
  avatar: {},
  memberBody: {},
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400 },
  teamOption: {},
});
