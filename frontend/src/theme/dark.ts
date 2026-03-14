/**
 * Dark theme — fitness palette (Strava/Nike Run Club style) + aliases.
 */

import { spacing, radius, shadows as shadowTokens, animation } from './tokens';
import type { Theme } from './light';
import { darkPalette } from './colors';
import { typography as typeScale, fontFamily } from './typography';

const c = darkPalette;
const t = typeScale;

/** Dark theme colors: fitness tokens + aliases for existing usage. */
const darkColors = {
  ...c,

  text: c.textPrimary,
  textMuted: c.textSecondary,
  mutedText: c.textMuted,
  primaryMuted: c.primarySoft,
  primaryHover: c.primarySoft,
  textInverse: c.backgroundPrimary,

  accent: c.primary,
  accentMuted: c.primarySoft,
  energy: c.primary,
  energySoft: c.primarySoft,
  error: c.danger,
  errorMuted: 'rgba(127,29,29,0.5)',
  successMuted: '#14532D',
  warning: c.warning,
  warningMuted: '#78350F',

  background: c.backgroundPrimary,
  surface: c.cardBackground,
  surfaceElevated: c.cardElevated,
  card: c.cardBackground,
  statCardBackground: c.cardBackground,
  inputBackground: c.cardBackground,
  borderLight: c.border,

  heroBackground: c.primary,
  heroGradientStart: c.backgroundPrimary,
  heroGradientEnd: c.cardElevated,
  heroText: c.textPrimary,
  heroTextMuted: 'rgba(248,250,252,0.88)',

  successActivity: c.success,

  transparent: 'transparent' as const,
  shadowColor: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',

  socialGoogle: '#4285F4',
  socialApple: '#FFFFFF',

  goldMuted: '#FEF9C3',
  silverMuted: c.cardElevated,
  bronzeMuted: '#78350F',

  onboardingCardJoin: '#1E3A5F',
  onboardingCardCompete: '#3D2E1E',
  onboardingCardLog: '#0F2E1A',

  authGradient: [c.backgroundPrimary, c.backgroundSecondary, c.cardBackground] as readonly [string, string, string],
  authLogoGradient: [c.primary, c.primarySoft] as readonly [string, string],
  authOverlayText: c.textPrimary,
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
