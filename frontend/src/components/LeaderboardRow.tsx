import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { shadows } from '../theme/tokens';
import type { LeaderboardEntry } from '../types/leaderboard';

const RANK_MEDAL: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

type LeaderboardRowProps = {
  item: LeaderboardEntry;
};

export function LeaderboardRow({ item }: LeaderboardRowProps) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const isTop3 = item.rank >= 1 && item.rank <= 3;
  const progress = item.maxPoints > 0 ? Math.min(1, item.points / item.maxPoints) : 0;

  const initial = item.name.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: item.isCurrentUser ? colors.primaryMuted : colors.surface,
          borderRadius: radius.lg,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: item.isCurrentUser ? colors.primary : colors.border,
          marginBottom: spacing.sm,
          ...(isTop3 ? shadows.md : shadows.sm),
        },
      ]}
    >
      <View style={[styles.rankCol, { width: 40 }]}>
        {isTop3 ? (
          <Text style={styles.medal}>{RANK_MEDAL[item.rank as 1 | 2 | 3]}</Text>
        ) : (
          <Text style={[styles.rankNum, { ...typography.bodySmall, fontWeight: '700', color: colors.textSecondary }]}>
            #{item.rank}
          </Text>
        )}
      </View>

      <View style={[styles.avatar, { backgroundColor: item.isCurrentUser ? colors.primary : colors.borderLight, borderRadius: radius.full, marginRight: spacing.sm }]}>
        <Text
          style={[
            styles.avatarText,
            { ...typography.h3, color: item.isCurrentUser ? colors.textInverse : colors.textSecondary },
          ]}
        >
          {initial}
        </Text>
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.name,
            { ...typography.body, fontWeight: item.isCurrentUser ? '700' : '600', color: colors.text, marginBottom: spacing.xs },
          ]}
          numberOfLines={1}
        >
          {item.name}
          {item.isCurrentUser && ' (You)'}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight, borderRadius: radius.sm }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                borderRadius: radius.sm,
                backgroundColor:
                  item.rank === 1
                    ? colors.gold
                    : item.rank === 2
                      ? colors.silver
                      : item.rank === 3
                        ? colors.bronze
                        : colors.accent,
              },
            ]}
          />
        </View>
      </View>

      <Text
        style={[
          styles.points,
          { ...typography.body, fontWeight: '800', color: isTop3 ? (item.rank === 1 ? colors.gold : item.rank === 2 ? colors.silver : colors.bronze) : colors.text, marginLeft: spacing.sm },
        ]}
      >
        {item.points.toLocaleString()}
      </Text>
    </View>
  );
}

const AVATAR_SIZE = 44;
const PROGRESS_HEIGHT = 6;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medal: { fontSize: 24 },
  rankNum: {},
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {},
  body: { flex: 1, minWidth: 0 },
  name: {},
  progressTrack: {
    height: PROGRESS_HEIGHT,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  points: {},
});
