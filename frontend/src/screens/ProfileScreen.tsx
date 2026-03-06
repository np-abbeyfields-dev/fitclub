import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeContext } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useClub } from '../context/ClubContext';
import { useDashboardStore } from '../store/dashboardStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { roundService } from '../services/roundService';
import type { LeaderboardEntry } from '../types/leaderboard';
import { spacing as tokenSpacing } from '../theme/tokens';

const AVATAR_SIZE = 64;

type PastRoundRow = {
  roundId: string;
  roundName: string;
  myRank: number | null;
  teamName: string | null;
};

function SectionHeader({ title, style }: { title: string; style?: object }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionTitle, theme.typography.caption, { color: theme.colors.textSecondary, ...style }]}>
      {title}
    </Text>
  );
}

function Row({
  label,
  value,
  onPress,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.row,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
        {label}
      </Text>
      {right ?? (value != null && <Text style={[typography.bodySmall, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text>)}
    </Wrapper>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { preference, setThemePreference } = useThemeContext();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { clubs, selectedClub, setSelectedClub, isAdmin, refreshClubs } = useClub();
  const notificationsEnabled = useNotificationsStore((s) => s.enabled);
  const setNotificationsEnabled = useNotificationsStore((s) => s.setEnabled);
  const hydrateNotifications = useNotificationsStore((s) => s.hydrate);
  const { colors, spacing, radius, typography } = theme;

  const [refreshing, setRefreshing] = useState(false);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);
  const [pastRounds, setPastRounds] = useState<PastRoundRow[]>([]);
  const [pastRoundsLoading, setPastRoundsLoading] = useState(false);

  const dashboard = selectedClub ? useDashboardStore((s) => s.getDashboardForClub(selectedClub.id)) : null;
  const activeRoundName = dashboard?.round?.id && dashboard.round.name !== 'No active round' ? dashboard.round.name : null;
  const workoutCount = dashboard?.workoutCount ?? 0;

  const loadPastRounds = useCallback(async () => {
    if (!selectedClub) {
      setPastRounds([]);
      return;
    }
    setPastRoundsLoading(true);
    try {
      const res = await roundService.listByClub(selectedClub.id);
      const ended = (res.data ?? []).filter((r) => r.status === 'ended').slice(0, 8);
      const rows: PastRoundRow[] = [];
      for (const round of ended) {
        try {
          const lb = await roundService.getLeaderboard(round.id, 'teams');
          const list = (lb.data ?? []) as LeaderboardEntry[];
          const myEntry = list.find((e) => e.isCurrentUser);
          rows.push({
            roundId: round.id,
            roundName: round.name,
            myRank: myEntry?.rank ?? null,
            teamName: myEntry?.name ?? null,
          });
        } catch {
          rows.push({ roundId: round.id, roundName: round.name, myRank: null, teamName: null });
        }
      }
      setPastRounds(rows);
    } catch {
      setPastRounds([]);
    } finally {
      setPastRoundsLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    hydrateNotifications();
  }, [hydrateNotifications]);

  useEffect(() => {
    loadPastRounds();
  }, [loadPastRounds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshClubs(), loadPastRounds()]);
    setRefreshing(false);
  }, [refreshClubs, loadPastRounds]);

  const onSettings = () => (navigation as any).getParent()?.navigate('Settings');
  const handleLogout = async () => await logout();

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();
  const isDark = preference === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs }]}>
        <Text style={[typography.h1, { color: colors.text, fontWeight: '800' }]}>Profile</Text>
        <TouchableOpacity onPress={onSettings} style={{ padding: spacing.xxs }} hitSlop={spacing.sm} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* 1. Identity */}
        <SectionHeader title="Identity" style={{ marginBottom: spacing.xs }} />
        <View style={[styles.identityCard, { padding: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.primaryMuted, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, ...theme.shadows.sm }]}>
          <View style={[styles.avatarWrap, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }]}>
            <Text style={[typography.h2, { color: colors.primary, fontWeight: '800' }]}>{initial}</Text>
          </View>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
            {user?.displayName || 'Member'}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {user?.email}
          </Text>
          {selectedClub && (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '600' }]}>
              {workoutCount} workout{workoutCount === 1 ? '' : 's'} this round
            </Text>
          )}
        </View>

        {/* 2. My Clubs */}
        <SectionHeader title="My Clubs" style={{ marginBottom: spacing.xs }} />
        {clubs.length === 0 ? (
          <View style={[styles.clubActions, { gap: spacing.xs, marginBottom: spacing.md }]}>
            <TouchableOpacity
              style={[styles.outlineBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => (navigation as any).getParent()?.navigate('HomeTab', { screen: 'JoinClub' })}
              activeOpacity={0.7}
            >
              <Text style={[typography.label, { color: colors.primary }]}>Join club</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primary }]}
              onPress={() => (navigation as any).getParent()?.navigate('HomeTab', { screen: 'CreateClub' })}
              activeOpacity={0.7}
            >
              <Text style={[typography.label, { color: colors.textInverse, fontWeight: '700' }]}>Create club</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ marginBottom: spacing.xs }}>
              {clubs.map((club) => {
                const isActive = selectedClub?.id === club.id;
                const roundLabel = isActive && activeRoundName ? activeRoundName : (isActive ? 'No active round' : '—');
                return (
                  <TouchableOpacity
                    key={club.id}
                    onPress={() => (isActive ? setClubPickerOpen(true) : setSelectedClub(club))}
                    style={[
                      styles.clubRow,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.sm,
                        backgroundColor: colors.surface,
                        borderRadius: radius.sm,
                        borderWidth: 1,
                        borderColor: isActive ? colors.primary : colors.border,
                        marginBottom: spacing.xs,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                          {club.name}
                        </Text>
                        {isActive && (
                          <View style={{ backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm }}>
                            <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '700', fontSize: 10 }]}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        {roundLabel}
                      </Text>
                      {club.role === 'admin' ? (
                        <View style={{ backgroundColor: colors.competition, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start' }}>
                          <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '700', fontSize: 10 }]}>Admin</Text>
                        </View>
                      ) : (
                        <Text style={[typography.caption, { color: colors.mutedText, fontWeight: '600' }]}>
                          {club.role === 'team_lead' ? 'Team Lead' : 'Member'}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <TouchableOpacity onPress={() => setClubPickerOpen(true)} style={{ padding: spacing.xs }}>
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {club.role === 'admin' && (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedClub(club);
                            (navigation as any).getParent()?.navigate('Rounds');
                          }}
                          style={{ padding: spacing.xs }}
                        >
                          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.clubActions, { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => (navigation as any).getParent()?.navigate('HomeTab', { screen: 'JoinClub' })}
                activeOpacity={0.7}
              >
                <Text style={[typography.label, { color: colors.primary }]}>Join club</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.primary }]}
                onPress={() => (navigation as any).getParent()?.navigate('HomeTab', { screen: 'CreateClub' })}
                activeOpacity={0.7}
              >
                <Text style={[typography.label, { color: colors.textInverse, fontWeight: '700' }]}>Create club</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 3. Admin Tools */}
        {isAdmin && (
          <>
            <SectionHeader title="Admin tools" style={{ marginBottom: spacing.xs }} />
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <Row label="Create challenge" onPress={() => (navigation as any).getParent()?.navigate('Rounds')} right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} />
              <Row label="Manage members" onPress={() => (navigation as any).getParent()?.navigate('Members')} right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} />
              <Row label="Manage teams" onPress={() => (navigation as any).getParent()?.navigate('TeamsManagement')} right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} />
              <Row label="Edit club info" onPress={() => (navigation as any).getParent()?.navigate('ClubInfo')} right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} />
            </View>
          </>
        )}

        {/* 4. Past Rounds */}
        <SectionHeader title="Past rounds" style={{ marginBottom: spacing.xs }} />
        {!selectedClub ? (
          <Text style={[typography.bodySmall, { color: colors.textMuted, marginBottom: spacing.md }]}>Select a club to see past rounds.</Text>
        ) : pastRoundsLoading ? (
          <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : pastRounds.length === 0 ? (
          <Text style={[typography.bodySmall, { color: colors.textMuted, marginBottom: spacing.md }]}>No past rounds.</Text>
        ) : (
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            {pastRounds.map((row) => (
              <TouchableOpacity
                key={row.roundId}
                onPress={() => (navigation as any).getParent()?.navigate('RoundLeaderboard', { roundId: row.roundId, roundName: row.roundName })}
                style={[
                  styles.row,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    backgroundColor: colors.surface,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>{row.roundName}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 }}>
                    {row.myRank != null && <Text style={[typography.caption, { color: colors.textSecondary }]}>Rank #{row.myRank}</Text>}
                    {row.teamName && <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>Team: {row.teamName}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => (navigation as any).getParent()?.navigate('PastRounds')}
              style={[styles.outlineBtn, { paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: spacing.xs }]}
              activeOpacity={0.7}
            >
              <Text style={[typography.label, { color: colors.primary }]}>View all past rounds</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Preferences */}
        <SectionHeader title="Preferences" style={{ marginBottom: spacing.xs }} />
        <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
          <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Notifications</Text>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.border, true: colors.primaryMuted }} thumbColor={notificationsEnabled ? colors.primary : colors.textMuted} />
          </View>
          <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Dark mode</Text>
            <Switch value={isDark} onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')} trackColor={{ false: colors.border, true: colors.primaryMuted }} thumbColor={isDark ? colors.primary : colors.textMuted} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[typography.label, { color: colors.error, fontWeight: '600', marginLeft: spacing.xs }]}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={clubPickerOpen} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay ?? 'rgba(0,0,0,0.5)', padding: tokenSpacing.lg }]} onPress={() => setClubPickerOpen(false)}>
          <View style={[styles.picker, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm }]}>
            {clubs.map((club) => (
              <TouchableOpacity
                key={club.id}
                style={[styles.pickerItem, { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: selectedClub?.id === club.id ? colors.primaryMuted : 'transparent' }]}
                onPress={() => {
                  setSelectedClub(club);
                  setClubPickerOpen(false);
                }}
              >
                <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>{club.name}</Text>
                {club.role === 'admin' ? (
                  <View style={{ backgroundColor: theme.colors.competition, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start' }}>
                    <Text style={[typography.caption, { color: theme.colors.textInverse, fontWeight: '700', fontSize: 10 }]}>Admin</Text>
                  </View>
                ) : (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{club.role === 'team_lead' ? 'Team Lead' : 'Member'}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { flex: 1 },
  scrollContent: {},
  sectionTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  identityCard: {},
  avatarWrap: {},
  row: {},
  clubRow: {},
  clubActions: {},
  outlineBtn: { alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center' },
  picker: { maxHeight: 320 },
  pickerItem: {},
});
