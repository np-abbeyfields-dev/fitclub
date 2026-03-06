/**
 * Elevation / shadow presets — single source of truth.
 */

export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export type ElevationScale = typeof elevation;
