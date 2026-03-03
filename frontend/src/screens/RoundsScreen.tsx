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
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components';
import { useClub } from '../context/ClubContext';
import { roundService, type Round } from '../services/roundService';
import { shadows } from '../theme/tokens';

const DEFAULT_SCORING_CONFIG = { dailyCap: 100, pointsPerMinute: 1 };

export default function RoundsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub, isAdmin, refreshClubs } = useClub();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshClubs(), load()]);
  }, [refreshClubs, load]);

  const openCreate = useCallback(() => {
    setEditingRound(null);
    setFormName('');
    setFormStart('');
    setFormEnd('');
    setFormError(null);
    setModalOpen('create');
  }, []);

  const openEdit = useCallback((r: Round) => {
    if (r.status !== 'draft') return;
    setEditingRound(r);
    setFormName(r.name);
    setFormStart(r.startDate.slice(0, 10));
    setFormEnd(r.endDate.slice(0, 10));
    setFormError(null);
    setModalOpen('edit');
  }, []);

  const submitForm = useCallback(async () => {
    const name = formName.trim();
    if (!name) {
      setFormError('Round name is required.');
      return;
    }
    const start = formStart ? new Date(formStart) : null;
    const end = formEnd ? new Date(formEnd) : null;
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      setFormError('Valid start and end dates are required.');
      return;
    }
    if (end <= start) {
      setFormError('End date must be after start date.');
      return;
    }
    if (!selectedClub) return;
    setFormError(null);
    try {
      if (modalOpen === 'create') {
        await roundService.create(selectedClub.id, {
          name,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          scoringConfig: DEFAULT_SCORING_CONFIG,
        });
        setModalOpen(null);
        await load();
      } else if (modalOpen === 'edit' && editingRound) {
        await roundService.update(editingRound.id, {
          name,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          scoringConfig: DEFAULT_SCORING_CONFIG,
        });
        setModalOpen(null);
        setEditingRound(null);
        await load();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Request failed');
    }
  }, [formName, formStart, formEnd, modalOpen, editingRound, selectedClub, load]);

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
        <Text style={[typography.body, { color: colors.textSecondary }]}>Select a club to manage challenges.</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Only admins can manage challenges.</Text>
      </View>
    );
  }

  const statusColor = (s: string) => (s === 'active' ? colors.accent : s === 'ended' ? colors.textMuted : colors.primary);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }]}>
          <Text style={[typography.h1, { color: colors.text }]}>Challenges</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={[typography.label, { color: colors.textInverse }]}>Create challenge</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          {rounds.map((r) => {
            const busy = actioningId === r.id;
            return (
              <Card key={r.id} style={[styles.roundCard, { padding: spacing.md, ...shadows.sm }]}>
                <View style={styles.roundRow}>
                  <View style={styles.roundBody}>
                    <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(r.status) + '20', paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: spacing.xs }]}>
                      <Text style={[typography.caption, { fontWeight: '600', color: statusColor(r.status) }]}>{r.status}</Text>
                    </View>
                  </View>
                  <View style={[styles.roundActions, { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
                    {r.status === 'draft' && (
                      <>
                        <TouchableOpacity onPress={() => openEdit(r)} style={[styles.iconBtn, { padding: spacing.xs }]}>
                          <Ionicons name="pencil-outline" size={22} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => activate(r)} disabled={busy} style={[styles.iconBtn, { padding: spacing.xs }]}>
                          {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="play-outline" size={22} color={colors.accent} />}
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
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>No challenges yet. Create one to start.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalOpen !== null} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setModalOpen(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>{modalOpen === 'create' ? 'Create challenge' : 'Edit challenge'}</Text>
            {formError && (
              <View style={[styles.formError, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                <Text style={[typography.bodySmall, { color: colors.error }]}>{formError}</Text>
              </View>
            )}
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.text }]}
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Spring 2025"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Start date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.text }]}
              value={formStart}
              onChangeText={setFormStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>End date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, color: colors.text }]}
              value={formEnd}
              onChangeText={setFormEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <View style={[styles.modalActions, { flexDirection: 'row', gap: spacing.sm }]}>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }]} onPress={() => setModalOpen(null)}>
                <Text style={[typography.label, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary }]} onPress={submitForm}>
                <Text style={[typography.label, { color: colors.textInverse }]}>{modalOpen === 'create' ? 'Create' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
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
  roundCard: {},
  roundRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  roundBody: { flex: 1, minWidth: 0 },
  statusBadge: {},
  roundActions: {},
  iconBtn: {},
  primaryBtn: {},
  secondaryBtn: {},
  empty: { alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400 },
  formError: {},
  input: { borderWidth: 1 },
  modalActions: {},
});
