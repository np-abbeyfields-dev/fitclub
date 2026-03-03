import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Rank = 1 | 2 | 3;

type LeaderboardRankProps = {
  rank: Rank;
  label?: string;
};

const rankConfig: Record<Rank, { bg: 'goldMuted' | 'silverMuted' | 'bronzeMuted'; label?: string }> = {
  1: { bg: 'goldMuted', label: 'Gold' },
  2: { bg: 'silverMuted', label: 'Silver' },
  3: { bg: 'bronzeMuted', label: 'Bronze' },
};

export function LeaderboardRank({ rank, label }: LeaderboardRankProps) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const config = rankConfig[rank];
  const bgColor = colors[config.bg];
  const textColor = rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm, alignSelf: 'flex-start' }]}>
      <Text style={[styles.text, { ...typography.caption, fontWeight: '700', color: textColor }]}>{label ?? config.label ?? rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {},
  text: {},
});
