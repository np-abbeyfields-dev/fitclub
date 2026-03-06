import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import type { DashboardRound } from '../types/dashboard';

const MOTIVATIONAL_LINES = [
  'Every rep counts. Every day counts.',
  'Your team is counting on you.',
  'Time to perform.',
  'No shortcuts. Just results.',
];

function formatDuration(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function pickMotivational(roundId: string): string {
  const hash = roundId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return MOTIVATIONAL_LINES[Math.abs(hash) % MOTIVATIONAL_LINES.length];
}

type Props = {
  visible: boolean;
  round: DashboardRound;
  teamName: string | null;
  onDismiss: () => void;
  onViewLeaderboard: () => void;
  onLogWorkout: () => void;
};

export function ChallengeLaunchModal({
  visible,
  round,
  teamName,
  onDismiss,
  onViewLeaderboard,
  onLogWorkout,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const duration = formatDuration(round.startDate, round.endDate);
  const line = pickMotivational(round.id);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay ?? 'rgba(0,0,0,0.85)' }]}
        onPress={onDismiss}
      >
        <Pressable style={styles.outer} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: colors.primary,
                padding: spacing.lg,
                ...theme.shadows.lg,
              },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: spacing.sm }]}>
              <Text style={[typography.caption, { color: colors.heroText, fontWeight: '800', letterSpacing: 0.5 }]}>
                LIVE
              </Text>
            </View>
            <Text style={[typography.h1, { color: colors.text, marginBottom: spacing.xs, fontWeight: '800' }]} numberOfLines={2}>
              {round.name}
            </Text>
            {duration ? (
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '600' }]}>
                {duration}
              </Text>
            ) : null}
            {round.daysLeft > 0 && (
              <Text style={[typography.caption, { color: colors.primary, marginBottom: spacing.md, fontWeight: '700' }]}>
                {round.daysLeft} day{round.daysLeft === 1 ? '' : 's'} remaining
              </Text>
            )}
            <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.lg, fontStyle: 'italic', fontWeight: '500' }]}>
              {line}
            </Text>
            {teamName ? (
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg, fontWeight: '600' }]}>
                Team: {teamName}
              </Text>
            ) : null}
            <View style={[styles.actions, { gap: spacing.sm }]}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md }]}
                onPress={() => {
                  onDismiss();
                  onViewLeaderboard();
                }}
                activeOpacity={0.85}
              >
                <Text style={[typography.label, { color: colors.heroText, fontWeight: '800' }]}>View Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderWidth: 2, borderColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md }]}
                onPress={() => {
                  onDismiss();
                  onLogWorkout();
                }}
                activeOpacity={0.85}
              >
                <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>Log Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  outer: {
    width: '100%',
    maxWidth: 400,
  },
  card: {},
  badge: {},
  actions: {},
  primaryBtn: { alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { alignItems: 'center' },
});
