/**
 * Semantic color system — single source of truth.
 * Use via theme (useTheme().colors); light/dark themes extend these with aliases.
 *
 * Fitness palette: premium Strava/Nike Run Club style (global design theme).
 */

/** Premium fitness palette — dark, high-contrast with orange primary. */
export const fitnessPalette = {
  backgroundPrimary: '#0F172A',
  backgroundSecondary: '#111827',

  cardBackground: '#1E293B',
  cardElevated: '#334155',

  primary: '#FF6B35',
  primarySoft: '#FB923C',

  accent: '#2DD4BF',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  border: '#334155',

  progressPrimary: '#FF6B35',
  progressRemaining: '#334155',
} as const;

export const lightPalette = {
  primary: '#2563EB',
  primarySoft: '#EFF6FF',

  energy: '#F97316',
  energySoft: '#FFF7ED',

  success: '#22C55E',
  successSoft: '#ECFDF5',

  competition: '#F59E0B',

  background: '#F8FAFC',
  card: '#FFFFFF',

  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',

  danger: '#EF4444',

  /** Fitness token names (light values) for consistent Theme shape */
  backgroundPrimary: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  cardBackground: '#FFFFFF',
  cardElevated: '#FFFFFF',
  accent: '#F97316',
  warning: '#F59E0B',
  textMuted: '#64748B',
  progressPrimary: '#2563EB',
  progressRemaining: '#E2E8F0',

  /** Chart inactive bar / track (charts use energy for active) */
  chartInactive: '#CBD5F5',

  /** Podium / leaderboard medals */
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

export const darkPalette = {
  ...fitnessPalette,
  // Legacy keys for backward compatibility
  background: fitnessPalette.backgroundPrimary,
  card: fitnessPalette.cardBackground,
  energy: fitnessPalette.primary,
  energySoft: fitnessPalette.primarySoft,
  successSoft: '#14532D',
  competition: fitnessPalette.warning,
  chartInactive: '#475569',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

/** Re-export for direct use (e.g. non-themed code). Prefer theme.colors in UI. */
export const colors = fitnessPalette;
