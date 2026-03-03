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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { clubService, type ClubMember } from '../services/clubService';
import { roundService } from '../services/roundService';
import { teamService, type Team } from '../services/teamService';
import { shadows } from '../theme/tokens';

type MemberWithStatus = ClubMember & { status: 'available' | 'in_team'; teamName?: string };

export default function TeamsManagementScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, refreshClubs } = useClub();
  const [activeRound, setActiveRound] = useState<{ id: string; name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [addModalTeam, setAddModalTeam] = useState<Team | null>(null);
  const [membersWithStatus, setMembersWithStatus] = useState<MemberWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

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
      const active = rounds.find((r) => r.status === 'active') || null;
      if (!active) {
        setActiveRound(null);
        setTeams([]);
        setLoading(false);
        return;
      }
      setActiveRound({ id: active.id, name: active.name });
      const teamsRes = await teamService.listByRound(active.id);
      setTeams(teamsRes.data || []);
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

  const openCreateModal = useCallback(() => {
    setCreateName('');
    setCreateError(null);
    setCreateModalOpen(true);
  }, []);

  const submitCreate = useCallback(async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError('Team name is required.');
      return;
    }
    if (!activeRound) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      await teamService.create(activeRound.id, name);
      setCreateModalOpen(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create team');
    } finally {
      setCreateBusy(false);
    }
  }, [createName, activeRound, load]);

  const openAddModal = useCallback(async (team: Team) => {
    setAddModalTeam(team);
    setAddError(null);
    setSearchQuery('');
    if (!selectedClub || !activeRound) return;
    try {
      const membersRes = await clubService.listMembers(selectedClub.id, { activeRoundId: activeRound.id });
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
    } catch {
      setMembersWithStatus([]);
    }
  }, [selectedClub, activeRound, teams]);

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
    try {
      await teamService.addMember(activeRound.id, team.id, userId);
      await openAddModal(team);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add member';
      if (msg.includes('already assigned')) {
        setAddError('User is already assigned to a team in this round.');
      } else {
        setAddError(msg);
      }
    } finally {
      setAddBusy(false);
    }
  }, [addModalTeam, activeRound, membersWithStatus, openAddModal, load]);

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

  if (!activeRound) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Card style={[styles.emptyCard, { padding: spacing.xl }]}>
          <Ionicons name="information-circle-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.xs }]}>No active round</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Teams can only be created when a round is active. Ask an admin to activate a round.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }]}>
          <View>
            <Text style={[typography.h1, { color: colors.text }]}>Teams</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>{activeRound.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={[typography.label, { color: colors.textInverse }]}>Create team</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          {teams.map((team) => (
            <Card key={team.id} style={[styles.teamCard, { padding: spacing.md, ...shadows.sm }]}>
              <View style={[styles.teamRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View>
                  <Text style={[typography.h3, { color: colors.text }]}>{team.name}</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                    {(team.Memberships?.length ?? 0)} member{(team.Memberships?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addMemberBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }]}
                  onPress={() => openAddModal(team)}
                >
                  <Text style={[typography.label, { color: colors.primary }]}>Add member</Text>
                </TouchableOpacity>
              </View>
              {team.Memberships && team.Memberships.length > 0 && (
                <View style={[styles.memberChips, { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }]}>
                  {team.Memberships.map((m) => (
                    <View key={m.id} style={[styles.chip, { backgroundColor: colors.borderLight, paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.sm }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{m.User?.displayName ?? m.userId}</Text>
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
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setCreateModalOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>Create team</Text>
            {createError && (
              <View style={[styles.formError, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                <Text style={[typography.bodySmall, { color: colors.error }]}>{createError}</Text>
              </View>
            )}
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Team name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, color: colors.text }]}
              value={createName}
              onChangeText={setCreateName}
              placeholder="e.g. Team Alpha"
              placeholderTextColor={colors.textMuted}
            />
            <View style={[styles.modalActions, { flexDirection: 'row', gap: spacing.sm }]}>
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

      {/* Add member modal */}
      <Modal visible={addModalTeam !== null} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={closeAddModal}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.xs }]}>Add member to {addModalTeam?.name}</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Search by name. Only available members can be added.</Text>
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
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
              {filteredMembers.map((m) => {
                const available = m.status === 'available';
                return (
                  <View key={m.userId} style={[styles.memberRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                    <View>
                      <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>{m.displayName}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{m.email}</Text>
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
                      <Text style={[typography.caption, { fontWeight: '600', color: available ? colors.textInverse : colors.textMuted }]}>Add</Text>
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
  teamCard: {},
  teamRow: {},
  addMemberBtn: {},
  memberChips: {},
  chip: {},
  emptyCard: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  primaryBtn: {},
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
