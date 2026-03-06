/**
 * Typography scale — single source of truth for type styles.
 * Used by theme to build full typography (with lineHeight, theme color for caption).
 */

export const typography = {
  hero: {
    fontSize: 34,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  section: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
  },
  caption: {
    fontSize: 13,
    color: '#64748B',
  },
  metric: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
} as const;

export type TypographyScale = typeof typography;
