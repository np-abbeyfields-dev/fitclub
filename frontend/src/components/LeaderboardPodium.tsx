import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import type { LeaderboardEntry } from '../types/leaderboard';
import { RANK_MEDAL } from '../constants/rank';

/** Card min heights: #1 larger for competition visibility. */
const CARD_MIN_HEIGHTS = { 1: 120, 2: 88, 3: 88 } as const;

export type LeaderboardPodiumOverrides = {
  cardBackground?: string;
  textPrimary?: string;
  textSecondary?: string;
  accent?: string;
  gold?: string;
  silver?: string;
  bronze?: string;
  /** Scale factor for #1 card (e.g. 1.2 = 20% larger). */
  firstCardScale?: number;
};

type LeaderboardPodiumProps = {
  top3: LeaderboardEntry[];
  firstPlacePoints: number;
  getGapLabel?: (entry: LeaderboardEntry) => string | null;
  overrides?: LeaderboardPodiumOverrides;
  /** When set, podium cards are pressable (e.g. navigate to team detail). */
  onPressEntry?: (entry: LeaderboardEntry) => void;
};

/**
 * Podium: top 3 as cards with medal, name, points. #1 card is visually larger.
 * Optional overrides for leaderboard-specific colors (dark/light competition theme).
 */
export function LeaderboardPodium({
  top3,
  firstPlacePoints,
  getGapLabel,
  overrides,
  onPressEntry,
}: LeaderboardPodiumProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography, shadows } = theme;

  const cardBg = overrides?.cardBackground ?? colors.card;
  const textPri = overrides?.textPrimary ?? colors.text;
  const textSec = overrides?.textSecondary ?? colors.textSecondary;
  const accent = overrides?.accent ?? colors.energy;
  const medal = (rank: 1 | 2 | 3) =>
    rank === 1 ? (overrides?.gold ?? colors.gold ?? '#FACC15')
      : rank === 2 ? (overrides?.silver ?? colors.silver ?? '#94A3B8')
      : (overrides?.bronze ?? colors.bronze ?? '#B45309');
  const firstScale = overrides?.firstCardScale ?? 1.15;

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
          alignItems: 'flex-end',
          justifyContent: 'center',
          marginBottom: s.md,
          gap: s.sm,
        },
      ]}
    >
      {ordered.map((entry) => {
        const rank = entry.rank as 1 | 2 | 3;
        const gapLabel = getGapLabel?.(entry) ?? null;
        const isFirst = rank === 1;
        const blockStyle = [
          styles.block,
          {
            flex: 1,
            minHeight: CARD_MIN_HEIGHTS[rank],
            width: '100%',
            backgroundColor: cardBg,
            borderRadius: r.md,
            borderWidth: 1,
            borderColor: textSec,
            borderLeftWidth: 4,
            borderLeftColor: medal(rank),
            paddingVertical: isFirst ? s.md : s.sm,
            paddingHorizontal: s.sm,
            ...(isFirst ? shadows.md : shadows.card),
          },
        ];

        const cardContent = (
          <>
            <View style={[styles.headerRow, { flexDirection: 'row', alignItems: 'center', gap: s.xxs, marginBottom: s.xs }]}>
              <Text style={{ fontSize: 18 }}>{RANK_MEDAL[rank]}</Text>
              <Text style={[typography.caption, { color: textPri, fontWeight: '800' }]}>
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
              style={[
                typography.bodySmall,
                { color: textPri, fontWeight: '700', lineHeight: 18, fontSize: isFirst ? 15 : 14 },
              ]}
              numberOfLines={2}
            >
              {entry.name}
            </Text>
            <Text style={[typography.caption, { color: accent, fontWeight: '800', marginTop: s.xxs, fontSize: isFirst ? 14 : 12 }]}>
              {entry.points.toLocaleString()} pts
            </Text>
            {gapLabel ? (
              <Text
                style={[typography.caption, { color: textSec, marginTop: s.xxs, fontWeight: '600', fontSize: 11 }]}
                numberOfLines={1}
              >
                {gapLabel}
              </Text>
            ) : null}
          </>
        );

        return (
          <View
            key={entry.id}
            style={[
              styles.slot,
              {
                flex: isFirst ? firstScale : 1,
                minWidth: 0,
                alignItems: 'center',
              },
            ]}
          >
            {onPressEntry ? (
              <TouchableOpacity style={blockStyle} onPress={() => onPressEntry(entry)} activeOpacity={0.8}>
                {cardContent}
              </TouchableOpacity>
            ) : (
              <View style={blockStyle}>
                {cardContent}
              </View>
            )}
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
