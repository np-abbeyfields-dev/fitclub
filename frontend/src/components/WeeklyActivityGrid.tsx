import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme';

export type WeeklyDay = {
  date: string;
  workoutCount?: number;
  points?: number;
};

export type WeeklyActivityGridOverrides = {
  backgroundColor?: string;
  labelColor?: string;
  activeColor?: string;
  cellBorderRadius?: number;
  gap?: number;
};

type WeeklyActivityGridProps = {
  data: WeeklyDay[];
  maxWorkouts?: number;
  currentStreak?: number;
  /** Animate bar fill when mounting */
  animate?: boolean;
  /** Optional style overrides (avoids Hermes optional-prop access issues) */
  overrides?: WeeklyActivityGridOverrides;
};

/** Day cell size — kept small to avoid label overlap on narrow screens */
const BOX_SIZE = 36;

/**
 * Weekly activity: compact row of squares (S M T W T F S), success for active/streak days.
 * Optional opacity animation on load.
 */
export function WeeklyActivityGrid(props: WeeklyActivityGridProps) {
  const { data, currentStreak = 0, animate = true } = props;
  const theme = useTheme();
  const { colors, spacing: s, radius: r, typography } = theme;
  const o = props.overrides;
  const containerBg = o?.backgroundColor ?? colors.card;
  const labelColorResolved = o?.labelColor ?? colors.textSecondary;
  const activeDayColor = o?.activeColor ?? colors.energy;
  const cellRadius = o?.cellBorderRadius ?? r.sm;
  const squareGap = o?.gap ?? s.xxs;
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
          backgroundColor: containerBg,
          borderWidth: o != null ? 0 : 1,
          borderColor: colors.border,
          borderRadius: r.md,
          paddingVertical: s.xs,
          paddingHorizontal: s.sm,
          ...(o != null ? {} : theme.shadows.card),
        },
      ]}
    >
      <View style={[styles.squaresRow, { flexDirection: 'row', alignItems: 'center', gap: squareGap }]}>
        {data.map((day, index) => {
          const count = day.workoutCount ?? 0;
          const hasWorkouts = count > 0;
          const isInStreak =
            hasWorkouts && currentStreak > 0 && 6 - index < currentStreak;

          const bgColor = hasWorkouts
            ? isInStreak
              ? (colors.successActivity ?? colors.success)
              : activeDayColor
            : colors.chartInactive;
          const borderWidth = isInStreak ? 2 : 0;

          const cellContent = (
            <View
              style={[
                styles.cell,
                {
                  width: BOX_SIZE,
                  height: BOX_SIZE,
                  borderRadius: cellRadius,
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
                      fontSize: 11,
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
            <View key={day.date} style={[styles.cellWrap, { flex: 1, alignItems: 'center', minWidth: 0 }]}>
              <View style={{ width: BOX_SIZE, height: BOX_SIZE }}>
                {cellContent}
                {animate && animValues[index] != null ? (
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: containerBg, opacity: animValues[index] },
                    ]}
                    pointerEvents="none"
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={[styles.labels, { flexDirection: 'row', marginTop: s.xs }]}>
        {data.map((day) => (
          <View key={day.date} style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: labelColorResolved, fontWeight: '600', fontSize: 10 }]}
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
