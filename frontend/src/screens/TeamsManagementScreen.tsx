import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { clubService, type ClubMember } from '../services/clubService';
import { roundService, type DraftState, type PreviousRoundStat } from '../services/roundService';
import { teamService, type Team } from '../services/teamService';

type MemberWithStatus = ClubMember & {
  status: 'available' | 'in_team';
  teamName?: string;
  previousRounds?: PreviousRoundStat[];
};

type Nav = NativeStackNavigationProp<HomeStackParamList, 'TeamsManagement'>;

export default function TeamsManagementScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, refreshClubs, isAdmin, canManageTeam } = useClub();
  const [activeRound, setActiveRound] = useState<{ id: string; name: string; status: 'draft' | 'active' } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTeamLeadId, setCreateTeamLeadId] = useState<string | null>(null);
  const [createModalMembers, setCreateModalMembers] = useState<MemberWithStatus[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [addModalTeam, setAddModalTeam] = useState<Team | null>(null);
  const [membersWithStatus, setMembersWithStatus] = useState<MemberWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [draftState, setDraftState] = useState<DraftState | null>(null);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setActiveRound(null);
      setTeams([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const roundsRes = await roundService.listByClub(selectedClub.id);
      const rounds = roundsRes.data || [];
      const current = rounds.find((r) => r.status === 'active') ?? rounds.find((r) => r.status === 'draft') ?? null;
      if (!current) {
        setActiveRound(null);
        setTeams([]);
        setLoading(false);
        return;
      }
      setActiveRound({ id: current.id, name: current.name, status: current.status as 'draft' | 'active' });
      const teamsRes = await teamService.listByRound(current.id);
      setTeams(teamsRes.data || []);
      if (current.status === 'draft') {
        try {
          const draftRes = await roundService.getDraftState(current.id);
          setDraftState(draftRes.data ?? null);
        } catch {
          setDraftState(null);
        }
      } else {
        setDraftState(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClub]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshClubs(), load()]);
  }, [refreshClubs, load]);

  const openCreateModal = useCallback(async () => {
    setCreateName('');
    setCreateTeamLeadId(null);
    setCreateError(null);
    setCreateModalOpen(true);
    if (!selectedClub || !activeRound) return;
    try {
      const membersRes = await clubService.listMembers(selectedClub.id, { activeRoundId: activeRound.id });
      const members = membersRes.data || [];
      const inTeamByUserId = new Map<string, string>();
      teams.forEach((t) => {
        t.Memberships?.forEach((m) => inTeamByUserId.set(m.userId, t.name));
      });
      setCreateModalMembers(
        members.map((m) => ({
          ...m,
          status: (inTeamByUserId.has(m.userId) ? 'in_team' : 'available') as 'available' | 'in_team',
          teamName: inTeamByUserId.get(m.userId),
        }))
      );
    } catch {
      setCreateModalMembers([]);
    }
  }, [selectedClub, activeRound, teams]);

  const submitCreate = useCallback(async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError('Team name is required.');
      return;
    }
    if (!createTeamLeadId) {
      setCreateError('Select a team lead. Every team must have a lead.');
      return;
    }
    if (!activeRound) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      await teamService.create(activeRound.id, name, createTeamLeadId);
      setCreateModalOpen(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create team');
    } finally {
      setCreateBusy(false);
    }
  }, [createName, createTeamLeadId, activeRound, load]);

  const openAddModal = useCallback((team: Team) => {
    setAddModalTeam(team);
    setAddError(null);
    setSearchQuery('');
    const useDraftPick = activeRound?.status === 'draft' && draftState != null && draftState.currentTeamId === team.id;
    if (useDraftPick) {
      setMembersWithStatus(
        draftState!.availableMembers.map((m) => ({
          id: m.userId,
          userId: m.userId,
          displayName: m.displayName,
          email: m.email,
          role: 'member',
          joinedAt: '',
          status: 'available' as const,
          teamName: undefined,
          previousRounds: m.previousRounds,
        }))
      );
    } else if (selectedClub && activeRound) {
      clubService
        .listMembers(selectedClub.id, { activeRoundId: activeRound.id })
        .then((membersRes) => {
          const members = membersRes.data || [];
          const inTeamByUserId = new Map<string, string>();
          teams.forEach((t) => {
            t.Memberships?.forEach((m) => inTeamByUserId.set(m.userId, t.name));
          });
          setMembersWithStatus(
            members.map((m) => ({
              ...m,
              status: m.team ? ('in_team' as const) : ('available' as const),
              teamName: m.team?.teamName,
            }))
          );
        })
        .catch(() => setMembersWithStatus([]));
    } else {
      setMembersWithStatus([]);
    }
  }, [activeRound, draftState, selectedClub, teams]);

  const closeAddModal = useCallback(() => {
    setAddModalTeam(null);
    setAddError(null);
  }, []);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return membersWithStatus;
    const q = searchQuery.trim().toLowerCase();
    return membersWithStatus.filter((m) => m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [membersWithStatus, searchQuery]);

  const addMemberToTeam = useCallback(async (userId: string) => {
    const team = addModalTeam;
    if (!team || !activeRound) return;
    const member = membersWithStatus.find((m) => m.userId === userId);
    if (member?.status === 'in_team') {
      setAddError('User is already assigned to a team in this round.');
      return;
    }
    setAddBusy(true);
    setAddError(null);
    const useDraftPick = activeRound.status === 'draft' && draftState?.currentTeamId === team.id;
    try {
      if (useDraftPick) {
        await roundService.draftPick(activeRound.id, team.id, userId);
      } else {
        await teamService.addMember(activeRound.id, team.id, userId);
      }
      await openAddModal(team);
      await load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setAddBusy(false);
    }
  }, [addModalTeam, activeRound, draftState, membersWithStatus, openAddModal, load]);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Select a club to view teams.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const roundIsLocked = activeRound?.status === 'active';
  const canCreateTeam = activeRound && !roundIsLocked && isAdmin;
  const isDraft = activeRound?.status === 'draft';
  const canShowPickForTeam = (team: Team) =>
    isDraft && draftState != null && draftState.currentTeamId === team.id && (draftState.isCurrentUserTurn || isAdmin);
  const canAddMemberLegacy = activeRound && !roundIsLocked && canManageTeam && !isDraft;
  const canAddMember = activeRound && !roundIsLocked && (canAddMemberLegacy || (isDraft && draftState != null && (draftState.isCurrentUserTurn || isAdmin)));

  if (!activeRound) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Card style={[styles.emptyCard, { padding: spacing.xl }]}>
          <Ionicons name="information-circle-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>No round to manage</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
            There is no active or draft round. Go to Challenge rounds to create a new round, set a start time, or start a draft right away.
          </Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Rounds')}
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary }}
            >
              <Text style={[typography.label, { color: colors.textInverse }]}>Go to Challenge rounds</Text>
            </TouchableOpacity>
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {navigation.canGoBack?.() && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs, marginRight: spacing.sm }} hitSlop={12}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={[typography.h1, { color: colors.text }]}>Teams</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
                {activeRound.name} {roundIsLocked ? '(started — locked)' : '(draft)'}
              </Text>
            </View>
          </View>
          {canCreateTeam ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
              <Text style={[typography.label, { color: colors.textInverse }]}>Create team</Text>
            </TouchableOpacity>
          ) : roundIsLocked ? (
            <View style={[styles.primaryBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.borderLight }]}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Teams locked</Text>
            </View>
          ) : null}
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {isDraft && draftState?.currentTeamName && (
          <Card style={[styles.banner, { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary }]}>
            <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>
              On the clock: {draftState.currentTeamName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
              Pick #{draftState.pickNumber + 1} — only the team lead (or admin) can pick a member.
            </Text>
          </Card>
        )}

        <View style={{ gap: spacing.sm }}>
          {teams.map((team) => (
            <Card key={team.id} style={[styles.teamCard, { padding: spacing.md, ...theme.shadows.sm }]}>
              <View style={[styles.teamRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View>
                  <Text style={[typography.h3, { color: colors.text }]}>{team.name}</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                    {(team.Memberships?.length ?? 0)} member{(team.Memberships?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                {isDraft && canShowPickForTeam(team) ? (
                  <TouchableOpacity
                    style={[styles.addMemberBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => openAddModal(team)}
                  >
                    <Text style={[typography.label, { color: colors.primary }]}>Pick member</Text>
                  </TouchableOpacity>
                ) : canAddMember && !isDraft ? (
                  <TouchableOpacity
                    style={[styles.addMemberBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => openAddModal(team)}
                  >
                    <Text style={[typography.label, { color: colors.primary }]}>Add member</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {team.Memberships && team.Memberships.length > 0 && (
                <View style={[styles.memberChips, { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }]}>
                  {team.Memberships.map((m) => (
                    <View key={m.id} style={[styles.chip, { backgroundColor: m.isLeader ? colors.primaryMuted : colors.borderLight, paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.sm }]}>
                      <Text style={[typography.caption, { color: m.isLeader ? colors.primary : colors.textSecondary }]}>
                        {m.User?.displayName ?? m.userId}{m.isLeader ? ' (Lead)' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>

        {teams.length === 0 && (
          <View style={[styles.empty, { padding: spacing.xl }]}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>No teams yet. Create one to get started.</Text>
          </View>
        )}
      </ScrollView>

      {/* Create team modal */}
      <Modal visible={createModalOpen} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setCreateModalOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>Create team</Text>
            {createError && (
              <View style={[styles.formError, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                <Text style={[typography.bodySmall, { color: colors.error }]}>{createError}</Text>
              </View>
            )}
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Team name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.text }]}
              value={createName}
              onChangeText={setCreateName}
              placeholder="e.g. Team Alpha"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Team lead (required)</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Pick a member not yet in a team. They will be added as the team lead.
            </Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
              {createModalMembers
                .filter((m) => m.status === 'available')
                .map((m) => {
                  const selected = createTeamLeadId === m.userId;
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      onPress={() => setCreateTeamLeadId(selected ? null : m.userId)}
                      style={[
                        styles.memberRow,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.xs,
                          borderRadius: radius.sm,
                          marginBottom: spacing.xs,
                          backgroundColor: selected ? colors.primaryMuted : colors.transparent,
                          borderWidth: 1,
                          borderColor: selected ? colors.primary : colors.borderLight,
                        },
                      ]}
                    >
                      <View>
                        <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.text }]}>{m.displayName}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{m.email}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            {createModalMembers.filter((m) => m.status === 'available').length === 0 && (
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
                No members available. Everyone is already in a team for this round.
              </Text>
            )}
            <View style={[styles.modalActions, { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }]}>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]} onPress={() => setCreateModalOpen(false)}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary }]} onPress={submitCreate} disabled={createBusy}>
                {createBusy ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={[typography.label, { color: colors.textInverse }]}>Create</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add member / Pick member modal */}
      <Modal visible={addModalTeam !== null} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeAddModal}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.xs }]}>
              {isDraft && draftState?.currentTeamId === addModalTeam?.id ? 'Pick a member' : `Add member to ${addModalTeam?.name}`}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              {isDraft && draftState?.currentTeamId === addModalTeam?.id
                ? 'Choose one. Past round stats are shown to help you decide.'
                : 'Search by name. Only available members can be added.'}
            </Text>
            {addError && (
              <View style={[styles.formError, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                <Text style={[typography.bodySmall, { color: colors.error }]}>{addError}</Text>
              </View>
            )}
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textMuted}
            />
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
              {filteredMembers.map((m) => {
                const available = m.status === 'available';
                const prevRounds = m.previousRounds;
                return (
                  <View key={m.userId} style={[styles.memberRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>{m.displayName}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{m.email}</Text>
                      {prevRounds && prevRounds.length > 0 && (
                        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
                          {prevRounds.slice(0, 3).map((r) => `${r.roundName}: ${r.points} pts, ${r.workouts} workouts`).join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: available ? colors.successMuted : colors.borderLight, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm }]}>
                      <Text style={[typography.caption, { fontWeight: '600', color: available ? colors.success : colors.textSecondary }]}>
                        {available ? 'Available' : `In team: ${m.teamName ?? '—'}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.addOneBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: available ? colors.primary : colors.borderLight }]}
                      onPress={() => available && addMemberToTeam(m.userId)}
                      disabled={!available || addBusy}
                    >
                      <Text style={[typography.caption, { fontWeight: '600', color: available ? colors.textInverse : colors.textMuted }]}>{isDraft && draftState?.currentTeamId === addModalTeam?.id ? 'Pick' : 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.secondaryBtn, { paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm }]} onPress={closeAddModal}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  header: {},
  errorBanner: {},
  banner: {},
  teamCard: {},
  teamRow: {},
  addMemberBtn: {},
  memberChips: {},
  chip: {},
  emptyCard: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: {},
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 420 },
  formError: {},
  input: { borderWidth: 1 },
  modalActions: { flexDirection: 'row' },
  memberRow: {},
  statusBadge: {},
  addOneBtn: {},
});
