/**
 * Typography scale — single source of truth for type styles.
 * Uses DM Sans (loaded in App.tsx). Used by theme to build full typography.
 */

/** DM Sans family names — must match fonts loaded in App.tsx */
export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extraBold: 'DMSans_800ExtraBold',
} as const;

export const typography = {
  hero: {
    fontSize: 34,
    fontFamily: fontFamily.extraBold,
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
  },
  section: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
  },
  body: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
  },
  caption: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: '#64748B',
  },
  metric: {
    fontSize: 32,
    fontFamily: fontFamily.bold,
  },
} as const;

export type TypographyScale = typeof typography;
