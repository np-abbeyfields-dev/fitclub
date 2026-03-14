/**
 * Spacing scale — single source of truth.
 * Fitness tokens: spacingSmall 8, spacingMedium 16, spacingLarge 24, spacingXL 32.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,

  spacingSmall: 8,
  spacingMedium: 16,
  spacingLarge: 24,
  spacingXL: 32,
} as const;

export type SpacingScale = typeof spacing;
