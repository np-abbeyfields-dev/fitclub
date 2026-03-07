import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type MetricCardProps = {
  value: string | number;
  label: string;
  /** Semantic accent: energy (workouts), primary (calories), success (streak). */
  accent?: 'energy' | 'primary' | 'success' | 'competition' | 'neutral';
  /** Icon name for watermark (e.g. fitness, flash, flame). */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/**
 * Metric card: large metric value + caption. Optional background icon watermark and accent color.
 */
export function MetricCard({
  value,
  label,
  accent = 'neutral',
  icon,
  style,
}: MetricCardProps) {
  const theme = useTheme();
  const { colors, typography, spacing, radius } = theme;

  const accentColor =
    accent === 'energy'
      ? colors.energy
      : accent === 'primary'
        ? colors.primary
        : accent === 'success'
          ? colors.success
          : accent === 'competition'
            ? colors.competition
            : colors.textPrimary;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          padding: spacing.sm,
          paddingHorizontal: spacing.xs,
          ...theme.shadows.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.watermark, { position: 'absolute', right: -4, bottom: -4 }]}>
          <Ionicons name={icon} size={44} color={accentColor} style={{ opacity: 0.12 }} />
        </View>
      ) : null}
      <Text style={[typography.metric, { color: accentColor, fontSize: 28 }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 0, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  watermark: {},
});
