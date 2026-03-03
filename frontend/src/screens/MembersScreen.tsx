import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { useAuthStore } from '../store/authStore';
import { clubService, type ClubMember } from '../services/clubService';
import { roundService } from '../services/roundService';
import { shadows } from '../theme/tokens';

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setMembers([]);
      setActiveRoundId(null);
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
      const aid = active?.id ?? null;
      setActiveRoundId(aid);
      const membersWithTeam = await clubService.listMembers(selectedClub.id, { activeRoundId: aid || undefined });
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

  const setRole = useCallback(async (userId: string, role: 'admin' | 'member') => {
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
      contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { marginBottom: spacing.lg }]}>
        <Text style={[typography.h1, { color: colors.text }]}>Members</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
          <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        {members.map((m) => {
          const isYou = m.userId === currentUserId;
          const busy = actioningId === m.userId;
          return (
            <Card key={m.id} style={[styles.memberCard, { padding: spacing.md, ...shadows.sm }]}>
              <View style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryMuted, width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{m.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberBody}>
                  <Text style={[typography.body, { fontWeight: '600', color: colors.text }]} numberOfLines={1}>
                    {m.displayName}
                    {isYou && ' (You)'}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                    {m.email}
                  </Text>
                  <View style={[styles.metaRow, { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }]}>
                    <View style={[styles.roleBadge, { backgroundColor: m.role === 'admin' ? colors.primaryMuted : colors.borderLight, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm }]}>
                      <Text style={[typography.caption, { fontWeight: '600', color: m.role === 'admin' ? colors.primary : colors.textSecondary }]}>{m.role}</Text>
                    </View>
                    {activeRoundId && m.team && (
                      <View style={[styles.teamBadge, { backgroundColor: colors.accentMuted, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm }]}>
                        <Text style={[typography.caption, { color: colors.accent }]}>Team: {m.team.teamName}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {!isYou && (
                  <View style={[styles.actions, { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
                    {m.role === 'member' ? (
                      <TouchableOpacity
                        style={[styles.iconBtn, { padding: spacing.xs }]}
                        onPress={() => setRole(m.userId, 'admin')}
                        disabled={busy}
                      >
                        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-up-circle-outline" size={22} color={colors.primary} />}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.iconBtn, { padding: spacing.xs }]}
                        onPress={() => setRole(m.userId, 'member')}
                        disabled={busy}
                      >
                        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-down-circle-outline" size={22} color={colors.textSecondary} />}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.iconBtn, { padding: spacing.xs }]}
                      onPress={() => removeMember(m)}
                      disabled={busy}
                    >
                      <Ionicons name="person-remove-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {members.length === 0 && !loading && (
        <View style={[styles.empty, { padding: spacing.xl }]}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>No members yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  header: {},
  errorBanner: {},
  memberCard: {},
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  memberBody: { flex: 1, minWidth: 0 },
  metaRow: {},
  roleBadge: {},
  teamBadge: {},
  actions: {},
  iconBtn: {},
  empty: { alignItems: 'center', justifyContent: 'center' },
});
