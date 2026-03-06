import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { useDashboardStore } from '../store/dashboardStore';
import { clubService } from '../services/clubService';
import { workoutService, type WorkoutActivity, type LogWorkoutPayload } from '../services/workoutService';
import { getInputConfig, getPointsPreview, DEFAULT_ACTIVITY_TYPES } from '../config/workoutInputMap';
import type { RecentWorkout } from '../types/dashboard';

const STEP_DURATION = 5;
const STEP_DISTANCE = 0.5;

export default function WorkoutNewScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<HomeStackParamList, 'WorkoutNew'>>();
  const insets = useSafeAreaInsets();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;
  const { selectedClub } = useClub();
  const { lastLoggedWorkout, setLastLoggedWorkout, optimisticallyAddWorkout } = useDashboardStore();
  const repeatLastIntent = route.params?.repeatLast === true;

  const [activities, setActivities] = useState<WorkoutActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [hasProof, setHasProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dailyCap, setDailyCap] = useState<number | null>(null);
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [successPoints, setSuccessPoints] = useState<number | null>(null);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const successOpacity = React.useRef(new Animated.Value(0)).current;
  const successScale = React.useRef(new Animated.Value(0.85)).current;

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await workoutService.listActivities();
      if (res.success && res.data && res.data.length > 0) {
        setActivities(res.data);
      } else {
        // Fallback when API returns empty (e.g. generic_workout_met not seeded)
        setActivities(
          DEFAULT_ACTIVITY_TYPES.map((workoutType, i) => ({
            id: i + 1,
            workoutType,
            metCap: null,
            avgMetPerHour: null,
            maxMetLimit: null,
          }))
        );
      }
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
      // Still show fallback so the page is usable offline or when API fails
      setActivities(
        DEFAULT_ACTIVITY_TYPES.map((workoutType, i) => ({
          id: i + 1,
          workoutType,
          metCap: null,
          avgMetPerHour: null,
          maxMetLimit: null,
        }))
      );
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!selectedClub) return;
    try {
      const dash = await clubService.getDashboard(selectedClub.id);
      const round = dash.data?.activeRound;
      setActiveRoundId(round?.id ?? null);
      setDailyCap(dash.data?.dailyCap ?? null);
      setTodayPoints(dash.data?.todayPoints ?? 0);
      setRecentWorkouts(dash.data?.recentWorkouts ?? []);
    } catch {
      setActiveRoundId(null);
      setDailyCap(null);
      setTodayPoints(0);
      setRecentWorkouts([]);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const lastWorkout = lastLoggedWorkout ?? (recentWorkouts[0] ? {
    activityType: recentWorkouts[0].activityName,
    points: recentWorkouts[0].points,
    durationMinutes: undefined,
    distanceKm: undefined,
  } : null);

  const inputConfig = selectedType ? getInputConfig(selectedType) : null;
  const isDistance = inputConfig?.inputType === 'distance';
  const numValue = inputConfig
    ? isDistance
      ? parseFloat(distance) || 0
      : parseInt(duration, 10) || 0
    : 0;
  const points = inputConfig ? getPointsPreview(inputConfig.inputType, numValue) : 0;
  const atOrOverCap = dailyCap != null && todayPoints >= dailyCap;
  const wouldHitCap = dailyCap != null && todayPoints + points > dailyCap && todayPoints < dailyCap;
  const pointsAfterSubmit = dailyCap != null ? Math.min(todayPoints + points, dailyCap) - todayPoints : points;

  const validate = useCallback((): string | null => {
    if (!selectedType || !inputConfig) return 'Select an activity type';
    if (isDistance) {
      if (!distance.trim()) return `Enter distance (${inputConfig.unit})`;
      const v = parseFloat(distance);
      if (isNaN(v) || v <= 0) return `Enter a valid distance in ${inputConfig.unit}`;
    } else {
      if (!duration.trim()) return `Enter duration (${inputConfig.unit})`;
      const v = parseInt(duration, 10);
      if (isNaN(v) || v <= 0) return `Enter a valid duration in ${inputConfig.unit}`;
    }
    if (activeRoundId == null) return 'No active round. Join a round to log workouts.';
    if (atOrOverCap) return "You've reached your daily points cap.";
    return null;
  }, [selectedType, inputConfig, isDistance, duration, distance, activeRoundId, atOrOverCap]);

  const runSuccessFlow = useCallback((awarded: number, activityName: string, showStreak: boolean) => {
    setSuccessPoints(awarded);
    setStreakMessage(showStreak ? 'Streak increased' : null);
    successOpacity.setValue(0);
    successScale.setValue(0.85);
    if (selectedClub && activeRoundId) {
      optimisticallyAddWorkout(selectedClub.id, activeRoundId, { points: awarded, activityName });
    }
    setLastLoggedWorkout({
      activityType: selectedType!,
      points: awarded,
      durationMinutes: isDistance ? undefined : parseInt(duration, 10) || undefined,
      distanceKm: isDistance ? parseFloat(distance) || undefined : undefined,
    });
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120 }),
    ]).start();
    setTimeout(() => {
      Animated.timing(successOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setSuccessPoints(null);
        setStreakMessage(null);
        (navigation as any).getParent()?.navigate('MainTabs', { screen: 'HomeTab' });
      });
    }, 1500);
  }, [selectedType, duration, distance, isDistance, selectedClub, activeRoundId, successOpacity, successScale, optimisticallyAddWorkout, setLastLoggedWorkout, navigation]);

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    const payload: LogWorkoutPayload = {
      activityType: selectedType!,
      durationMinutes: isDistance ? undefined : parseInt(duration, 10) || undefined,
      distanceKm: isDistance ? parseFloat(distance) || undefined : undefined,
      proofUrl: hasProof ? 'proof' : undefined,
      note: note.trim() || undefined,
      loggedAt: new Date().toISOString(),
    };
    const result = await workoutService.logWorkout(activeRoundId!, payload);
    setSubmitting(false);
    if (result.success && result.data != null) {
      const awarded = result.data.points ?? pointsAfterSubmit;
      runSuccessFlow(awarded, selectedType!, true);
    } else {
      setSubmitError(result.error ?? 'Failed to log workout');
    }
  };

  const handleRepeat = async () => {
    if (!lastWorkout || !activeRoundId) return;
    const activityType = lastWorkout.activityType;
    const durationMinutes = lastWorkout.durationMinutes ?? 30;
    const distanceKm = lastWorkout.distanceKm;
    const isDist = getInputConfig(activityType).inputType === 'distance';
    setSubmitting(true);
    setSubmitError(null);
    const payload: LogWorkoutPayload = {
      activityType,
      durationMinutes: isDist ? undefined : durationMinutes,
      distanceKm: isDist ? (distanceKm ?? 5) : undefined,
      loggedAt: new Date().toISOString(),
    };
    const result = await workoutService.logWorkout(activeRoundId, payload);
    setSubmitting(false);
    if (result.success && result.data != null) {
      const awarded = result.data.points ?? lastWorkout.points;
      if (selectedClub) optimisticallyAddWorkout(selectedClub.id, activeRoundId, { points: awarded, activityName: activityType });
      setLastLoggedWorkout({ activityType, points: awarded, durationMinutes: isDist ? undefined : durationMinutes, distanceKm: isDist ? distanceKm : undefined });
      setSuccessPoints(awarded);
      setStreakMessage('Streak increased');
      successOpacity.setValue(0);
      successScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120 }),
      ]).start();
      setTimeout(() => {
        Animated.timing(successOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setSuccessPoints(null);
          setStreakMessage(null);
          (navigation as any).getParent()?.navigate('MainTabs', { screen: 'HomeTab' });
        });
      }, 1500);
    } else {
      setSubmitError(result.error ?? 'Failed to log workout');
    }
  };

  const handleEditFromQuickLog = () => {
    if (!lastWorkout) return;
    setSelectedType(lastWorkout.activityType);
    const cfg = getInputConfig(lastWorkout.activityType);
    if (cfg.inputType === 'distance') {
      setDistance(String(lastWorkout.distanceKm ?? 5));
      setDuration('');
    } else {
      setDuration(String(lastWorkout.durationMinutes ?? 30));
      setDistance('');
    }
    setSubmitError(null);
    (navigation as any).setParams?.({ repeatLast: false });
  };

  const stepUp = () => {
    if (isDistance) {
      const v = parseFloat(distance) || 0;
      setDistance(String(Math.round((v + STEP_DISTANCE) * 10) / 10));
    } else {
      const v = parseInt(duration, 10) || 0;
      setDuration(String(v + STEP_DURATION));
    }
  };
  const stepDown = () => {
    if (isDistance) {
      const v = parseFloat(distance) || 0;
      if (v > STEP_DISTANCE) setDistance(String(Math.round((v - STEP_DISTANCE) * 10) / 10));
    } else {
      const v = parseInt(duration, 10) || 0;
      if (v > STEP_DURATION) setDuration(String(v - STEP_DURATION));
    }
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={[styles.header, { paddingTop: insets.top + s.sm, paddingBottom: s.sm, paddingHorizontal: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goBack} hitSlop={12} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: '800' }]}>Log Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { padding: s.sm, paddingBottom: 120 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* One-tap repeat banner when opened from Home Quick Log */}
          {repeatLastIntent && lastWorkout && activeRoundId && (
            <View
              style={[
                styles.oneTapRepeatBanner,
                {
                  backgroundColor: colors.primaryMuted ?? colors.primarySoft,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  borderRadius: r.md,
                  padding: s.sm,
                  marginBottom: s.sm,
                  ...shadows.card,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.xxs }]}>
                Log same workout?
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: s.xs }}>
                <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>
                  {lastWorkout.activityType}
                  {(lastWorkout.durationMinutes != null || lastWorkout.distanceKm != null) && (
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                      {' '}· {lastWorkout.durationMinutes != null ? `${lastWorkout.durationMinutes} min` : `${lastWorkout.distanceKm} km`}
                    </Text>
                  )}
                  <Text style={[typography.caption, { color: colors.energy, fontWeight: '700' }]}> +{lastWorkout.points} pts</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: s.xs }}>
                  <TouchableOpacity
                    onPress={handleRepeat}
                    disabled={submitting || atOrOverCap}
                    style={[styles.quickLogBtn, { backgroundColor: colors.primary, borderRadius: r.sm, paddingVertical: s.xs, paddingHorizontal: s.sm }]}
                    activeOpacity={0.9}
                  >
                    <Text style={[typography.caption, { color: colors.textInverse, fontWeight: '800' }]}>Log</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleEditFromQuickLog}
                    style={[styles.quickLogBtn, { backgroundColor: colors.border, borderRadius: r.sm, paddingVertical: s.xs, paddingHorizontal: s.sm }]}
                    activeOpacity={0.9}
                  >
                    <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 1. Quick Log (when not from one-tap intent) */}
          {!repeatLastIntent && lastWorkout && activeRoundId && (
            <View style={[styles.quickLogCard, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary, borderRadius: r.md, padding: s.md, marginBottom: s.sm, ...shadows.card }]}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: s.xxs }]}>Last logged</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: s.xs }}>
                <View>
                  <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '800' }]} numberOfLines={1}>{lastWorkout.activityType}</Text>
                  <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                    +{lastWorkout.points} pts
                    {(lastWorkout.durationMinutes != null || lastWorkout.distanceKm != null) && (
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {' '}· {lastWorkout.durationMinutes != null ? `${lastWorkout.durationMinutes} min` : `${lastWorkout.distanceKm} km`}
                      </Text>
                    )}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: s.xs }}>
                  <TouchableOpacity onPress={handleRepeat} disabled={submitting || atOrOverCap} style={[styles.quickLogBtn, { backgroundColor: colors.primary, borderRadius: r.sm, paddingVertical: s.xs, paddingHorizontal: s.sm }]} activeOpacity={0.9}>
                    <Text style={[typography.caption, { color: colors.heroText, fontWeight: '800' }]}>Repeat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEditFromQuickLog} style={[styles.quickLogBtn, { backgroundColor: colors.border, borderRadius: r.sm, paddingVertical: s.xs, paddingHorizontal: s.sm }]} activeOpacity={0.9}>
                    <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 2. Activity type — pill cards */}
          <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontWeight: '800', marginBottom: s.xs }]}>Activity type</Text>
          {activitiesLoading ? (
            <View style={[styles.loadingWrap, { paddingVertical: s.lg }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: s.sm }]}>Loading…</Text>
            </View>
          ) : activitiesError ? (
            <Text style={[typography.caption, { color: colors.error, fontWeight: '600' }]}>{activitiesError}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, { gap: s.xs, paddingVertical: s.xs }]}>
              {activities.map((a) => {
                const config = getInputConfig(a.workoutType);
                const selected = selectedType === a.workoutType;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => { setSelectedType(a.workoutType); setSubmitError(null); }}
                    activeOpacity={0.85}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: r.sm,
                        paddingVertical: s.sm,
                        paddingHorizontal: s.md,
                        ...(selected ? shadows.sm : {}),
                      },
                    ]}
                  >
                    <Ionicons name={config.icon} size={22} color={selected ? colors.heroText : colors.textSecondary} />
                    <Text style={[typography.caption, { color: selected ? colors.textInverse : colors.textPrimary, fontWeight: '800', marginLeft: s.sm }]} numberOfLines={1}>{a.workoutType}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 3. Dynamic inputs + stepper */}
          {inputConfig && selectedType && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontWeight: '800', marginTop: s.md, marginBottom: s.xs }]}>
                {inputConfig.inputType === 'distance' ? 'Distance' : 'Duration'}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.md, borderWidth: 1, ...shadows.card }]}>
                <TouchableOpacity onPress={stepDown} style={[styles.stepperBtn, { borderRightWidth: 1, borderRightColor: colors.border }]} activeOpacity={0.8}>
                  <Ionicons name="remove" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  value={isDistance ? distance : duration}
                  onChangeText={isDistance ? setDistance : setDuration}
                  placeholder={isDistance ? '0.0' : '0'}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={isDistance ? 'decimal-pad' : 'number-pad'}
                  style={[styles.bigInput, { color: colors.textPrimary }]}
                />
                <View style={[styles.unitBadge, { backgroundColor: colors.border }]}>
                  <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '800' }]}>{inputConfig.unit}</Text>
                </View>
                <TouchableOpacity onPress={stepUp} style={[styles.stepperBtn, { borderLeftWidth: 1, borderLeftColor: colors.border }]} activeOpacity={0.8}>
                  <Ionicons name="add" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {(isDistance ? parseFloat(distance) <= 0 : (parseInt(duration, 10) || 0) <= 0) && (isDistance ? distance.trim() : duration.trim()) && (
                <Text style={[typography.caption, { color: colors.error, marginTop: s.xxs, fontWeight: '600' }]}>Enter a value greater than 0</Text>
              )}
              {dailyCap != null && (
                <View style={[styles.capRow, { marginTop: s.sm }]}>
                  {atOrOverCap ? (
                    <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>Daily cap reached ({todayPoints}/{dailyCap} pts). Log tomorrow.</Text>
                  ) : wouldHitCap ? (
                    <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>You'll hit daily cap — only +{Math.max(0, dailyCap - todayPoints)} pts will count today.</Text>
                  ) : (
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Today: {todayPoints}/{dailyCap} pts</Text>
                  )}
                </View>
              )}

              {/* 4. Live points preview */}
              <View style={[styles.pointsPreview, { marginTop: s.md, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.energy, borderRadius: r.md, paddingVertical: s.md, ...shadows.card }]}>
                <Text style={[typography.metric, { color: colors.energy }]}>+{dailyCap != null ? pointsAfterSubmit : points} pts</Text>
              </View>

              {/* 5. Optional — collapsed */}
              <TouchableOpacity onPress={() => setOptionalExpanded(!optionalExpanded)} style={[styles.optionalToggle, { marginTop: s.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: s.sm }]} activeOpacity={0.8}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>Note & proof (optional)</Text>
                <Ionicons name={optionalExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {optionalExpanded && (
                <View style={{ marginTop: s.xs }}>
                  <TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.textSecondary} style={[styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary, borderRadius: r.sm, padding: s.sm, minHeight: 72 }]} multiline />
                  <TouchableOpacity onPress={() => setHasProof(!hasProof)} style={[styles.proofBtn, { backgroundColor: hasProof ? colors.accentMuted : colors.card, borderColor: hasProof ? colors.energy : colors.border, marginTop: s.sm, gap: s.sm, paddingVertical: s.sm, borderRadius: r.sm }]} activeOpacity={0.8}>
                    <Ionicons name={hasProof ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={hasProof ? colors.accent : colors.textSecondary} />
                    <Text style={[typography.caption, { color: hasProof ? colors.accent : colors.textSecondary, fontWeight: '600' }]}>{hasProof ? 'Proof added' : 'Upload proof'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {submitError && <Text style={[typography.caption, { color: colors.error, fontWeight: '600', marginTop: s.sm }]}>{submitError}</Text>}
        </ScrollView>

        {/* 6. Sticky CTA */}
        <View style={[styles.footer, { paddingTop: s.sm, paddingBottom: insets.bottom + s.sm, paddingHorizontal: s.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !selectedType || (isDistance ? !distance.trim() : !duration.trim()) || atOrOverCap || !activeRoundId}
            activeOpacity={0.9}
            style={[styles.cta, { backgroundColor: (submitting || !selectedType || atOrOverCap || !activeRoundId) ? colors.border : colors.primary, borderRadius: r.sm, paddingVertical: s.md }]}
          >
            {submitting ? <ActivityIndicator size="small" color={colors.heroText} /> : <Text style={[typography.label, { color: colors.heroText, fontWeight: '800' }]}>Log Workout</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 7. Success overlay */}
      {successPoints != null && (
        <Animated.View style={[styles.successOverlay, { backgroundColor: colors.surface, opacity: successOpacity }]} pointerEvents="box-none">
          <Animated.View style={[styles.successContent, { transform: [{ scale: successScale }] }]}>
            <Text style={[typography.metric, { color: colors.energy }]}>+{successPoints} pts</Text>
            {streakMessage && <Text style={[typography.label, { color: colors.textPrimary, marginTop: s.xs }]}>🔥 {streakMessage}</Text>}
            {!streakMessage && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: s.xs }]}>Logged</Text>}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { flex: 1 },
  scrollContent: {},
  sectionLabel: {},
  quickLogCard: {},
  oneTapRepeatBanner: {},
  quickLogBtn: {},
  loadingWrap: { flexDirection: 'row', alignItems: 'center' },
  pillRow: { paddingHorizontal: 2 },
  pill: { flexDirection: 'row', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'stretch' },
  stepperBtn: { paddingHorizontal: 12, justifyContent: 'center', minWidth: 48 },
  bigInput: { flex: 1, fontSize: 28, fontWeight: '800', paddingVertical: 16, paddingHorizontal: 8, textAlign: 'center' },
  unitBadge: { paddingHorizontal: 16, justifyContent: 'center', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  capRow: {},
  pointsPreview: { alignItems: 'center' },
  pointsValue: { fontSize: 36 },
  optionalToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteInput: { borderWidth: 1, minHeight: 72, fontSize: 14 },
  proofBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  footer: {},
  cta: { alignItems: 'center', justifyContent: 'center' },
  successOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  successContent: { alignItems: 'center' },
  successPts: { fontSize: 48, fontWeight: '800' },
});
