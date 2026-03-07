import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export type RoundCountdownProps = {
  /** Days until round end (0 = today, negative = ended). */
  daysLeft: number;
  /** Optional end date (ISO string) for "Ends [date]" sublabel. */
  endDate?: string | null;
  /** Compact (single line), pill (badge), hero (for use on primary/dark banner), or default. */
  variant?: 'default' | 'compact' | 'pill' | 'hero';
};

function formatEndDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function formatCountdown(daysLeft: number): string {
  if (daysLeft < 0) return 'Round ended';
  if (daysLeft === 0) return 'Ends today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

export function RoundCountdown({ daysLeft, endDate, variant = 'default' }: RoundCountdownProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography } = theme;
  const text = formatCountdown(daysLeft);
  const endDateStr = formatEndDate(endDate);
  const isEnded = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 1;
  const isHero = variant === 'hero';
  const textColor = isHero ? (isEnded ? colors.heroTextMuted : colors.textInverse) : (isEnded ? colors.textMuted : isUrgent ? colors.danger : colors.primary);
  const iconColor = isHero ? colors.heroTextMuted : (isEnded ? colors.textMuted : isUrgent ? colors.danger : colors.primary);

  if (variant === 'hero') {
    return (
      <View style={[styles.default, { marginBottom: s.xxs }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xxs }}>
          <Ionicons name={isEnded ? 'checkmark-circle' : 'time'} size={16} color={iconColor} />
          <Text style={[typography.bodySmall, { fontWeight: '700', color: textColor }]}>{text}</Text>
        </View>
        {endDateStr && !isEnded && (
          <Text style={[typography.caption, { color: colors.heroTextMuted, marginTop: 2, fontWeight: '500', opacity: 0.9 }]}>
            Ends {endDateStr}
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'pill') {
    return (
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isEnded ? colors.chartInactive : isUrgent ? colors.errorMuted : colors.primaryMuted,
            paddingHorizontal: s.sm,
            paddingVertical: s.xxs,
            borderRadius: r.full,
          },
        ]}
      >
        <Ionicons name={isEnded ? 'checkmark-circle' : 'time'} size={14} color={textColor} style={{ marginRight: s.xxs }} />
        <Text style={[typography.caption, { fontWeight: '700', color: textColor }]}>
          {text}
        </Text>
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <Text style={[typography.caption, { fontWeight: '700', color: colors.textSecondary }]}>
        {text}
        {endDateStr ? ` · Ends ${endDateStr}` : ''}
      </Text>
    );
  }

  return (
    <View style={styles.default}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xxs }}>
        <Ionicons name={isEnded ? 'checkmark-circle' : 'time'} size={16} color={iconColor} />
        <Text style={[typography.bodySmall, { fontWeight: '700', color: textColor }]}>{text}</Text>
      </View>
      {endDateStr && !isEnded && (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, fontWeight: '500' }]}>
          Ends {endDateStr}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {},
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  compact: {},
});
