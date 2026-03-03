import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../components';
import { workoutService, type WorkoutActivity } from '../services/workoutService';
import { getInputConfig, getPointsPreview } from '../config/workoutInputMap';

export default function WorkoutNewScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = theme;

  const [activities, setActivities] = useState<WorkoutActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasProof, setHasProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workoutService
      .listActivities()
      .then((res) => {
        if (!cancelled && res.success && res.data) setActivities(res.data);
      })
      .catch((err) => {
        if (!cancelled) setActivitiesError(err?.message || 'Failed to load activities');
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const inputConfig = selectedWorkoutType ? getInputConfig(selectedWorkoutType) : null;
  const numValue = inputConfig
    ? inputConfig.inputType === 'distance'
      ? parseFloat(value) || 0
      : parseInt(value, 10) || 0
    : 0;
  const points = inputConfig ? getPointsPreview(inputConfig.inputType, numValue) : 0;

  const onDateChange = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) setDate(selected);
  };

  const onTimeChange = (_: any, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(date);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDate(next);
    }
  };

  const validate = (): boolean => {
    if (!selectedWorkoutType || !inputConfig) {
      Alert.alert('Select activity', 'Choose an activity type first.');
      return false;
    }
    if (inputConfig.inputType === 'distance' && (numValue <= 0 || isNaN(numValue))) {
      Alert.alert('Enter distance', `Enter a valid distance in ${inputConfig.unit}.`);
      return false;
    }
    if (inputConfig.inputType === 'duration' && (numValue <= 0 || isNaN(numValue))) {
      Alert.alert('Enter duration', `Enter a valid duration in ${inputConfig.unit}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    // TODO: API call to log workout
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    Alert.alert('Workout logged', `You earned ${points} points!`, [{ text: 'OK', onPress: goBack }]);
  };

  const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Log Workout</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { padding: spacing.md, paddingBottom: 120 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Activity chips (from API) */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Activity type</Text>
          {activitiesLoading ? (
            <View style={[styles.loadingRow, { paddingVertical: spacing.md }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                Loading activities…
              </Text>
            </View>
          ) : activitiesError ? (
            <View style={[styles.errorRow, { paddingVertical: spacing.md }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{activitiesError}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.chipsRow, { gap: spacing.xs }]}
              style={styles.chipsScroll}
            >
              {activities.map((a) => {
                const selected = selectedWorkoutType === a.workoutType;
                const icon = getInputConfig(a.workoutType).icon;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setSelectedWorkoutType(a.workoutType)}
                    activeOpacity={0.8}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderWidth: 2,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.sm,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={selected ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? colors.textInverse : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {a.workoutType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {inputConfig && selectedWorkoutType && (
            <>
              {/* Distance or Duration */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                {inputConfig.inputType === 'distance' ? 'Distance' : 'Duration'}
              </Text>
              <View style={styles.valueRow}>
                <Input
                  value={value}
                  onChangeText={setValue}
                  placeholder={inputConfig.inputType === 'distance' ? '0.0' : '0'}
                  keyboardType={inputConfig.inputType === 'distance' ? 'decimal-pad' : 'number-pad'}
                  style={[
                    styles.valueInput,
                    {
                      marginBottom: 0,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRightWidth: 0,
                    },
                  ]}
                />
                <View style={[styles.unitWrap, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                  <Text style={[styles.unit, { color: colors.textSecondary }]}>{inputConfig.unit}</Text>
                </View>
              </View>

              {/* Date & time */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                Date & time
              </Text>
              <View style={styles.datetimeRow}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.datetimeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.datetimeText, { color: colors.text }]}>{dateStr}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={[styles.datetimeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={[styles.datetimeText, { color: colors.text }]}>{timeStr}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              {/* Optional proof */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                Proof (optional)
              </Text>
              <TouchableOpacity
                onPress={() => setHasProof(!hasProof)}
                style={[
                  styles.proofBtn,
                  {
                    backgroundColor: hasProof ? colors.accentMuted : colors.surface,
                    borderColor: hasProof ? colors.accent : colors.border,
                    borderWidth: 2,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasProof ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={24}
                  color={hasProof ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.proofText, { color: hasProof ? colors.accent : colors.textSecondary }]}>
                  {hasProof ? 'Proof added' : 'Add photo or link'}
                </Text>
              </TouchableOpacity>

              {/* Points preview */}
              <Card style={[styles.pointsCard, { marginTop: spacing.lg }]}>
                <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                  You will earn
                </Text>
                <Text style={[styles.pointsValue, { color: colors.accent }]}>
                  {points.toFixed(1)} points
                </Text>
              </Card>
            </>
          )}
        </ScrollView>

        {/* Sticky submit */}
        <View
          style={[
            styles.stickyFooter,
            {
              paddingBottom: insets.bottom + spacing.sm,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Button
            title="Submit workout"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!inputConfig || !selectedWorkoutType || !value.trim()}
            fullWidth
            style={styles.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: {},
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: { paddingVertical: 4 },
  chipsScroll: { marginHorizontal: -24 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipLabel: { fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: {},
  errorRow: {},
  errorText: { fontSize: 14 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },
  valueInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    minHeight: 56,
  },
  unitWrap: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  unit: { fontSize: 16, fontWeight: '700' },
  datetimeRow: { flexDirection: 'row', gap: 12 },
  datetimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  datetimeText: { fontSize: 16, fontWeight: '600' },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  proofText: { fontSize: 16, fontWeight: '600' },
  pointsCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pointsLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  pointsValue: { fontSize: 28, fontWeight: '800' },
  stickyFooter: {
    borderTopWidth: 1,
  },
  submitBtn: {},
});
