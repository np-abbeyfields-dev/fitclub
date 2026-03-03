import prisma from '../config/database';

export type WorkoutActivityOption = {
  id: number;
  workoutType: string;
  genericWorkoutType: string;
};

export type GenericWorkoutOption = {
  id: number;
  workoutType: string;
  metCap: number | null;
  avgMetPerHour: number | null;
  maxMetLimit: number | null;
};

/**
 * List unique generic workout types for the workout screen (from GenericWorkoutMet).
 * Used as activity options; MET fields reserved for future points calculation.
 */
export async function listGenericActivities(): Promise<GenericWorkoutOption[]> {
  const rows = await prisma.genericWorkoutMet.findMany({
    orderBy: { workoutType: 'asc' },
    select: {
      id: true,
      workoutType: true,
      metCap: true,
      avgMetPerHour: true,
      maxMetLimit: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    workoutType: r.workoutType,
    metCap: r.metCap,
    avgMetPerHour: r.avgMetPerHour,
    maxMetLimit: r.maxMetLimit,
  }));
}

/**
 * List all workout type mappings (specific -> generic) for the workout screen.
 * Frontend can group by genericWorkoutType or show a flat list.
 */
export async function listWorkoutMaster(): Promise<WorkoutActivityOption[]> {
  const rows = await prisma.workoutMaster.findMany({
    orderBy: [{ genericWorkoutType: 'asc' }, { workoutType: 'asc' }],
    select: {
      id: true,
      workoutType: true,
      genericWorkoutType: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    workoutType: r.workoutType,
    genericWorkoutType: r.genericWorkoutType,
  }));
}
