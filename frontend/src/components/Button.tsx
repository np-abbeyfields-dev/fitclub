import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, Platform } from 'react-native';
import { useAppTheme } from '../theme';
import { typography } from '../theme/tokens';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  /** Override label (and loading indicator) color, e.g. for Apple button (black in light mode) */
  titleColor?: string;
};

/** Component tokens: primary = background primary, text white, radius lg, padding md; secondary = border primary, text primary, background transparent */
export function Button({
  title,
  onPress,
  variant = 'primary',
  fullWidth,
  loading = false,
  disabled = false,
  icon,
  style,
  titleColor: titleColorProp,
}: ButtonProps) {
  const theme = useAppTheme();
  const { colors, radius, spacing } = theme;
  const isOutline = variant === 'outline';
  const isDisabled = disabled || loading;
  const defaultTextColor = isOutline ? colors.primary : colors.textInverse;
  const textColor = titleColorProp ?? defaultTextColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
        style={[
        styles.button,
        {
          backgroundColor: isOutline ? colors.transparent : colors.primary,
          borderWidth: isOutline ? 1 : 0,
          borderColor: isOutline ? colors.primary : undefined,
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.6 : 1,
          gap: spacing.sm,
          // On Android, elevation + transparent background draws a white surface; skip elevation for outline.
          ...(Platform.OS === 'ios'
            ? theme.shadows.sm
            : isOutline
              ? { elevation: 0 }
              : { elevation: 2 }),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    fontSize: typography.bodyLarge,
    fontWeight: '600',
  },
});
