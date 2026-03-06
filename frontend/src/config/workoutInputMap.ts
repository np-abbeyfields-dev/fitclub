import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Minimal client-side map: generic workout type -> input type, unit, icon.
 * Activity list comes from API (GenericWorkoutMet); this only defines how we capture value.
 * Points will be calculated from GenericWorkoutMet (MET, cap) later.
 */
export type InputType = 'distance' | 'duration';

const DEFAULT_INPUT: { inputType: InputType; unit: string; icon: IconName } = {
  inputType: 'duration',
  unit: 'min',
  icon: 'barbell',
};

const MAP: Partial<Record<string, { inputType: InputType; unit: string; icon: IconName }>> = {
  Running: { inputType: 'distance', unit: 'km', icon: 'footsteps' },
  Biking: { inputType: 'distance', unit: 'km', icon: 'bicycle' },
  Walking: { inputType: 'distance', unit: 'km', icon: 'walk' },
  Swimming: { inputType: 'distance', unit: 'km', icon: 'water' },
  Yoga: { inputType: 'duration', unit: 'min', icon: 'body' },
  'Dance/Zumba': { inputType: 'duration', unit: 'min', icon: 'musical-notes' },
  'Racket Sports': { inputType: 'duration', unit: 'min', icon: 'tennisball' },
  'Ball Sports': { inputType: 'duration', unit: 'min', icon: 'basketball' },
  'Gym(Cardio)': { inputType: 'duration', unit: 'min', icon: 'fitness' },
  'Gym(Strength Training)': { inputType: 'duration', unit: 'min', icon: 'barbell' },
  'Gym(Specialist)': { inputType: 'duration', unit: 'min', icon: 'flash' },
  Warmups: { inputType: 'duration', unit: 'min', icon: 'body' },
  'Leisure Workouts': { inputType: 'duration', unit: 'min', icon: 'leaf' },
  'General Sports': { inputType: 'duration', unit: 'min', icon: 'american-football' },
  Skating: { inputType: 'duration', unit: 'min', icon: 'snow' },
  Squash: { inputType: 'duration', unit: 'min', icon: 'tennisball' },
  'Martial Arts': { inputType: 'duration', unit: 'min', icon: 'body' },
  'Unidentified Workout Type': { inputType: 'duration', unit: 'min', icon: 'help-circle' },
};

/** Fallback activity types when API returns empty (e.g. DB not seeded). */
export const DEFAULT_ACTIVITY_TYPES: string[] = Object.keys(MAP) as string[];

export function getInputConfig(genericWorkoutType: string): {
  inputType: InputType;
  unit: string;
  icon: IconName;
} {
  return MAP[genericWorkoutType] ?? DEFAULT_INPUT;
}

/** Temporary points preview (e.g. 0.2 pts/min or 5 pts/km). Replace with API/MET later. */
export function getPointsPreview(inputType: InputType, value: number): number {
  if (!value || value <= 0) return 0;
  if (inputType === 'distance') return Math.round(value * 5 * 10) / 10;
  return Math.round(value * 0.2 * 10) / 10;
}
