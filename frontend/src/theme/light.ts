/**
 * Light theme — uses theme/colors.ts palette + aliases for compatibility.
 */

import { spacing, radius, shadows as shadowTokens, animation } from './tokens';
import { lightPalette } from './colors';
import { typography as typeScale } from './typography';

const c = lightPalette;

/** Light theme colors: palette + aliases for existing usage. */
const lightColors = {
  ...c,

  // Aliases
  text: c.textPrimary,
  textMuted: c.textSecondary,
  mutedText: c.textSecondary,
  primaryMuted: c.primarySoft,
  primaryHover: '#1D4ED8',
  textInverse: '#FFFFFF',

  accent: c.energy,
  accentMuted: c.energySoft,
  error: c.danger,
  errorMuted: '#FEE2E2',
  successMuted: c.successSoft,
  warning: c.competition,
  warningMuted: '#FEF3C7',

  surface: c.card,
  statCardBackground: c.card,
  inputBackground: c.card,
  borderLight: '#F1F5F9',

  heroBackground: c.primary,
  heroGradientStart: c.primary,
  heroGradientEnd: '#1D4ED8',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.88)',

  transparent: 'transparent' as const,
  shadowColor: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',

  socialGoogle: '#4285F4',
  socialApple: '#000000',

  goldMuted: '#FEF9C3',
  silverMuted: '#F1F5F9',
  bronzeMuted: '#FFEDD5',

  authGradient: [c.primary, '#1D4ED8', '#1E40AF'] as readonly [string, string, string],
  authLogoGradient: ['#3B82F6', c.primary] as readonly [string, string],
  authOverlayText: '#FFFFFF',
  authOverlayTextMuted: 'rgba(255,255,255,0.95)',
};

export type ThemeColors = typeof lightColors;

const t = typeScale;

/** Typography: theme/typography scale + lineHeights + backward-compat keys (display, h1, h2, h3, bodySmall, label) */
const typography = {
  hero: { ...t.hero, lineHeight: t.hero.fontSize + 8 },
  title: { ...t.title, lineHeight: t.title.fontSize + 6 },
  section: { ...t.section, lineHeight: t.section.fontSize + 6 },
  body: { ...t.body, fontWeight: '400' as const, lineHeight: t.body.fontSize + 8 },
  caption: { ...t.caption, fontWeight: '500' as const, lineHeight: t.caption.fontSize + 4, color: c.textSecondary },
  metric: { ...t.metric, lineHeight: t.metric.fontSize + 6 },
  // Backward compatibility
  display: { ...t.hero, fontWeight: '800' as const, lineHeight: t.hero.fontSize + 8 },
  h1: { ...t.hero, fontWeight: '800' as const, lineHeight: t.hero.fontSize + 8 },
  h2: { ...t.title, lineHeight: t.title.fontSize + 6 },
  h3: { ...t.section, lineHeight: t.section.fontSize + 4 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  label: { fontSize: t.section.fontSize, fontWeight: '600' as const, lineHeight: t.section.fontSize + 6 },
} as const;

/** Shadow presets — cards use subtle elevation to contrast with background */
const shadows = {
  card: { ...shadowTokens.card, shadowColor: lightColors.shadowColor },
  sm: { ...shadowTokens.sm, shadowColor: lightColors.shadowColor },
  md: { ...shadowTokens.md, shadowColor: lightColors.shadowColor },
  lg: { ...shadowTokens.lg, shadowColor: lightColors.shadowColor },
};

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  radius: typeof radius;
  shadows: typeof shadows;
  animation: typeof animation;
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  typography,
  radius,
  shadows,
  animation,
  isDark: false,
};
