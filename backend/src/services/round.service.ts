import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';

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

  /** Admin only. Activate a round (only one active per club; DB enforces via partial unique index). */
  static async activateRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId, 'admin');

    await prisma.$transaction(async (tx) => {
      await tx.round.updateMany({
        where: { clubId: round.clubId, status: 'active' },
        data: { status: 'ended' },
      });
      await tx.round.update({
        where: { id: roundId },
        data: { status: 'active' },
      });
    });

    return prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      include: { Club: { select: { id: true, name: true } } },
    });
  }

  /** Admin only. Update a round (draft only). */
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
      throw new ValidationError('Only active rounds can be ended.');
    }
    return prisma.round.update({
      where: { id: roundId },
      data: { status: 'ended' },
      include: { Club: { select: { id: true, name: true } } },
    });
  }
}
