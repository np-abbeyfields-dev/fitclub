/**
 * BETA_MMR: Temporary. Remove with beta-mmr folder. Maps MMR activity type (ID or name) to FitClub WorkoutMaster.workoutType.
 */

/** Map MMR activity type string (API ID or name) -> FitClub workoutType (must exist in WorkoutMaster). */
const MMR_TO_FITCLUB_TYPE: Record<string, string> = {
  // Running
  Run: 'Run',
  'General Run': 'Run',
  'Quick Run': 'Run',
  'Long Run': 'Run',
  'Trail Run': 'Run',
  'Easy Jog': 'Run',
  'Indoor Run / Jog': 'Run',
  'Treadmill Run': 'Run',
  'Interval Run': 'Run',
  Running: 'Run',
  Jog: 'Run',
  // Walking
  Walk: 'Walk',
  'General Walk': 'Walk',
  'Power Walk': 'Walk',
  'Treadmill Walk': 'Walk',
  Hiking: 'Walk',
  Hike: 'Walk',
  Walking: 'Walk',
  // Biking
  Cycling: 'Biking',
  Biking: 'Biking',
  'Bike Ride': 'Biking',
  'Road Cycling': 'Biking',
  'Mountain Biking': 'Biking',
  'Indoor Bike Ride': 'Biking',
  'Stationary Bike': 'Biking',
  'Indoor Bike': 'Biking',
  // Gym / strength
  'Gym Workout': 'Gym Workout',
  'Weight Workout': 'Gym Workout',
  'Strength Training': 'Gym Workout',
  'General Workout': 'Gym Workout',
  'Machine Workout': 'Gym Workout',
  // Swimming
  Swim: 'Swim',
  Swimming: 'Swim',
  'Lap Swim': 'Swim',
  // Others
  Yoga: 'Yoga',
  Rowing: 'Rowing',
  Elliptical: 'Elliptical Machine',
  'Elliptical Machine': 'Elliptical Machine',
  'Stair Machine': 'Stair Machine',
  Tennis: 'Tennis',
  Basketball: 'Basketball',
  Soccer: 'Soccer Sport',
  Football: 'Football',
};

/** Fallback when MMR type is unknown. Must exist in WorkoutMaster. */
const DEFAULT_FITCLUB_TYPE = 'Generic Workout';

export function mapMMRActivityToFitClubType(mmrActivityIdOrName: string): string {
  const normalized = (mmrActivityIdOrName || '').trim();
  if (!normalized) return DEFAULT_FITCLUB_TYPE;
  const mapped = MMR_TO_FITCLUB_TYPE[normalized];
  if (mapped) return mapped;
  const byKey = Object.keys(MMR_TO_FITCLUB_TYPE).find((k) => k.toLowerCase() === normalized.toLowerCase());
  if (byKey) return MMR_TO_FITCLUB_TYPE[byKey];
  return DEFAULT_FITCLUB_TYPE;
}
