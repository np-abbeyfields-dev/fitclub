/**
 * FitClub theme — combines tokens + colors for light/dark.
 */

import { spacing, radius, typography, shadows, animation } from './tokens';
import { lightColors, darkColors, type ThemeColors } from './colors';

export { spacing, radius, typography, shadows, animation };
export type { ThemeColors };

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  animation: typeof animation;
  /** Resolved: true when dark theme is active (for StatusBar, nav theme, etc.) */
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors: lightColors as ThemeColors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors as ThemeColors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
  isDark: true,
};
