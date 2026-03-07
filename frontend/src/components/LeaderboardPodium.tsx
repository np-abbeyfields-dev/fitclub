import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import type { LeaderboardEntry } from '../types/leaderboard';
import { RANK_MEDAL } from '../constants/rank';

/** Card min heights so #1 feels larger; content defines actual height. */
const CARD_MIN_HEIGHTS = { 1: 100, 2: 88, 3: 88 } as const;

type LeaderboardPodiumProps = {
  top3: LeaderboardEntry[];
  firstPlacePoints: number;
  getGapLabel?: (entry: LeaderboardEntry) => string | null;
};

/**
 * Podium: top 3 as cards with medal in header, name, points (orange).
 * #1 center card slightly larger, no gold border, stronger shadow.
 */
export function LeaderboardPodium({
  top3,
  firstPlacePoints,
  getGapLabel,
}: LeaderboardPodiumProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;

  const accent = (rank: 1 | 2 | 3) =>
    rank === 1 ? colors.gold : rank === 2 ? colors.silver : colors.bronze;

  const ordered = [
    top3.find((e) => e.rank === 2),
    top3.find((e) => e.rank === 1),
    top3.find((e) => e.rank === 3),
  ].filter(Boolean) as LeaderboardEntry[];

  if (ordered.length === 0) return null;

  return (
    <View
      style={[
        styles.row,
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          marginBottom: s.md,
          gap: s.md,
        },
      ]}
    >
      {ordered.map((entry) => {
        const rank = entry.rank as 1 | 2 | 3;
        const gapLabel = getGapLabel?.(entry) ?? null;
        const isFirst = rank === 1;

        return (
          <View
            key={entry.id}
            style={[
              styles.slot,
              {
                flex: isFirst ? 1.15 : 1,
                minWidth: 0,
                alignItems: 'center',
              },
            ]}
          >
            <View
              style={[
                styles.block,
                {
                  flex: 1,
                  minHeight: CARD_MIN_HEIGHTS[rank],
                  width: '100%',
                  backgroundColor: colors.card,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: s.sm,
                  paddingHorizontal: s.sm,
                  ...(isFirst ? shadows.md : shadows.card),
                },
              ]}
            >
              <View style={[styles.headerRow, { flexDirection: 'row', alignItems: 'center', gap: s.xxs, marginBottom: s.xs }]}>
                <Text style={[typography.section, { color: accent(rank), fontWeight: '800' }]}>
                  {RANK_MEDAL[rank]}
                </Text>
                <Text style={[typography.section, { color: colors.textPrimary, fontWeight: '800' }]}>
                  #{rank}
                </Text>
                {entry.rankChange != null && entry.rankChange !== 0 && (
                  <Text
                    style={[
                      typography.caption,
                      {
                        fontSize: 10,
                        fontWeight: '800',
                        color: entry.rankChange > 0 ? colors.success : colors.danger,
                      },
                    ]}
                  >
                    {entry.rankChange > 0 ? `▲${entry.rankChange}` : `▼${Math.abs(entry.rankChange)}`}
                  </Text>
                )}
              </View>
              <Text
                style={[typography.label, { color: colors.textPrimary, fontWeight: '700' }]}
                numberOfLines={2}
              >
                {entry.name}
              </Text>
              <Text style={[typography.label, { color: colors.energy, fontWeight: '800', marginTop: s.xxs }]}>
                {entry.points.toLocaleString()} pts
              </Text>
              {gapLabel ? (
                <Text
                  style={[typography.caption, { color: colors.textSecondary, marginTop: s.xxs, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {gapLabel}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {},
  slot: {},
  block: {},
  headerRow: {},
});
