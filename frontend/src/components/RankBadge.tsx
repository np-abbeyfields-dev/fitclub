import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { RANK_MEDAL } from '../constants/rank';

type RankBadgeProps = {
  rank: number;
  /** Optional label above rank, e.g. "Team Rank" */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Celebratory rank display: trophy/medal icon + #1 / #2 / #3 with gold/silver/bronze accent.
 */
export function RankBadge({ rank, label = 'Team Rank', style }: RankBadgeProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, isDark } = theme;

  const isTop3 = rank >= 1 && rank <= 3;
  const accentColor = isTop3
    ? (rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze)
    : colors.competition;
  const medal = isTop3 ? RANK_MEDAL[rank as 1 | 2 | 3] : null;
  const borderColor = isDark ? colors.border : (isTop3 ? accentColor : colors.border);
  const leftBorderColor = isDark ? colors.border : accentColor;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderRadius: r.md,
          paddingVertical: s.sm,
          paddingHorizontal: s.md,
          borderWidth: 1,
          borderColor,
          borderLeftWidth: 4,
          borderLeftColor: leftBorderColor,
        },
        theme.shadows.card,
        style,
      ]}
    >
      <View style={[styles.labelRow, { flexDirection: 'row', alignItems: 'center', gap: s.xs }]}>
        <Ionicons name="trophy" size={18} color={accentColor} />
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
          {label}
        </Text>
      </View>
      <View style={[styles.rankRow, { flexDirection: 'row', alignItems: 'baseline', gap: s.xs, marginTop: s.xxs }]}>
        {medal ? <Text style={styles.medal}>{medal}</Text> : null}
        <Text style={[typography.hero, { color: accentColor, fontWeight: '800', fontSize: 28 }]}>
          #{rank}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  labelRow: {},
  rankRow: {},
  medal: { fontSize: 24 },
});
