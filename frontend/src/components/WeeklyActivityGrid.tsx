import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme';

export type WeeklyDay = {
  date: string;
  workoutCount?: number;
  points?: number;
};

type WeeklyActivityGridProps = {
  data: WeeklyDay[];
  maxWorkouts?: number;
  currentStreak?: number;
  /** Animate bar fill when mounting */
  animate?: boolean;
};

/** Compact square size (50–60px) for each day cell */
const BOX_SIZE = 52;

/**
 * Weekly activity: compact row of squares (S M T W T F S), success for active/streak days.
 * Optional opacity animation on load.
 */
export function WeeklyActivityGrid({
  data,
  maxWorkouts: _maxWorkoutsProp,
  currentStreak = 0,
  animate = true,
}: WeeklyActivityGridProps) {
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography } = theme;
  const animValues = useRef(data.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (!animate || animValues.length !== data.length) return;
    Animated.stagger(
      40,
      data.map((_, i) =>
        Animated.timing(animValues[i] ?? new Animated.Value(1), {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [data.length, animate]);

  function shortDay(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    } catch {
      return '';
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: r.md,
          paddingVertical: s.xs,
          paddingHorizontal: s.sm,
          ...theme.shadows.card,
        },
      ]}
    >
      <View style={[styles.squaresRow, { flexDirection: 'row', alignItems: 'center', gap: s.xxs }]}>
        {data.map((day, index) => {
          const count = day.workoutCount ?? 0;
          const hasWorkouts = count > 0;
          const isInStreak =
            hasWorkouts && currentStreak > 0 && 6 - index < currentStreak;

          const bgColor = hasWorkouts
            ? isInStreak
              ? (colors.successActivity ?? colors.success)
              : colors.energy
            : colors.chartInactive;
          const borderWidth = isInStreak ? 2 : 0;

          const cellContent = (
            <View
              style={[
                styles.cell,
                {
                  width: BOX_SIZE,
                  height: BOX_SIZE,
                  borderRadius: r.sm,
                  backgroundColor: bgColor,
                  borderWidth,
                  borderColor: colors.successActivity ?? colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              {hasWorkouts && (
                <Text
                  style={[
                    typography.caption,
                    {
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.textInverse,
                    },
                  ]}
                >
                  {count}
                </Text>
              )}
            </View>
          );

          return (
            <View key={day.date} style={[styles.cellWrap, { flex: 1, alignItems: 'center' }]}>
              <View style={{ width: BOX_SIZE, height: BOX_SIZE }}>
                {cellContent}
                {animate && animValues[index] != null ? (
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: colors.card, opacity: animValues[index] },
                    ]}
                    pointerEvents="none"
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={[styles.labels, { flexDirection: 'row', marginTop: s.xxs }]}>
        {data.map((day) => (
          <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, fontWeight: '600', fontSize: 11 },
              ]}
            >
              {shortDay(day.date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  squaresRow: {},
  cellWrap: {},
  cell: {},
  labels: {},
});
