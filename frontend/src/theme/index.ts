/**
 * Theme public API.
 * Structure: colors (palette) + tokens (shared) + light/dark (themes) + ThemeContext (provider + useTheme).
 */

export { fitnessPalette, lightPalette, darkPalette, colors } from './colors';
export { typography as typographyScale, type TypographyScale } from './typography';
export { spacing as spacingScale, type SpacingScale } from './spacing';
export { radius as radiusScale, type RadiusScale } from './radius';
export { elevation, type ElevationScale } from './elevation';
export { spacing, radius, shadows, animation } from './tokens';
export { lightTheme, type Theme, type ThemeColors } from './light';
export { darkTheme } from './dark';
/** Default theme object (light). Prefer useTheme() for reactive theme. */
export { lightTheme as theme } from './light';
export { ThemeProvider, useTheme, useThemeContext } from './ThemeContext';
export { useAppTheme } from './useAppTheme';
