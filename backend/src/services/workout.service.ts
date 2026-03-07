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

  const workoutMaster = await prisma.workoutMaster.findUnique({
    where: { workoutType: activityType },
    select: { id: true },
  });
  if (!workoutMaster) throw new ValidationError('Unknown workout type. Choose an activity from the list.');

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
      reasonType: 'workout',
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

  const estimatedCalories = (durationMinutes ?? 0) * 6; // same as dashboard

  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.teamMembership.findUnique({
      where: { userId_roundId: { userId, roundId } },
      include: { Team: { include: { Memberships: true } } },
    });
    const teamId = membership?.teamId ?? null;

    const workout = await tx.workout.create({
      data: {
        userId,
        roundId,
        activityType,
        workoutMasterId: workoutMaster.id,
        durationMinutes: durationMinutes ?? undefined,
        distanceKm: distanceKm ?? undefined,
        proofUrl: input.proofUrl ?? undefined,
        notes: input.note ? String(input.note).trim() || undefined : undefined,
        loggedAt,
      },
    });
    await tx.scoreLedger.create({
      data: {
        workoutId: workout.id,
        userId,
        roundId,
        teamId,
        reasonType: 'workout',
        rawPoints,
        cappedPoints: rawPoints,
        dailyAdjustedPoints: finalAwardedPoints,
        finalAwardedPoints,
        ruleSnapshotJson: ruleSnapshot,
      },
    });

    const now = new Date();
    await tx.userStats.upsert({
      where: {
        userId_clubId_roundId: { userId, clubId: round.clubId, roundId },
      },
      create: {
        userId,
        clubId: round.clubId,
        roundId,
        totalPoints: finalAwardedPoints,
        totalWorkouts: 1,
        totalCalories: estimatedCalories,
        streakDays: 0,
        updatedAt: now,
      },
      update: {
        totalPoints: { increment: finalAwardedPoints },
        totalWorkouts: { increment: 1 },
        totalCalories: { increment: estimatedCalories },
        updatedAt: now,
      },
    });

    if (membership) {
      const teamIdForStats = membership.teamId;
      const memberCount = membership.Team.Memberships.length;
      await tx.teamStats.upsert({
        where: {
          teamId_roundId: { teamId: teamIdForStats, roundId },
        },
        create: {
          teamId: teamIdForStats,
          clubId: round.clubId,
          roundId,
          totalPoints: finalAwardedPoints,
          totalWorkouts: 1,
          memberCount,
          updatedAt: now,
        },
        update: {
          totalPoints: { increment: finalAwardedPoints },
          totalWorkouts: { increment: 1 },
          updatedAt: now,
        },
      });
    }

    await tx.activityFeed.create({
      data: {
        clubId: round.clubId,
        actorUserId: userId,
        type: 'WORKOUT_LOGGED',
        metadataJson: JSON.stringify({
          workoutId: workout.id,
          roundId,
          points: finalAwardedPoints,
          activityType,
        }),
      },
    });

    const workoutDays = await tx.workout.findMany({
      where: { userId, roundId },
      select: { loggedAt: true },
    });
    const daySet = new Set(workoutDays.map((w) => new Date(w.loggedAt).toISOString().slice(0, 10)));
    let streakDays = 0;
    const checkDate = new Date();
    for (;;) {
      const key = checkDate.toISOString().slice(0, 10);
      if (!daySet.has(key)) break;
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    const STREAK_MILESTONES = [3, 7, 14, 30];
    if (STREAK_MILESTONES.includes(streakDays)) {
      await tx.activityFeed.create({
        data: {
          clubId: round.clubId,
          actorUserId: userId,
          type: 'STREAK_REACHED',
          metadataJson: JSON.stringify({ roundId, streakDays }),
        },
      });
    }

    return { id: workout.id, points: finalAwardedPoints };
  });

  return result;
}

/**
 * GET workouts: list current user's workouts for a round, or recent across clubs (FITCLUB_MASTER_SPEC §7.6).
 */
export async function listMyWorkouts(userId: string, options: { roundId?: string; recent?: boolean; limit?: number }) {
  const limit = Math.min(options.limit ?? 20, 50);
  if (options.roundId) {
    const workouts = await prisma.workout.findMany({
      where: { userId, roundId: options.roundId },
      orderBy: { loggedAt: 'desc' },
      take: limit,
      include: { ScoreLedger: { select: { finalAwardedPoints: true } } },
    });
    return workouts.map((w) => ({
      id: w.id,
      roundId: w.roundId,
      activityType: w.activityType,
      durationMinutes: w.durationMinutes,
      distanceKm: w.distanceKm,
      points: Math.round(w.ScoreLedger?.finalAwardedPoints ?? 0),
      loggedAt: w.loggedAt.toISOString(),
    }));
  }
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    include: { Round: { select: { id: true, name: true, clubId: true } }, ScoreLedger: { select: { finalAwardedPoints: true } } },
  });
  return workouts.map((w) => ({
    id: w.id,
    roundId: w.roundId,
    roundName: w.Round.name,
    activityType: w.activityType,
    durationMinutes: w.durationMinutes,
    distanceKm: w.distanceKm,
    points: Math.round(w.ScoreLedger?.finalAwardedPoints ?? 0),
    loggedAt: w.loggedAt.toISOString(),
  }));
}

/**
 * GET workouts/:id — get single workout (FITCLUB_MASTER_SPEC §7.6).
 */
export async function getWorkoutById(workoutId: string, userId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { Round: true, ScoreLedger: true },
  });
  if (!workout) throw new NotFoundError('Workout not found.');
  await ClubService.ensureMember(userId, workout.Round.clubId);
  return {
    id: workout.id,
    roundId: workout.roundId,
    activityType: workout.activityType,
    durationMinutes: workout.durationMinutes,
    distanceKm: workout.distanceKm,
    proofUrl: workout.proofUrl,
    notes: workout.notes ?? undefined,
    points: workout.ScoreLedger ? Math.round(workout.ScoreLedger.finalAwardedPoints) : 0,
    loggedAt: workout.loggedAt.toISOString(),
    createdAt: workout.createdAt.toISOString(),
  };
}

/**
 * DELETE workouts/:id — delete workout (same user or admin). Removes Workout and ScoreLedger (cascade).
 * FITCLUB_MASTER_SPEC §7.6: maybe only within safe window or admin only later.
 */
export async function deleteWorkout(workoutId: string, userId: string, asAdmin: boolean) {
  const { AuthorizationError } = await import('../utils/errors');
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { Round: true, ScoreLedger: true },
  });
  if (!workout) throw new NotFoundError('Workout not found.');
  const membership = await ClubService.ensureMember(userId, workout.Round.clubId);
  if (workout.userId !== userId && membership.role !== 'admin') {
    throw new AuthorizationError('Only the workout owner or an admin can delete it.');
  }
  await prisma.workout.delete({ where: { id: workoutId } });
  return { success: true };
}
