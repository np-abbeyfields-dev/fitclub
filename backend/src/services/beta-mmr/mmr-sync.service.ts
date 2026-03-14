/**
 * BETA_MMR: Temporary. Remove this file and the beta-mmr folder when replacing with
 * Apple/Samsung Health or per-user MMR OAuth. Search codebase for BETA_MMR to find all related code.
 */

import prisma from '../../config/database';
import { env } from '../../config/env';
import { logWorkout } from '../workout.service';
import { fetchMMRWorkoutsForUser } from './mmr-api.client';
import { mapMMRActivityToFitClubType } from './mmr-activity-map';

export type MMRUserMapEntry = { email: string; mmrUserId: string };

export type MMRSyncResult = {
  usersProcessed: number;
  workoutsImported: number;
  workoutsSkippedDuplicate: number;
  errors: Array<{ email?: string; mmrUserId?: string; message: string }>;
};

function parseUserMap(): MMRUserMapEntry[] {
  const raw = env.mmrUserMapJson;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is MMRUserMapEntry =>
        typeof e === 'object' && e !== null && typeof (e as MMRUserMapEntry).email === 'string' && typeof (e as MMRUserMapEntry).mmrUserId === 'string'
    );
  } catch {
    return [];
  }
}

function getCutoffDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Run MMR import: for each user in MMR_USER_MAP, fetch workouts from MMR (chunked),
 * filter by MMR_IMPORT_DAYS, skip duplicates by mmrWorkoutId, map activity type, call logWorkout.
 */
export async function runMMRSync(): Promise<MMRSyncResult> {
  const result: MMRSyncResult = { usersProcessed: 0, workoutsImported: 0, workoutsSkippedDuplicate: 0, errors: [] };

  if (!env.mmrApiKey || !env.mmrBearerToken) {
    result.errors.push({ message: 'MMR credentials not configured (MMR_API_KEY, MMR_BEARER_TOKEN).' });
    return result;
  }

  const userMap = parseUserMap();
  if (userMap.length === 0) {
    result.errors.push({ message: 'MMR_USER_MAP is empty or invalid. Expect JSON array of { email, mmrUserId }.' });
    return result;
  }

  const cutoff = getCutoffDate(env.mmrImportDays);

  let roundId: string | null = null;
  if (env.mmrClubId) {
    const round = await prisma.round.findFirst({
      where: { clubId: env.mmrClubId, status: 'active' },
      orderBy: { endDate: 'asc' },
      select: { id: true },
    });
    roundId = round?.id ?? null;
  } else {
    const round = await prisma.round.findFirst({
      where: { status: 'active' },
      orderBy: { endDate: 'asc' },
      select: { id: true },
    });
    roundId = round?.id ?? null;
  }

  if (!roundId) {
    result.errors.push({ message: 'No active round found for MMR import.' });
    return result;
  }

  for (const { email, mmrUserId } of userMap) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      result.errors.push({ email, mmrUserId, message: `FitClub user not found for email: ${email}` });
      continue;
    }

    result.usersProcessed += 1;

    let workouts: Awaited<ReturnType<typeof fetchMMRWorkoutsForUser>> = [];
    try {
      workouts = await fetchMMRWorkoutsForUser(mmrUserId);
    } catch (e) {
      result.errors.push({
        email,
        mmrUserId,
        message: e instanceof Error ? e.message : 'Failed to fetch MMR workouts',
      });
      continue;
    }

    const afterCutoff = workouts.filter((w) => new Date(w.loggedAt) >= cutoff);

    for (const dto of afterCutoff) {
      const existing = await prisma.workout.findUnique({
        where: { mmrWorkoutId: dto.mmrWorkoutId },
        select: { id: true },
      });
      if (existing) {
        result.workoutsSkippedDuplicate += 1;
        continue;
      }

      const fitClubType = mapMMRActivityToFitClubType(dto.activityTypeIdOrName);
      const master = await prisma.workoutMaster.findUnique({
        where: { workoutType: fitClubType },
        select: { id: true },
      });
      if (!master) {
        result.errors.push({
          email,
          message: `No WorkoutMaster for type: ${fitClubType} (MMR: ${dto.activityTypeIdOrName}). Skipping workout ${dto.mmrWorkoutId}.`,
        });
        continue;
      }

      try {
        await logWorkout(roundId, user.id, {
          workoutMasterId: master.id,
          durationMinutes: dto.durationMinutes,
          distanceKm: dto.distanceKm ?? undefined,
          loggedAt: dto.loggedAt,
          mmrWorkoutId: dto.mmrWorkoutId,
        });
        result.workoutsImported += 1;
      } catch (e) {
        result.errors.push({
          email,
          mmrUserId,
          message: e instanceof Error ? e.message : `Failed to log workout ${dto.mmrWorkoutId}`,
        });
      }
    }
  }

  return result;
}
