/**
 * Semantic color system — single source of truth.
 * Use via theme (useTheme().colors); light/dark themes extend these with aliases.
 */

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

  /** Chart inactive bar / track (charts use energy for active) */
  chartInactive: '#CBD5F5',

  /** Podium / leaderboard */
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#B45309',
} as const;

export const darkPalette = {
  primary: '#3B82F6',
  primarySoft: '#1E3A8A',

  energy: '#FB923C',
  energySoft: '#431407',

  success: '#22C55E',
  successSoft: '#14532D',

  competition: '#FBBF24',

  background: '#0B1220',
  card: '#1F2937',

  border: '#374151',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',

  danger: '#EF4444',

  chartInactive: '#475569',

  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#B45309',
} as const;

/** Re-export for direct use (e.g. non-themed code). Prefer theme.colors in UI. */
export const colors = lightPalette;
