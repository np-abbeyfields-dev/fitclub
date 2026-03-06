import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type MetricCardProps = {
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Metric card: large metric value + caption.
 * Uses typography.metric and typography.caption.
 */
export function MetricCard({ value, label, style }: MetricCardProps) {
  const theme = useTheme();
  const { colors, typography, spacing, radius } = theme;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          padding: spacing.md,
          ...theme.shadows.card,
        },
        style,
      ]}
    >
      <Text style={[typography.metric, { color: colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
});
