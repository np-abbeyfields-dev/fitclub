/**
 * Border radius scale — single source of truth.
 * Fitness tokens: radiusSmall 10, radiusMedium 16, radiusLarge 22.
 */

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,

  radiusSmall: 10,
  radiusMedium: 16,
  radiusLarge: 22,

  xl: 20,
  full: 9999,
} as const;

export type RadiusScale = typeof radius;
