import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export type MilestoneKind = 'workouts5' | 'points100' | 'streak3' | 'streak5' | 'streak7';

const MILESTONE_CONFIG: Record<
  MilestoneKind,
  { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  workouts5: {
    title: '5 Workouts!',
    message: "You've logged 5 workouts this round. Keep the momentum going.",
    icon: 'fitness',
  },
  points100: {
    title: '100 Points!',
    message: "You've hit 100 points. Your team is lucky to have you.",
    icon: 'trophy',
  },
  streak3: {
    title: '3-Day Streak!',
    message: "Three days in a row. You're building a habit.",
    icon: 'flame',
  },
  streak5: {
    title: '5-Day Streak!',
    message: 'Five days straight. You\'re on fire.',
    icon: 'flame',
  },
  streak7: {
    title: '7-Day Streak!',
    message: 'A full week of workouts. Incredible consistency.',
    icon: 'flame',
  },
};

type Props = {
  visible: boolean;
  milestone: MilestoneKind | null;
  onDismiss: () => void;
};

export function MilestoneModal({ visible, milestone, onDismiss }: Props) {
  const theme = useTheme();
  const { colors, spacing, radius, typography, shadows } = theme;
  const config = milestone ? MILESTONE_CONFIG[milestone] : null;

  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay ?? 'rgba(0,0,0,0.5)' }]}
        onPress={onDismiss}
      >
        <Pressable style={styles.outer} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 2,
                borderColor: colors.energy,
                padding: spacing.lg,
                ...shadows.lg,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.energySoft ?? colors.accentMuted,
                  borderRadius: radius.full,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              <Ionicons name={config.icon} size={48} color={colors.energy} />
            </View>
            <Text
              style={[typography.h2, { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs }]}
            >
              {config.title}
            </Text>
            <Text
              style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}
            >
              {config.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.cta,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
              onPress={onDismiss}
              activeOpacity={0.85}
            >
              <Text style={[typography.label, { color: colors.textInverse, fontWeight: '700' }]}>Celebrate!</Text>
            </TouchableOpacity>
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
  },
  outer: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
  },
  card: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
