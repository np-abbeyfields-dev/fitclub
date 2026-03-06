import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';

function getDailyCap(round: { scoringConfig: unknown }): number {
  try {
    const config = round.scoringConfig as { dailyCap?: number };
    return typeof config?.dailyCap === 'number' ? config.dailyCap : 100;
  } catch {
    return 100;
  }
}

/** Raw points from inputs: 0.2 pts/min (duration) or 5 pts/km (distance). Aligns with frontend preview. */
function calculateRawPoints(durationMinutes: number | null, distanceKm: number | null): number {
  if (distanceKm != null && distanceKm > 0) return Math.round(distanceKm * 5 * 10) / 10;
  if (durationMinutes != null && durationMinutes > 0) return Math.round(durationMinutes * 0.2 * 10) / 10;
  return 0;
}

export type LogWorkoutInput = {
  activityType: string;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  proofUrl?: string | null;
  note?: string | null;
  loggedAt?: string; // ISO
};

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

/**
 * Log a workout for a round. Enforces FITCLUB_MASTER_SPEC §6.3:
 * - Validate user belongs to club (via round's clubId)
 * - Validate round exists and is active
 * - Create Workout row and ScoreLedger row in one transaction (PointsLedger as source of truth)
 * - Apply daily cap from round.scoringConfig
 */
export async function logWorkout(roundId: string, userId: string, input: LogWorkoutInput): Promise<{ id: string; points: number }> {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new NotFoundError('Round not found.');
  if (round.status !== 'active') throw new ValidationError('Workouts can only be logged for an active round.');
  await ClubService.ensureMember(userId, round.clubId);

  const activityType = (input.activityType || '').trim();
  if (!activityType) throw new ValidationError('Activity type is required.');

  const durationMinutes = input.durationMinutes != null ? Number(input.durationMinutes) : null;
  const distanceKm = input.distanceKm != null ? Number(input.distanceKm) : null;
  const rawPoints = calculateRawPoints(durationMinutes, distanceKm);
  if (rawPoints <= 0) throw new ValidationError('Provide duration (minutes) or distance (km) to earn points.');

  const loggedAt = input.loggedAt ? new Date(input.loggedAt) : new Date();
  if (isNaN(loggedAt.getTime())) throw new ValidationError('Invalid loggedAt date.');

  const dailyCap = getDailyCap(round);
  const todayStart = new Date(loggedAt);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaySum = await prisma.scoreLedger.aggregate({
    where: {
      userId,
      roundId,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
    _sum: { finalAwardedPoints: true },
  });
  const todayPoints = todaySum._sum.finalAwardedPoints ?? 0;
  const remainingCap = Math.max(0, dailyCap - todayPoints);
  const finalAwardedPoints = Math.min(rawPoints, remainingCap);

  const ruleSnapshot = JSON.stringify({
    dailyCap,
    todayPointsBefore: todayPoints,
    rawPoints,
    source: 'workout',
  });

  const result = await prisma.$transaction(async (tx) => {
    const workout = await tx.workout.create({
      data: {
        userId,
        roundId,
        activityType,
        durationMinutes: durationMinutes ?? undefined,
        distanceKm: distanceKm ?? undefined,
        proofUrl: input.proofUrl ?? undefined,
        loggedAt,
      },
    });
    await tx.scoreLedger.create({
      data: {
        workoutId: workout.id,
        userId,
        roundId,
        rawPoints,
        cappedPoints: rawPoints,
        dailyAdjustedPoints: finalAwardedPoints,
        finalAwardedPoints,
        ruleSnapshotJson: ruleSnapshot,
      },
    });
    return { id: workout.id, points: finalAwardedPoints };
  });

  return result;
}
