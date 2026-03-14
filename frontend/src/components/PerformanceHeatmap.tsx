import React from 'react';
import { View, StyleSheet } from 'react-native';

const COLS = 7;
const DAYS_COUNT = 30;
const CELL_SIZE = 12;
const GAP = 3;

/** Color rules: 0 pts, 1–2, 3–5, 6+ */
const LIGHT_COLORS = {
  zero: '#E5E7EB',
  low: '#FDBA74',
  mid: '#FB923C',
  high: '#EA580C',
} as const;

const DARK_COLORS = {
  zero: '#1E293B',
  low: '#FB923C',
  mid: '#F97316',
  high: '#EA580C',
} as const;

function getColorForPoints(points: number, isDark: boolean): string {
  const c = isDark ? DARK_COLORS : LIGHT_COLORS;
  if (points <= 0) return c.zero;
  if (points <= 2) return c.low;
  if (points <= 5) return c.mid;
  return c.high;
}

function getLast30DateKeys(): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = DAYS_COUNT - 1; i >= 0; i--) {
    const day = new Date(d);
    day.setDate(day.getDate() - i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${dayNum}`);
  }
  return keys;
}

export type PerformanceHeatmapProps = {
  /** Points per day, keyed by date YYYY-MM-DD */
  pointsByDate: Record<string, number>;
  isDark: boolean;
  /** Optional cell size (default 12) */
  cellSize?: number;
  /** Optional gap between cells (default 3) */
  gap?: number;
};

/**
 * Performance heatmap: 30 days in a 7-column grid. Each square = one day;
 * color intensity = points earned that day.
 */
export function PerformanceHeatmap({
  pointsByDate,
  isDark,
  cellSize = CELL_SIZE,
  gap = GAP,
}: PerformanceHeatmapProps) {
  const dateKeys = React.useMemo(() => getLast30DateKeys(), []);
  const rows: string[][] = [];
  for (let r = 0; r < Math.ceil(DAYS_COUNT / COLS); r++) {
    rows.push(dateKeys.slice(r * COLS, (r + 1) * COLS));
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.grid, { gap }]}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.row, { gap }]}>
            {row.map((dateKey) => {
              const points = pointsByDate[dateKey] ?? 0;
              const color = getColorForPoints(points, isDark);
              return (
                <View
                  key={dateKey}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 2,
                      backgroundColor: color,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  grid: {},
  row: { flexDirection: 'row' },
  cell: {},
});
