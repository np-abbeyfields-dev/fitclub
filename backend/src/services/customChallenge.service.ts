import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';

export type CreateCustomChallengeInput = {
  name: string;
  description?: string;
  icon?: string;
  pointsAwarded: number;
};

export type UpdateCustomChallengeInput = {
  name?: string;
  description?: string;
  icon?: string;
  pointsAwarded?: number;
};

/** Format a Date as YYYY-MM-DD in UTC for completion date uniqueness. */
function toCompletionDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapChallengeToDto(ch: { id: string; roundId: string; clubId: string; name: string; description: string | null; icon: string | null; pointsAwarded: number; createdByUserId: string; createdAt: Date; updatedAt: Date; CreatedByUser?: { id: string; displayName: string } | null }, completedToday?: boolean) {
  return {
    id: ch.id,
    roundId: ch.roundId,
    clubId: ch.clubId,
    name: ch.name,
    description: ch.description ?? undefined,
    icon: ch.icon ?? undefined,
    pointsAwarded: ch.pointsAwarded,
    createdByUserId: ch.createdByUserId,
    createdBy: ch.CreatedByUser ? { id: ch.CreatedByUser.id, displayName: ch.CreatedByUser.displayName } : undefined,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
    ...(completedToday !== undefined && { completedToday }),
  };
}

