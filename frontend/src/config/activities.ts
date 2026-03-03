import type { Ionicons } from '@expo/vector-icons';

export type ActivityId = 'running' | 'cycling' | 'strength' | 'yoga';

export type ActivityInputType = 'distance' | 'duration';

export type ActivityConfig = {
  id: ActivityId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  inputType: ActivityInputType;
  unit: string;
  placeholder: string;
  /** Points per unit (e.g. 10 pts per km, or 0.2 pts per minute) */
  pointsPerUnit: number;
};

export const ACTIVITIES: ActivityConfig[] = [
  {
    id: 'running',
    label: 'Running',
    icon: 'footsteps',
    inputType: 'distance',
    unit: 'km',
    placeholder: '0.0',
    pointsPerUnit: 10,
  },
  {
    id: 'cycling',
    label: 'Cycling',
    icon: 'bicycle',
    inputType: 'distance',
    unit: 'km',
    placeholder: '0.0',
    pointsPerUnit: 5,
  },
  {
    id: 'strength',
    label: 'Strength',
    icon: 'barbell',
    inputType: 'duration',
    unit: 'min',
    placeholder: '0',
    pointsPerUnit: 0.2,
  },
  {
    id: 'yoga',
    label: 'Yoga',
    icon: 'body',
    inputType: 'duration',
    unit: 'min',
    placeholder: '0',
    pointsPerUnit: 0.2,
  },
];

export function calculatePoints(activity: ActivityConfig, value: number): number {
  if (!value || value <= 0) return 0;
  const raw = activity.pointsPerUnit * value;
  return Math.round(raw * 10) / 10;
}
