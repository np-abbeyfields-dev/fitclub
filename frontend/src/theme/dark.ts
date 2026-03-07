/**
 * Dark theme — uses theme/colors.ts dark palette + aliases.
 */

import { spacing, radius, shadows as shadowTokens, animation } from './tokens';
import type { Theme } from './light';
import { darkPalette } from './colors';
import { typography as typeScale, fontFamily } from './typography';

const c = darkPalette;
const t = typeScale;

/** Dark theme colors: surface layers + accent-only highlights. */
const darkColors = {
  ...c,

  text: c.textPrimary,
  textMuted: c.textSecondary,
  mutedText: c.textSecondary,
  primaryMuted: c.primarySoft,
  primaryHover: '#60A5FA',
  textInverse: '#0B1220',

  accent: c.energy,
  accentMuted: c.energySoft,
  error: c.danger,
  errorMuted: 'rgba(127,29,29,0.5)',
  successMuted: c.successSoft,
  warning: c.competition,
  warningMuted: '#78350F',

  background: '#0B1220',
  surface: '#111827',
  surfaceElevated: '#1F2937',
  card: '#1F2937',
  statCardBackground: '#1F2937',
  inputBackground: '#1F2937',
  border: '#374151',
  borderLight: '#374151',

  heroBackground: '#1E3A8A',
  heroGradientStart: '#1E3A8A',
  heroGradientEnd: '#1E40AF',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.88)',

  /** Darker green for weekly activity / streak in dark mode. */
  successActivity: '#16A34A',

  transparent: 'transparent' as const,
  shadowColor: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',

  socialGoogle: '#4285F4',
  socialApple: '#FFFFFF',

  goldMuted: '#FEF9C3',
  silverMuted: '#374151',
  bronzeMuted: '#78350F',

  /** Onboarding card tints (darker) */
  onboardingCardJoin: '#1E3A5F',
  onboardingCardCompete: '#3D2E1E',
  onboardingCardLog: '#0F2E1A',

  authGradient: ['#0B1220', '#111827', '#1F2937'] as readonly [string, string, string],
  authLogoGradient: ['#3B82F6', '#60A5FA'] as readonly [string, string],
  authOverlayText: '#FFFFFF',
  authOverlayTextMuted: 'rgba(248,250,252,0.9)',
};

/** Typography: same scale as light (theme/typography) + theme caption color */
const typography = {
  hero: { ...t.hero, lineHeight: t.hero.fontSize + 8 },
  title: { ...t.title, lineHeight: t.title.fontSize + 6 },
  section: { ...t.section, lineHeight: t.section.fontSize + 6 },
  body: { ...t.body, fontWeight: '400' as const, lineHeight: t.body.fontSize + 8 },
  caption: { ...t.caption, fontWeight: '500' as const, lineHeight: t.caption.fontSize + 4, color: c.textSecondary },
  metric: { ...t.metric, lineHeight: t.metric.fontSize + 6 },
  display: { ...t.hero, fontWeight: '800' as const, lineHeight: t.hero.fontSize + 8 },
  h1: { ...t.hero, fontWeight: '800' as const, lineHeight: t.hero.fontSize + 8 },
  h2: { ...t.title, lineHeight: t.title.fontSize + 6 },
  h3: { ...t.section, lineHeight: t.section.fontSize + 4 },
  bodySmall: { fontSize: 14, fontFamily: fontFamily.regular, lineHeight: 20 },
  label: { fontSize: t.section.fontSize, fontFamily: fontFamily.semiBold, lineHeight: t.section.fontSize + 6 },
} as const;

/** Shadow presets (shadowColor from theme colors) */
const shadows = {
  card: { ...shadowTokens.card, shadowColor: darkColors.shadowColor },
  sm: { ...shadowTokens.sm, shadowColor: darkColors.shadowColor },
  md: { ...shadowTokens.md, shadowColor: darkColors.shadowColor },
  lg: { ...shadowTokens.lg, shadowColor: darkColors.shadowColor },
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  typography,
  radius,
  shadows,
  animation,
  isDark: true,
};
