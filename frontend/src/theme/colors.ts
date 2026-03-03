/**
 * FitClub color palette — primary (electric purple), accent (lime), leaderboard (gold/silver/bronze).
 * Light and dark theme values. Dark mode is designed intentionally (not inverted):
 * - Contrast tuned for accessibility (text on background/surface).
 * - Leaderboard medals (gold/silver/bronze) stay vivid on dark surfaces.
 */

export const lightColors = {
  // Primary — electric purple
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  primaryMuted: '#EEF2FF',
  // Accent — lime green (points, success)
  accent: '#84CC16',
  accentMuted: '#ECFCCB',
  // Leaderboard — distinct medal colors
  gold: '#EAB308',
  silver: '#94A3B8',
  bronze: '#B45309',
  goldMuted: '#FEF9C3',
  silverMuted: '#F1F5F9',
  bronzeMuted: '#FFEDD5',
  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  // Text (contrast-safe on surfaces)
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  // Borders & dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  // States
  error: '#DC2626',
  errorMuted: '#FEE2E2',
  success: '#16A34A',
  successMuted: '#DCFCE7',
  warning: '#D97706',
} as const;

/** Dark theme: slate/indigo base; medals and accent stay high-contrast and visible. */
export const darkColors = {
  primary: '#818CF8',
  primaryHover: '#A5B4FC',
  primaryMuted: '#312E81',
  accent: '#A3E635',
  accentMuted: '#365314',
  // Leaderboard — bright enough on dark surface (#1E293B) and muted badges
  gold: '#FACC15',
  silver: '#E2E8F0',
  bronze: '#F59E0B',
  goldMuted: '#422006',
  silverMuted: '#334155',
  bronzeMuted: '#431407',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  border: '#334155',
  borderLight: '#1E293B',
  error: '#F87171',
  errorMuted: '#7F1D1D',
  success: '#4ADE80',
  successMuted: '#14532D',
  warning: '#FBBF24',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};
