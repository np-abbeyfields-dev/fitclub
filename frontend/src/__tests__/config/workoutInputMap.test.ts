import {
  getInputConfig,
  getPointsPreview,
  DEFAULT_ACTIVITY_TYPES,
} from '../../config/workoutInputMap';

describe('workoutInputMap', () => {
  describe('getInputConfig', () => {
    it('returns distance config for Running', () => {
      const config = getInputConfig('Running');
      expect(config.inputType).toBe('distance');
      expect(config.unit).toBe('km');
      expect(config.icon).toBe('footsteps');
    });

    it('returns duration config for Yoga', () => {
      const config = getInputConfig('Yoga');
      expect(config.inputType).toBe('duration');
      expect(config.unit).toBe('min');
    });

    it('returns default config for unknown activity', () => {
      const config = getInputConfig('Unknown Activity');
      expect(config.inputType).toBe('duration');
      expect(config.unit).toBe('min');
      expect(config.icon).toBe('barbell');
    });
  });

  describe('getPointsPreview', () => {
    it('returns 0 for zero or negative value', () => {
      expect(getPointsPreview('duration', 0)).toBe(0);
      expect(getPointsPreview('duration', -1)).toBe(0);
      expect(getPointsPreview('distance', 0)).toBe(0);
    });

    it('calculates duration points (0.2 pts/min)', () => {
      expect(getPointsPreview('duration', 10)).toBe(2);
      expect(getPointsPreview('duration', 5)).toBe(1);
    });

    it('calculates distance points (5 pts/km)', () => {
      expect(getPointsPreview('distance', 1)).toBe(5);
      expect(getPointsPreview('distance', 2)).toBe(10);
    });
  });

  describe('DEFAULT_ACTIVITY_TYPES', () => {
    it('includes known activity keys', () => {
      expect(DEFAULT_ACTIVITY_TYPES).toContain('Running');
      expect(DEFAULT_ACTIVITY_TYPES).toContain('Yoga');
      expect(DEFAULT_ACTIVITY_TYPES.length).toBeGreaterThan(0);
    });
  });
});
