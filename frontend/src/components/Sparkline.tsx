import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';

type SparklineProps = {
  /** Last N values (e.g. 7 days), will be normalized to height */
  data: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ data, width = 200, height = 44 }: SparklineProps) {
  const theme = useTheme();
  const { colors } = theme;

  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + chartHeight - ((v - min) / range) * chartHeight;
    return `${x},${y}`;
  });
  const d = `M ${points.join(' L ')}`;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          stroke={colors.energy}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
});
