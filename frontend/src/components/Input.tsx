import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import { spacing, radius, typography } from '../theme/tokens';

export type InputProps = TextInputProps & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  /** When true, no border/background (parent controls wrapper style) */
  unstyled?: boolean;
};

export function Input({
  leftIcon,
  rightIcon,
  containerStyle,
  unstyled = false,
  style,
  placeholderTextColor,
  ...props
}: InputProps) {
  const theme = useAppTheme();

  const inputStyle = [
    styles.input,
    unstyled
      ? {
          flex: 1,
          backgroundColor: theme.colors.transparent,
          borderWidth: 0,
          paddingVertical: spacing.xs,
        }
      : {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.border,
          color: theme.colors.textPrimary,
        },
    style,
  ];

  if (leftIcon != null || rightIcon != null) {
    return (
      <View style={[styles.row, { gap: spacing.sm, paddingLeft: leftIcon != null ? spacing.sm : 0 }, containerStyle]} pointerEvents="box-none">
        {leftIcon}
        <TextInput
          {...props}
          placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
          style={inputStyle}
        />
        {rightIcon}
      </View>
    );
  }

  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
      style={inputStyle}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: typography.bodyLarge,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
