import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useAppTheme } from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Apply elevation.card shadow. Default true */
  elevated?: boolean;
  /** No inner padding. Default false */
  noPadding?: boolean;
  /** Padding size when not noPadding. Component token default: md */
  paddingSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** When true, use system theme (for auth screens dark mode parity) */
  useSystemTheme?: boolean;
};

/** Component tokens: background card, radius md, padding md, shadow elevation.card */
export function Card({ children, style, elevated = true, noPadding = false, paddingSize = 'md', useSystemTheme = false }: CardProps) {
  const themeFromContext = useTheme();
  const themeFromSystem = useAppTheme();
  const theme = useSystemTheme ? themeFromSystem : themeFromContext;
  const { colors, spacing, radius } = theme;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          padding: noPadding ? 0 : spacing[paddingSize],
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevated && theme.shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