export class CustomChallengeService {
  /** List all custom challenges for a round. Any club member. */
  static async listByRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId }, select: { id: true, clubId: true } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    const list = await prisma.customChallenge.findMany({
      where: { roundId },
      orderBy: { createdAt: 'asc' },
      include: {
        CreatedByUser: { select: { id: true, displayName: true } },
      },
    });
    const completionDatesByChallenge = new Map<string, Set<string>>();
    const myCompletions = await prisma.customChallengeCompletion.findMany({
      where: { userId, customChallengeId: { in: list.map((c) => c.id) } },
      select: { customChallengeId: true, completionDate: true },
    });
    for (const c of myCompletions) {
      let set = completionDatesByChallenge.get(c.customChallengeId);
      if (!set) {
        set = new Set();
        completionDatesByChallenge.set(c.customChallengeId, set);
      }
      set.add(c.completionDate);
    }
    const todayKey = toCompletionDateKey(new Date());
    return list.map((ch) => ({
      ...mapChallengeToDto(ch, completionDatesByChallenge.get(ch.id)?.has(todayKey) ?? false),
    }));
  }

  /** Create a custom challenge for a round. Admin or team_lead only; round must be active. */
  static async create(roundId: string, userId: string, data: CreateCustomChallengeInput) {
    const round = await prisma.round.findUnique({ where: { id: roundId }, select: { id: true, clubId: true, status: true } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId, 'team_lead');
    if (round.status !== 'active') throw new ValidationError('Challenges can only be added to an active round.');
    const name = (data.name || '').trim();
    if (!name) throw new ValidationError('Challenge name is required.');
    const pointsAwarded = typeof data.pointsAwarded === 'number' ? Math.round(data.pointsAwarded) : 0;
    if (pointsAwarded < 0) throw new ValidationError('Points must be non-negative.');
    const challenge = await prisma.customChallenge.create({
      data: {
        roundId: round.id,
        clubId: round.clubId,
        name,
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        pointsAwarded,
        createdByUserId: userId,
      },
      include: { CreatedByUser: { select: { id: true, displayName: true } } },
    });
    return mapChallengeToDto(challenge);
  }

  /** Update a custom challenge. Admin or team_lead only; challenge must belong to club. */
  static async update(challengeId: string, userId: string, data: UpdateCustomChallengeInput) {
    const ch = await prisma.customChallenge.findUnique({ where: { id: challengeId } });
    if (!ch) throw new NotFoundError('Custom challenge not found.');
    await ClubService.ensureMember(userId, ch.clubId, 'team_lead');
    const updates: { name?: string; description?: string | null; icon?: string | null; pointsAwarded?: number } = {};
    if (data.name !== undefined) {
      const name = (data.name || '').trim();
      if (!name) throw new ValidationError('Challenge name is required.');
      updates.name = name;
    }
    if (data.description !== undefined) updates.description = data.description?.trim() || null;
    if (data.icon !== undefined) updates.icon = data.icon?.trim() || null;
    if (typeof data.pointsAwarded === 'number') {
      const pointsAwarded = Math.round(data.pointsAwarded);
      if (pointsAwarded < 0) throw new ValidationError('Points must be non-negative.');
      updates.pointsAwarded = pointsAwarded;
    }
    const updated = await prisma.customChallenge.update({
      where: { id: challengeId },
      data: updates,
      include: { CreatedByUser: { select: { id: true, displayName: true } } },
    });
    return mapChallengeToDto(updated);
  }

  /** Delete a custom challenge. Admin or team_lead only. */
  static async delete(challengeId: string, userId: string) {
    const ch = await prisma.customChallenge.findUnique({ where: { id: challengeId } });
    if (!ch) throw new NotFoundError('Custom challenge not found.');
    await ClubService.ensureMember(userId, ch.clubId, 'team_lead');
    await prisma.customChallenge.delete({ where: { id: challengeId } });
  }

  /**
   * Complete a custom challenge for "today" (or optional date).
   * Points apply to the challenge's round. Round must still be active (challenge ends with round).
   * One completion per user per challenge per calendar day (idempotent: returns existing if already completed).
   */
  static async complete(challengeId: string, userId: string, date?: string) {
    const ch = await prisma.customChallenge.findUnique({ where: { id: challengeId }, include: { Round: { select: { id: true, status: true } } } });
    if (!ch) throw new NotFoundError('Custom challenge not found.');
    await ClubService.ensureMember(userId, ch.clubId);
    if (ch.Round.status !== 'active') throw new ValidationError('This round is no longer active. Challenges end when the round ends.');
    const completionDateKey = date?.trim() || toCompletionDateKey(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDateKey)) throw new ValidationError('Date must be YYYY-MM-DD.');
    const existing = await prisma.customChallengeCompletion.findUnique({
      where: {
        customChallengeId_userId_completionDate: { customChallengeId: challengeId, userId, completionDate: completionDateKey },
      },
    });
    if (existing) {
      return { id: existing.id, pointsAwarded: existing.pointsAwarded, alreadyCompleted: true };
    }
    const completion = await prisma.customChallengeCompletion.create({
      data: {
        userId,
        customChallengeId: challengeId,
        roundId: ch.roundId,
        completionDate: completionDateKey,
        pointsAwarded: ch.pointsAwarded,
      },
    });
    return { id: completion.id, pointsAwarded: completion.pointsAwarded, alreadyCompleted: false };
  }

  /**
   * Uncomplete (remove) a completion for a given date. Any member can uncomplete their own.
   */
  static async uncomplete(challengeId: string, userId: string, date?: string) {
    const ch = await prisma.customChallenge.findUnique({ where: { id: challengeId } });
    if (!ch) throw new NotFoundError('Custom challenge not found.');
    await ClubService.ensureMember(userId, ch.clubId);
    const completionDateKey = date?.trim() || toCompletionDateKey(new Date());
    await prisma.customChallengeCompletion.deleteMany({
      where: {
        customChallengeId: challengeId,
        userId,
        completionDate: completionDateKey,
      },
    });
  }

  /**
   * Sum of custom challenge points per user for a round (for leaderboard/dashboard).
   */
  static async sumPointsByUserForRound(roundId: string): Promise<Map<string, number>> {
    const rows = await prisma.customChallengeCompletion.groupBy({
      by: ['userId'],
      where: { roundId },
      _sum: { pointsAwarded: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.userId, r._sum.pointsAwarded ?? 0);
    }
    return map;
  }
}
