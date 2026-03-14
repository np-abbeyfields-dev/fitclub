/**
 * Design tokens — typography scale, shadows.
 * Spacing and radius from theme/spacing.ts and theme/radius.ts; card shadow from theme/elevation.ts.
 */

import { spacing as spacingScale } from './spacing';
import { radius as radiusScale } from './radius';
import { elevation } from './elevation';

/** Spacing: theme/spacing + legacy keys (xxs, xxl, xxxl) for backward compatibility */
export const spacing = {
  ...spacingScale,
  xxs: 4,
  xxl: 48,
  xxxl: 64,
};

/** Radius: theme/radius (includes xl, full) */
export const radius = {
  ...radiusScale,
};

export const typography = {
  displayLarge: 32,
  displayMedium: 28,
  headingLarge: 24,
  headingMedium: 20,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
};

/** Shadows: card from theme/elevation; theme (light/dark) overlays shadowColor. */
export const shadows = {
  card: { ...elevation.card },
  sm: {
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export const animation = { duration: 200, durationSlow: 300 } as const;
