/**
 * Typography scale — single source of truth for type styles.
 * Uses DM Sans (loaded in App.tsx). Fitness tokens: fontTitle 28, fontSection 18, fontBody 16, fontCaption 13.
 */

/** DM Sans family names — must match fonts loaded in App.tsx */
export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extraBold: 'DMSans_800ExtraBold',
} as const;

/** Fitness typography tokens */
export const fontTitle = 28;
export const fontSection = 18;
export const fontBody = 16;
export const fontCaption = 13;

export const fontWeightRegular = '400' as const;
export const fontWeightMedium = '600' as const;
export const fontWeightBold = '700' as const;

export const typography = {
  hero: {
    fontSize: 34,
    fontFamily: fontFamily.extraBold,
  },
  title: {
    fontSize: fontTitle,
    fontFamily: fontFamily.bold,
  },
  section: {
    fontSize: fontSection,
    fontFamily: fontFamily.semiBold,
  },
  body: {
    fontSize: fontBody,
    fontFamily: fontFamily.regular,
  },
  caption: {
    fontSize: fontCaption,
    fontFamily: fontFamily.medium,
    color: '#64748B',
  },
  metric: {
    fontSize: 32,
    fontFamily: fontFamily.bold,
  },
} as const;

export type TypographyScale = typeof typography;
