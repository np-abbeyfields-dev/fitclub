import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme';
import { Card, Button, Input } from '../components';
import { useClub } from '../context/ClubContext';
import { roundService, type Round } from '../services/roundService';
import {
  type RoundScoringConfig,
  type ScoringMode,
  type ActivityRule,
  parseScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from '../types/roundConfig';
import { DEFAULT_ACTIVITY_TYPES } from '../config/workoutInputMap';
import { Ionicons } from '@expo/vector-icons';

type RouteParams = {
  RoundConfig:
    | { mode: 'create'; clubId: string }
    | { mode: 'edit'; roundId: string };
};

const SCORING_MODE_OPTIONS: { value: ScoringMode; label: string }[] = [
  { value: 'hybrid', label: 'Hybrid (per activity)' },
  { value: 'distance', label: 'Distance only' },
  { value: 'duration', label: 'Duration only' },
  { value: 'fixed', label: 'Fixed per workout' },
];

export default function RoundConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'RoundConfig'>>();
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { selectedClub } = useClub();

  const params = route.params;
  const isCreate = params?.mode === 'create';
  const clubId = isCreate ? (params as { mode: 'create'; clubId: string }).clubId : selectedClub?.id;
  const roundId = !isCreate ? (params as { mode: 'edit'; roundId: string }).roundId : undefined;

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [scoring, setScoring] = useState<RoundScoringConfig>({ ...DEFAULT_SCORING_CONFIG });
  const [activityPickerIndex, setActivityPickerIndex] = useState<number | null>(null);

  const [sourceRounds, setSourceRounds] = useState<Round[]>([]);
  const [sourceRoundId, setSourceRoundId] = useState<string | null>(null);
  const [copyTeams, setCopyTeams] = useState(false);
  const [scheduledStartAt, setScheduledStartAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreate && roundId) {
      let cancelled = false;
      (async () => {
        try {
          const res = await roundService.getById(roundId);
          const r: Round = res.data;
          if (cancelled) return;
          setName(r.name);
          setStartDate(r.startDate.slice(0, 10));
          setEndDate(r.endDate.slice(0, 10));
          setTeamSize(r.teamSize != null ? String(r.teamSize) : '');
          setScoring(parseScoringConfig(r.scoringConfig as Record<string, unknown>));
          setScheduledStartAt(r.scheduledStartAt ? r.scheduledStartAt.slice(0, 16) : null);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load round');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      setLoading(false);
    }
  }, [isCreate, roundId]);

  useEffect(() => {
    if (!isCreate || !clubId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await roundService.listByClub(clubId);
        const list = (res.data || []).filter((r) => r.status === 'draft' || r.status === 'completed');
        if (!cancelled) setSourceRounds(list);
      } catch {
        if (!cancelled) setSourceRounds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreate, clubId]);

  const applySourceRound = useCallback((round: Round) => {
    setName(round.name);
    setStartDate(round.startDate.slice(0, 10));
    setEndDate(round.endDate.slice(0, 10));
    setTeamSize(round.teamSize != null ? String(round.teamSize) : '');
    setScoring(parseScoringConfig(round.scoringConfig as Record<string, unknown>));
  }, []);

  const updateScoring = useCallback((patch: Partial<RoundScoringConfig>) => {
    setScoring((prev) => ({ ...prev, ...patch }));
  }, []);

  const setActivityRule = useCallback((index: number, patch: Partial<ActivityRule>) => {
    setScoring((prev) => {
      const rules = [...prev.activity_rules];
      rules[index] = { ...rules[index], ...patch };
      return { ...prev, activity_rules: rules };
    });
  }, []);

  const addActivityRule = useCallback(() => {
    const firstUnused =
      DEFAULT_ACTIVITY_TYPES.find(
        (a) => !scoring.activity_rules.some((r) => r.activity_type === a)
      ) ?? DEFAULT_ACTIVITY_TYPES[0];
    setScoring((prev) => ({
      ...prev,
      activity_rules: [
        ...prev.activity_rules,
        {
          activity_type: firstUnused,
          metric_type: firstUnused === 'Running' || firstUnused === 'Biking' ? 'distance' : 'duration',
          conversion_ratio: 1,
          minimum_threshold: 0,
          max_per_workout: 10,
        },
      ],
    }));
  }, [scoring.activity_rules]);

  const removeActivityRule = useCallback((index: number) => {
    setScoring((prev) => ({
      ...prev,
      activity_rules: prev.activity_rules.filter((_, i) => i !== index),
    }));
  }, []);

  const submit = useCallback(async () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      setError('Round name is required.');
      return;
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Valid start and end dates are required.');
      return;
    }
    if (end <= start) {
      setError('End date must be after start date.');
      return;
    }
    if (scoring.daily_cap_points <= 0) {
      setError('Daily cap must be greater than 0.');
      return;
    }
    if (scoring.scoring_mode === 'hybrid' && scoring.activity_rules.length === 0) {
      setError('Add at least one activity rule for hybrid mode.');
      return;
    }
    if (!clubId && isCreate) {
      setError('No club selected.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const body: Parameters<typeof roundService.create>[1] = {
        name: nameTrim,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        teamSize: teamSize.trim() ? parseInt(teamSize, 10) : undefined,
        scoringConfig: {
          scoring_mode: scoring.scoring_mode,
          daily_cap_points: scoring.daily_cap_points,
          per_workout_cap_points: scoring.per_workout_cap_points,
          activity_rules: scoring.activity_rules,
        },
      };
      if (isCreate && clubId) {
        if (sourceRoundId) {
          body.sourceRoundId = sourceRoundId;
          body.copyTeams = copyTeams;
        }
        await roundService.create(clubId, body);
        navigation.goBack();
      } else if (!isCreate && roundId) {
        body.scheduledStartAt = scheduledStartAt?.trim() ? (() => {
          const d = new Date(scheduledStartAt.trim());
          return isNaN(d.getTime()) ? null : d.toISOString();
        })() : null;
        await roundService.update(roundId, body);
        navigation.goBack();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  }, [name, startDate, endDate, teamSize, scoring, isCreate, clubId, roundId, sourceRoundId, copyTeams, scheduledStartAt, navigation]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
          {isCreate ? 'New challenge round' : 'Edit challenge round'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorMuted, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }]}>
            <Text style={[typography.bodySmall, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Create from existing round */}
        {isCreate && sourceRounds.length > 0 && (
          <Card style={[styles.section, { marginBottom: spacing.md }]}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>CREATE FROM EXISTING</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Prefill from a past or draft round and optionally copy team names.
            </Text>
            <View style={{ marginBottom: spacing.sm }}>
              {sourceRounds.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => {
                    if (sourceRoundId === r.id) {
                      setSourceRoundId(null);
                    } else {
                      setSourceRoundId(r.id);
                      applySourceRound(r);
                    }
                  }}
                  style={[
                    styles.sourceRow,
                    {
                      padding: spacing.sm,
                      borderRadius: radius.sm,
                      marginBottom: spacing.xs,
                      backgroundColor: sourceRoundId === r.id ? colors.primaryMuted : colors.borderLight,
                      borderWidth: 1,
                      borderColor: sourceRoundId === r.id ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {r.status} · {r.startDate.slice(0, 10)} – {r.endDate.slice(0, 10)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {sourceRoundId ? (
              <TouchableOpacity
                onPress={() => setCopyTeams((prev) => !prev)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      width: 22,
                      height: 22,
                      borderRadius: radius.sm,
                      borderWidth: 2,
                      borderColor: copyTeams ? colors.primary : colors.border,
                      backgroundColor: copyTeams ? colors.primary : colors.transparent,
                      marginRight: spacing.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  {copyTeams && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                </View>
                <Text style={[typography.body, { color: colors.text }]}>Copy teams from selected round</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}

        {/* Basics */}
        <Card style={[styles.section, { marginBottom: spacing.md }]}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>BASICS</Text>
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Name</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Spring 2025"
            style={[styles.input, { marginBottom: spacing.sm }]}
          />
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Start date</Text>
          <Input
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            style={[styles.input, { marginBottom: spacing.sm }]}
          />
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>End date</Text>
          <Input
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            style={[styles.input, { marginBottom: spacing.sm }]}
          />
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Max team size (optional)</Text>
          <Input
            value={teamSize}
            onChangeText={setTeamSize}
            placeholder="e.g. 5"
            keyboardType="number-pad"
            style={styles.input}
          />
        </Card>

        {/* Schedule start (edit draft only): round becomes active at this time via batch job */}
        {!isCreate && roundId && (
          <Card style={[styles.section, { marginBottom: spacing.md }]}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>SCHEDULE START</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Set when this round should go live. A batch job will change status to active at that time. Leave empty to start manually.
            </Text>
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Start at (date & time)</Text>
            <Input
              value={scheduledStartAt ?? ''}
              onChangeText={(t) => setScheduledStartAt(t.trim() || null)}
              placeholder="YYYY-MM-DDTHH:mm (e.g. 2025-03-15T09:00)"
              style={[styles.input, { marginBottom: spacing.xs }]}
            />
            {scheduledStartAt ? (
              <TouchableOpacity onPress={() => setScheduledStartAt(null)} style={{ alignSelf: 'flex-start' }}>
                <Text style={[typography.caption, { color: colors.primary }]}>Clear scheduled time</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}

        {/* Scoring */}
        <Card style={[styles.section, { marginBottom: spacing.md }]}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>SCORING</Text>
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Mode</Text>
          <View style={[styles.modeRow, { gap: spacing.xs }]}>
            {SCORING_MODE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => updateScoring({ scoring_mode: opt.value })}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: scoring.scoring_mode === opt.value ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[typography.caption, { color: scoring.scoring_mode === opt.value ? colors.textInverse : colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.twoCol, { marginTop: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Daily cap (pts)</Text>
              <Input
                value={String(scoring.daily_cap_points)}
                onChangeText={(t) => updateScoring({ daily_cap_points: Math.max(0, parseInt(t, 10) || 0) })}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Per-workout cap (optional)</Text>
              <Input
                value={scoring.per_workout_cap_points == null ? '' : String(scoring.per_workout_cap_points)}
                onChangeText={(t) => {
                  const v = t.trim();
                  updateScoring({ per_workout_cap_points: v === '' ? null : Math.max(0, parseInt(v, 10) || 0) });
                }}
                placeholder="None"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>
        </Card>

        {/* Activity rules (hybrid only) */}
        {scoring.scoring_mode === 'hybrid' && (
          <Card style={[styles.section, { marginBottom: spacing.md }]}>
            <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }]}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>ACTIVITY RULES</Text>
              <TouchableOpacity
                onPress={addActivityRule}
                style={[styles.addRuleBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary, marginLeft: spacing.xxs }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {scoring.activity_rules.map((rule, index) => (
              <View
                key={`${rule.activity_type}-${index}`}
                style={[styles.ruleCard, { borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm }]}
              >
                <View style={[styles.ruleHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }]}>
                  <TouchableOpacity
                    onPress={() => setActivityPickerIndex(index)}
                    style={{ flex: 1, marginRight: spacing.xs }}
                  >
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Activity</Text>
                    <Text style={[typography.label, { color: colors.primary }]} numberOfLines={1}>{rule.activity_type} ▾</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeActivityRule(index)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Points per unit</Text>
                    <Input
                      value={String(rule.conversion_ratio)}
                      onChangeText={(t) => setActivityRule(index, { conversion_ratio: parseFloat(t) || 0 })}
                      keyboardType="decimal-pad"
                      style={[styles.inputSmall, styles.input]}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.xs }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Min threshold</Text>
                    <Input
                      value={String(rule.minimum_threshold)}
                      onChangeText={(t) => setActivityRule(index, { minimum_threshold: parseFloat(t) || 0 })}
                      keyboardType="decimal-pad"
                      style={[styles.inputSmall, styles.input]}
                    />
                  </View>
                </View>
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Max pts per workout</Text>
                  <Input
                    value={String(rule.max_per_workout)}
                    onChangeText={(t) => setActivityRule(index, { max_per_workout: parseInt(t, 10) || 0 })}
                    keyboardType="number-pad"
                    style={[styles.inputSmall, styles.input]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}

        <Button title={saving ? 'Saving…' : isCreate ? 'Create challenge round' : 'Save changes'} onPress={submit} loading={saving} fullWidth />
      </ScrollView>

      <Modal visible={activityPickerIndex !== null} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setActivityPickerIndex(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, maxHeight: 320 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Select activity type</Text>
            <FlatList
              data={DEFAULT_ACTIVITY_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    if (activityPickerIndex !== null) {
                      setActivityRule(activityPickerIndex, {
                        activity_type: item,
                        metric_type: item === 'Running' || item === 'Biking' || item === 'Walking' || item === 'Swimming' ? 'distance' : 'duration',
                      });
                      setActivityPickerIndex(null);
                    }
                  }}
                  style={({ pressed }) => [{ padding: spacing.sm, borderRadius: radius.sm }, pressed && { backgroundColor: colors.borderLight }]}
                >
                  <Text style={[typography.body, { color: colors.text }]}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {},
  errorBanner: {},
  section: {},
  sectionHeader: {},
  input: {},
  inputSmall: { fontSize: 14 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  modeChip: {},
  twoCol: { flexDirection: 'row' },
  addRuleBtn: { flexDirection: 'row', alignItems: 'center' },
  ruleCard: { borderWidth: 1 },
  ruleHeader: {},
  sourceRow: {},
  checkbox: {},
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 320 },
});
