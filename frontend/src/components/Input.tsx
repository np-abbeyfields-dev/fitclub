import React from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type InputProps = TextInputProps & {
  containerStyle?: ViewStyle;
};

export function Input({ containerStyle, style, placeholderTextColor, ...props }: InputProps) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? colors.textMuted}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          fontSize: typography.body.fontSize,
          color: colors.text,
        },
        style,
      ]}
      {...props}
    />
  );
}
