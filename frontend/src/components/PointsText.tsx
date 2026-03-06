import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../theme';

type PointsTextProps = {
  value: number | string;
  style?: TextStyle;
  /** Use energy color for points / workout metrics */
  accent?: boolean;
};

export function PointsText({ value, style, accent = true }: PointsTextProps) {
  const theme = useTheme();
  const { colors, typography } = theme;

  return (
    <Text
      style={[
        {
          fontSize: typography.display.fontSize,
          fontWeight: typography.display.fontWeight,
          lineHeight: typography.display.lineHeight,
          color: accent ? colors.energy : colors.text,
        },
        style,
      ]}
    >
      {typeof value === 'number' ? value.toLocaleString() : value}
    </Text>
  );
}
