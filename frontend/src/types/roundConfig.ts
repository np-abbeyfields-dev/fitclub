/**
 * Round scoring config per FITCLUB_SCORING_ENGINE_SPEC.
 * Stored as Round.scoringConfig (JSON) in the API.
 */
export type ScoringMode = 'distance' | 'duration' | 'fixed' | 'hybrid';

export type MetricType = 'distance' | 'duration' | 'fixed';

export type ActivityRule = {
  activity_type: string;
  metric_type: MetricType;
  conversion_ratio: number;
  minimum_threshold: number;
  max_per_workout: number;
};

export type RoundScoringConfig = {
  scoring_mode: ScoringMode;
  daily_cap_points: number;
  per_workout_cap_points: number | null;
  activity_rules: ActivityRule[];
};

export const DEFAULT_SCORING_CONFIG: RoundScoringConfig = {
  scoring_mode: 'hybrid',
  daily_cap_points: 100,
  per_workout_cap_points: 20,
  activity_rules: [
    { activity_type: 'Running', metric_type: 'distance', conversion_ratio: 5, minimum_threshold: 0.5, max_per_workout: 30 },
    { activity_type: 'Biking', metric_type: 'distance', conversion_ratio: 3, minimum_threshold: 1, max_per_workout: 25 },
    { activity_type: 'Yoga', metric_type: 'duration', conversion_ratio: 0.2, minimum_threshold: 10, max_per_workout: 10 },
    { activity_type: 'Gym(Strength Training)', metric_type: 'duration', conversion_ratio: 0.2, minimum_threshold: 15, max_per_workout: 15 },
  ],
};

export function parseScoringConfig(raw: Record<string, unknown> | null | undefined): RoundScoringConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCORING_CONFIG };
  const mode = (raw.scoring_mode as ScoringMode) ?? 'hybrid';
  const daily = typeof raw.daily_cap_points === 'number' ? raw.daily_cap_points : (raw.dailyCap as number) ?? 100;
  const perWorkout =
    raw.per_workout_cap_points === null || raw.per_workout_cap_points === undefined
      ? null
      : typeof raw.per_workout_cap_points === 'number'
        ? raw.per_workout_cap_points
        : 20;
  const rules = Array.isArray(raw.activity_rules)
    ? (raw.activity_rules as ActivityRule[]).filter(
        (r) => r && typeof r.activity_type === 'string' && typeof r.conversion_ratio === 'number'
      )
    : DEFAULT_SCORING_CONFIG.activity_rules;
  return {
    scoring_mode: mode,
    daily_cap_points: daily,
    per_workout_cap_points: perWorkout,
    activity_rules: rules.length ? rules : DEFAULT_SCORING_CONFIG.activity_rules,
  };
}
