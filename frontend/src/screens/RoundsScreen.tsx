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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { roundService, type Round } from '../services/roundService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Rounds'>;

export default function RoundsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedClub) {
      setRounds([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await roundService.listByClub(selectedClub.id);
      setRounds(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rounds');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClub]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (selectedClub) load();
    }, [selectedClub, load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshClubs(), load()]);
  }, [refreshClubs, load]);

  const openCreate = useCallback(() => {
    if (!selectedClub) return;
    navigation.navigate('RoundConfig', { mode: 'create', clubId: selectedClub.id });
  }, [selectedClub, navigation]);

  const openEdit = useCallback(
    (r: Round) => {
      if (r.status !== 'draft') return;
      navigation.navigate('RoundConfig', { mode: 'edit', roundId: r.id });
    },
    [navigation]
  );

  const activate = useCallback(async (r: Round) => {
    setActioningId(r.id);
    try {
      await roundService.activate(r.id);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to activate round');
    } finally {
      setActioningId(null);
    }
  }, [load]);

  const endRound = useCallback(async (r: Round) => {
    Alert.alert('End round', `End "${r.name}"? No one will be able to log workouts for this round after.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End round',
        style: 'destructive',
        onPress: async () => {
          setActioningId(r.id);
          try {
            await roundService.end(r.id);
            await load();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end round');
          } finally {
            setActioningId(null);
            }
          },
      },
    ]);
  }, [load]);

  if (!selectedClub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Select a club to manage challenge rounds.</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Only admins can manage challenge rounds.</Text>
      </View>
    );
  }

  const statusColor = (s: string) => (s === 'active' ? colors.accent : s === 'completed' ? colors.textMuted : colors.primary);
  const statusBgColor = (s: string) => (s === 'active' ? colors.accentMuted : s === 'completed' ? colors.borderLight : colors.primaryMuted);

  const hasActiveRound = rounds.some((r) => r.status === 'active');
  const draftRounds = rounds.filter((r) => r.status === 'draft');
  const showNoLiveBanner = !hasActiveRound && draftRounds.length > 0;
  const onlyCompleted = !hasActiveRound && draftRounds.length === 0 && rounds.length > 0;

  return (
    <>
      <View style={[styles.headerOuter, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          {navigation.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs, marginRight: spacing.sm }} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', flex: 1 }]} numberOfLines={1}>Challenge rounds</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flexShrink: 0 }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={[typography.label, { color: colors.textInverse }]} numberOfLines={1}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {showNoLiveBanner && (
          <Card style={[styles.banner, { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary }]}>
            <Text style={[typography.body, { fontWeight: '600', color: colors.text, marginBottom: spacing.xs }]}>No round is live</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              You have a draft round. Set a start date & time (Edit) or start it right away (Start now).
            </Text>
          </Card>
        )}

        {onlyCompleted && (
          <Card style={[styles.banner, { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[typography.body, { fontWeight: '600', color: colors.text, marginBottom: spacing.xs }]}>No round is live</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Create a new round to start another challenge. You can copy from a past round when creating.
            </Text>
          </Card>
        )}

        <View style={{ gap: spacing.sm }}>
          {rounds.map((r) => {
            const busy = actioningId === r.id;
            return (
              <Card key={r.id} style={[styles.roundCard, { padding: spacing.md, ...theme.shadows.sm }]}>
                <View style={styles.roundRow}>
                  <View style={styles.roundBody}>
                    <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBgColor(r.status), paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: spacing.xs }]}>
                      <Text style={[typography.caption, { fontWeight: '600', color: statusColor(r.status) }]}>{r.status}</Text>
                    </View>
                    {r.status === 'draft' && r.scheduledStartAt && (
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        Starts {new Date(r.scheduledStartAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.roundActions, { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
                    {r.status === 'draft' && (
                      <>
                        <TouchableOpacity onPress={() => openEdit(r)} style={[styles.iconBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary }]}>
                          <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[typography.caption, { fontWeight: '600', color: colors.primary }]}>Set start</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => activate(r)} disabled={busy} style={[styles.iconBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.accent }]}>
                          {busy ? <ActivityIndicator size="small" color={colors.textInverse} /> : <><Ionicons name="play-outline" size={18} color={colors.textInverse} style={{ marginRight: 4 }} /><Text style={[typography.caption, { fontWeight: '600', color: colors.textInverse }]}>Start now</Text></>}
                        </TouchableOpacity>
                      </>
                    )}
                    {r.status === 'active' && (
                      <TouchableOpacity onPress={() => endRound(r)} disabled={busy} style={[styles.iconBtn, { padding: spacing.xs }]}>
                        {busy ? <ActivityIndicator size="small" color={colors.error} /> : <Ionicons name="stop-outline" size={22} color={colors.error} />}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {rounds.length === 0 && !loading && (
          <View style={[styles.empty, { padding: spacing.xl }]}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>No challenge rounds yet. Create one to start.</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  headerOuter: {},
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  errorBanner: {},
  roundCard: {},
  roundRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  roundBody: { flex: 1, minWidth: 0 },
  statusBadge: {},
  roundActions: {},
  iconBtn: { flexDirection: 'row', alignItems: 'center' },
  banner: {},
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: {},
  empty: { alignItems: 'center', justifyContent: 'center' },
});
