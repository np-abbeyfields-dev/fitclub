import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { clubService, type ClubMember, type ClubRole } from '../services/clubService';
import { roundService } from '../services/roundService';

const ROLES: ClubRole[] = ['admin', 'team_lead', 'member'];
const ROLE_LABEL: Record<ClubRole, string> = { admin: 'Admin', team_lead: 'Team Lead', member: 'Member' };

export default function MembersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  /** Round used for team context (active or first draft) — used to show team badge and to allow Team Lead only when in a team */
  const [roundIdForTeam, setRoundIdForTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    if (!selectedClub) {
      setMembers([]);
      setActiveRoundId(null);
      setRoundIdForTeam(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [roundsRes, membersRes] = await Promise.all([
        roundService.listByClub(selectedClub.id),
        clubService.listMembers(selectedClub.id, {}),
      ]);
      const rounds = roundsRes.data || [];
      const active = rounds.find((r) => r.status === 'active');
      const draft = rounds.find((r) => r.status === 'draft');
      const aid = active?.id ?? null;
      const roundForTeam = aid ?? draft?.id ?? null;
      setActiveRoundId(aid);
      setRoundIdForTeam(roundForTeam);
      const membersWithTeam = await clubService.listMembers(selectedClub.id, { activeRoundId: roundForTeam || undefined });
      setMembers(membersWithTeam.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
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

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  const setRole = useCallback(async (userId: string, role: ClubRole) => {
    if (!selectedClub) return;
    setActioningId(userId);
    try {
      await clubService.setMemberRole(selectedClub.id, userId, role);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setActioningId(null);
    }
  }, [selectedClub, load]);

  const removeMember = useCallback((member: ClubMember) => {
    if (!selectedClub) return;
    if (member.userId === currentUserId) {
      Alert.alert('Error', 'You cannot remove yourself.');
      return;
    }
    Alert.alert(
      'Remove member',
      `Remove ${member.displayName} from the club? They will need to rejoin with an invite code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActioningId(member.userId);
            try {
              await clubService.removeMember(selectedClub.id, member.userId);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove member');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  }, [selectedClub, currentUserId, load]);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Select a club to view members.</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Only admins can manage members.</Text>
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingHorizontal: spacing.sm, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }]}>
        {navigation.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs, marginRight: spacing.xs }} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.h2, { color: colors.text }]}>Manage Members</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Club roles (Admin, Team Lead, Member). Team badge shows round assignment · {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {members.length > 2 && (
        <View
          style={[
            styles.searchWrap,
            {
              marginBottom: spacing.xs,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
          <TextInput
            style={[
              typography.bodySmall,
              {
                flex: 1,
                color: colors.text,
                paddingVertical: spacing.xs,
                paddingRight: spacing.xs,
              },
            ]}
            placeholder="Search by name or email"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: spacing.xs }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
          <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <View style={{ gap: spacing.xs }}>
        {filteredMembers.map((m) => {
          const isYou = m.userId === currentUserId;
          const busy = actioningId === m.userId;
          return (
            <Card key={m.id} style={[styles.memberCard, { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, ...theme.shadows.sm }]}>
              <View style={[styles.memberRow, { alignItems: 'center' }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryMuted, width: 36, height: 36, borderRadius: 18 }]}>
                  <Text style={[typography.caption, { fontWeight: '700', color: colors.primary }]}>{m.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberBody}>
                  <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.text }]} numberOfLines={1}>
                    {m.displayName}
                    {isYou && ' (You)'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 0 }]} numberOfLines={1}>
                    {m.email}
                  </Text>
                  {(roundIdForTeam && m.team) ? (
                    <View style={[styles.metaRow, { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }]}>
                      <View style={[styles.teamBadge, { backgroundColor: colors.accentMuted, paddingHorizontal: spacing.xs, paddingVertical: 1, borderRadius: radius.sm }]}>
                        <Text style={[typography.caption, { color: colors.accent }]}>Team: {m.team.teamName}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                {isYou ? (
                  <View style={[styles.roleBadge, { backgroundColor: m.role === 'admin' ? colors.primaryMuted : m.role === 'team_lead' ? colors.accentMuted : colors.borderLight, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm }]}>
                    <Text style={[typography.caption, { fontWeight: '600', color: m.role === 'admin' ? colors.primary : m.role === 'team_lead' ? colors.accent : colors.textSecondary }]}>
                      {ROLE_LABEL[m.role]}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.actions, { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }]}>
                    {busy && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.xs }} />}
                    {ROLES.map((r) => {
                      const disabled = busy || (r === 'team_lead' && !m.team);
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleChip,
                            {
                              paddingHorizontal: spacing.xs,
                              paddingVertical: 4,
                              borderRadius: radius.sm,
                              borderWidth: 1,
                              borderColor: m.role === r ? colors.primary : colors.border,
                              backgroundColor: m.role === r ? colors.primaryMuted : colors.transparent,
                              opacity: disabled && r === 'team_lead' ? 0.6 : 1,
                            },
                          ]}
                          onPress={() => setRole(m.userId, r)}
                          disabled={disabled}
                        >
                          <Text style={[typography.caption, { fontWeight: '600', color: m.role === r ? colors.primary : disabled && r === 'team_lead' ? colors.textMuted : colors.textSecondary }]}>
                            {ROLE_LABEL[r]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.iconBtn, { padding: spacing.xs }]}
                      onPress={() => removeMember(m)}
                      disabled={busy}
                    >
                      <Ionicons name="person-remove-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {filteredMembers.length === 0 && !loading && (
        <View style={[styles.empty, { padding: spacing.xl }]}>
          <Ionicons name={searchQuery.trim() ? 'search-outline' : 'people-outline'} size={40} color={colors.textMuted} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {searchQuery.trim() ? 'No members match your search.' : 'No members yet.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  header: {},
  searchWrap: { flexDirection: 'row', alignItems: 'center' },
  errorBanner: {},
  memberCard: {},
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  memberBody: { flex: 1, minWidth: 0 },
  metaRow: {},
  teamBadge: {},
  roleBadge: {},
  actions: {},
  iconBtn: {},
  roleChip: {},
  empty: { alignItems: 'center', justifyContent: 'center' },
});
