import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';
import { notifyChallengeLive, createRoundStartedNotifications } from './notification.service';

export type RoundCreateInput = {
  name: string;
  startDate: Date;
  endDate: Date;
  scoringConfig: object;
  teamSize?: number;
};

export class RoundService {
  /** Admin only. Creates a round in draft status. */
  static async createRound(clubId: string, userId: string, data: RoundCreateInput) {
    await ClubService.ensureMember(userId, clubId, 'admin');

    const round = await prisma.round.create({
      data: {
        clubId,
        name: data.name.trim(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        scoringConfig: data.scoringConfig as object,
        teamSize: data.teamSize ?? null,
        status: 'draft',
      },
      include: { Club: { select: { id: true, name: true } } },
    });
    return round;
  }

  /** Any club member. List rounds for a club. */
  static async listRoundsByClub(clubId: string, userId: string) {
    await ClubService.ensureMember(userId, clubId);

    const rounds = await prisma.round.findMany({
      where: { clubId },
      orderBy: { startDate: 'desc' },
      include: { Club: { select: { id: true, name: true } } },
    });
    return rounds;
  }

  /** Any club member. Get a single round. */
  static async getRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { Club: true, Teams: { include: { Memberships: { include: { User: { select: { id: true, displayName: true, email: true } } } } } } },
    });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    return round;
  }

  /**
   * Admin only. Activate a round.
   * One active round per club: service deactivates others in same transaction; DB enforces via
   * partial unique index Round_clubId_status_active_key on (clubId) WHERE status = 'active'.
   */
  static async activateRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId, 'admin');

    await prisma.$transaction(async (tx) => {
      await tx.round.updateMany({
        where: { clubId: round.clubId, status: 'active' },
        data: { status: 'completed' },
      });
      await tx.round.update({
        where: { id: roundId },
        data: { status: 'active' },
      });
    });

    const activeCount = await prisma.round.count({
      where: { clubId: round.clubId, status: 'active' },
    });
    if (activeCount !== 1) {
      throw new ValidationError(
        'One active round per club: expected exactly one active round after activation.'
      );
    }

    notifyChallengeLive(round.clubId, round.name).catch(() => {});
    createRoundStartedNotifications(round.clubId, round.name).catch(() => {});

    await prisma.activityFeed.create({
      data: {
        clubId: round.clubId,
        actorUserId: userId,
        type: 'ROUND_STARTED',
        metadataJson: JSON.stringify({ roundId, roundName: round.name }),
      },
    }).catch(() => {});

    return prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      include: { Club: { select: { id: true, name: true } } },
    });
  }

  /**
   * Admin only. Update a round (draft only).
   * Status cannot be changed here; use activateRound / endRound. Ensures one active round per club is not bypassed.
   */
  static async updateRound(roundId: string, userId: string, data: Partial<RoundCreateInput>) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId, 'admin');
    if (round.status !== 'draft') {
      throw new ValidationError('Only draft rounds can be edited.');
    }
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.startDate !== undefined) update.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) update.endDate = new Date(data.endDate);
    if (data.scoringConfig !== undefined) update.scoringConfig = data.scoringConfig;
    if (data.teamSize !== undefined) update.teamSize = data.teamSize ?? null;
    return prisma.round.update({
      where: { id: roundId },
      data: update as any,
      include: { Club: { select: { id: true, name: true } } },
    });
  }

  /** Admin only. End the active round. */
  static async endRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId, 'admin');
    if (round.status !== 'active') {
      throw new ValidationError('Only active rounds can be completed.');
    }
    return prisma.round.update({
      where: { id: roundId },
      data: { status: 'completed' },
      include: { Club: { select: { id: true, name: true } } },
    });
  }

  /** Round wrap-up: summary for a completed (or any) round — leaderboard snapshot, total points (FITCLUB_MASTER_SPEC Phase 4). */
  static async getRoundSummary(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId }, include: { Club: true } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);

    const [userScores, teamTotals] = await Promise.all([
      prisma.scoreLedger.groupBy({
        by: ['userId'],
        where: { roundId },
        _sum: { finalAwardedPoints: true },
      }),
      (async () => {
        const teams = await prisma.team.findMany({
          where: { roundId },
          include: { Memberships: true },
        });
        const userIds = teams.flatMap((t) => t.Memberships.map((m) => m.userId));
        const byUser =
          userIds.length > 0
            ? await prisma.scoreLedger.groupBy({
                by: ['userId'],
                where: { roundId, userId: { in: userIds } },
                _sum: { finalAwardedPoints: true },
              })
            : [];
        const map = new Map(byUser.map((s) => [s.userId, s._sum.finalAwardedPoints ?? 0]));
        return teams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          totalPoints: t.Memberships.reduce((s, m) => s + (map.get(m.userId) ?? 0), 0),
        }));
      })(),
    ]);

    const userIds = userScores.map((s) => s.userId);
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.displayName]));

    const individualLeaderboard = userScores
      .map((s) => ({
        userId: s.userId,
        name: userMap.get(s.userId) ?? 'Unknown',
        points: Math.round(s._sum.finalAwardedPoints ?? 0),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    const teamLeaderboard = teamTotals
      .map((t) => ({ teamName: t.teamName, totalPoints: Math.round(t.totalPoints) }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);

    const totalPoints = userScores.reduce((s, x) => s + (x._sum.finalAwardedPoints ?? 0), 0);

    return {
      roundId: round.id,
      roundName: round.name,
      status: round.status,
      startDate: round.startDate.toISOString(),
      endDate: round.endDate.toISOString(),
      totalPoints: Math.round(totalPoints),
      topIndividuals: individualLeaderboard,
      topTeams: teamLeaderboard,
    };
  }
}
