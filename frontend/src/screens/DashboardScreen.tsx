import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { clubService } from '../services/clubService';
import { roundService, type Round } from '../services/roundService';
import { teamService } from '../services/teamService';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && selectedClub?.id && !selectedClub.inviteCode) {
      clubService.getById(selectedClub.id).then((res) => {
        if (res.data?.inviteCode) setInviteCode(res.data.inviteCode);
      }).catch(() => {});
    } else if (selectedClub?.inviteCode) {
      setInviteCode(selectedClub.inviteCode);
    } else {
      setInviteCode(null);
    }
  }, [isAdmin, selectedClub?.id, selectedClub?.inviteCode]);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setActiveRound(null);
      setMembersCount(0);
      setTeamsCount(0);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [roundsRes, membersRes] = await Promise.all([
        roundService.listByClub(selectedClub.id),
        clubService.listMembers(selectedClub.id),
      ]);
      const rounds = roundsRes.data || [];
      const active = rounds.find((r) => r.status === 'active') || null;
      setActiveRound(active);
      setMembersCount((membersRes.data || []).length);
      if (active) {
        const teamsRes = await teamService.listByRound(active.id);
        setTeamsCount((teamsRes.data || []).length);
      } else {
        setTeamsCount(0);
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

  const codeToShare = inviteCode ?? selectedClub?.inviteCode;
  const handleInvite = useCallback(async () => {
    if (!codeToShare) return;
    const message = `Join my FitClub! Use invite code: ${codeToShare}`;
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: 'Join FitClub',
          text: message,
        });
      } else {
        await Share.share({ message });
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        await navigator.clipboard?.writeText(codeToShare);
        Alert.alert('Copied', 'Invite code copied to clipboard.');
      }
    }
  }, [codeToShare]);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.xs }]}>No club selected</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Create or join a club to get started.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Loading…</Text>
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
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
          <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Stats cards */}
      <View style={[styles.cardsRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
        <Card style={[styles.statCard, { padding: spacing.md, flex: 1, ...theme.shadows.sm }]}>
          <Ionicons name="trophy-outline" size={28} color={colors.primary} style={{ marginBottom: spacing.xs }} />
          <Text style={[typography.h3, { color: colors.text }]}>{activeRound ? activeRound.name : '—'}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xxs }]}>Active round</Text>
        </Card>
        <Card style={[styles.statCard, { padding: spacing.md, flex: 1, ...theme.shadows.sm }]}>
          <Ionicons name="people-outline" size={28} color={colors.accent} style={{ marginBottom: spacing.xs }} />
          <Text style={[typography.h3, { color: colors.text }]}>{membersCount}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xxs }]}>Members</Text>
        </Card>
        <Card style={[styles.statCard, { padding: spacing.md, flex: 1, ...theme.shadows.sm }]}>
          <Ionicons name="people-circle-outline" size={28} color={colors.gold} style={{ marginBottom: spacing.xs }} />
          <Text style={[typography.h3, { color: colors.text }]}>{teamsCount}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xxs }]}>Teams</Text>
        </Card>
      </View>

      {isAdmin && (
        <View style={[styles.actions, { gap: spacing.sm }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }]}
            onPress={handleInvite}
            activeOpacity={0.8}
            disabled={!codeToShare}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.textInverse} />
            <Text style={[typography.label, { color: colors.textInverse }]}>Invite member</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isAdmin && (
        <Card style={{ padding: spacing.md }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>You’re viewing as a member. Admin tools are hidden.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  errorBanner: {},
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statCard: {},
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center' },
});
