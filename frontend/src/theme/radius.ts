/**
 * Border radius scale — single source of truth.
 */

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export type RadiusScale = typeof radius;
