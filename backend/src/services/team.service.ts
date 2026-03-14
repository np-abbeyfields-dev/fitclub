import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';
import { CustomChallengeService } from './customChallenge.service';

/** Enforce unique(roundId, userId): one team per user per round. DB enforces via TeamMembership_userId_roundId_key. */
async function ensureOneTeamPerUserPerRound(roundId: string, userId: string): Promise<void> {
  const existing = await prisma.teamMembership.findUnique({
    where: { userId_roundId: { userId, roundId } },
  });
  if (existing) {
    throw new ValidationError(
      'This user is already on a team for this round. A user can only be in one team per round.'
    );
  }
}

export class TeamService {
  /** Club admin only, draft only. Creates team and adds teamLeadUserId as first member with isLeader true. */
  static async createTeam(roundId: string, callerUserId: string, name: string, teamLeadUserId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(callerUserId, round.clubId, 'admin');
    if (round.status !== 'draft') {
      throw new ValidationError('Teams can only be created when the round is in draft. Once the round has started, teams are locked.');
    }
    if (!teamLeadUserId?.trim()) {
      throw new ValidationError('Team lead is required. Every team must have a lead.');
    }
    const leadUserId = teamLeadUserId.trim();
    await ClubService.ensureMember(leadUserId, round.clubId);
    await ensureOneTeamPerUserPerRound(roundId, leadUserId);

    const team = await prisma.team.create({
      data: { roundId, name: name.trim(), createdBy: callerUserId },
      include: { Round: { select: { id: true, name: true, status: true, clubId: true } } },
    });
    await prisma.teamMembership.create({
      data: { userId: leadUserId, teamId: team.id, roundId, isLeader: true },
    });
    await prisma.activityFeed.create({
      data: {
        clubId: team.Round.clubId,
        actorUserId: callerUserId,
        type: 'TEAM_CREATED',
        metadataJson: JSON.stringify({ teamId: team.id, teamName: team.name, roundId, teamLeadUserId: leadUserId }),
      },
    }).catch(() => {});
    return prisma.team.findUniqueOrThrow({
      where: { id: team.id },
      include: {
        Round: { select: { id: true, name: true, status: true, clubId: true } },
        Memberships: { include: { User: { select: { id: true, displayName: true, email: true } } } },
      },
    });
  }

  /** Any club member. List teams for a round. */
  static async listTeamsByRound(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    const teams = await prisma.team.findMany({
      where: { roundId },
      include: {
        Memberships: { include: { User: { select: { id: true, displayName: true, email: true } } } },
      },
    });
    return teams;
  }

  /**
   * Add a user to a team. Caller must be club member; adding someone else requires admin or team_lead (and team_lead must be in this team).
   * Enforces: user can be in only one team per club per round (see schema TeamMembership).
   */
  static async addMemberToTeam(roundId: string, teamId: string, userIdToAdd: string, callerUserId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    const callerMembership = await ClubService.ensureMember(callerUserId, round.clubId);
    const isAddingSelf = callerUserId === userIdToAdd;
    if (!isAddingSelf) {
      if (callerMembership.role !== 'admin') {
        if (callerMembership.role !== 'team_lead')
          throw new AuthorizationError('Only admins and team leads can add members to a team.');
        const callerInTeam = await prisma.teamMembership.findUnique({
          where: { userId_roundId: { userId: callerUserId, roundId } },
        });
        if (!callerInTeam || callerInTeam.teamId !== teamId)
          throw new AuthorizationError('Team leads can only add members to their own team.');
      }
    }

    if (round.status !== 'draft') {
      throw new ValidationError('Members can only be added to teams when the round is in draft. Once the round has started, teams are locked.');
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, roundId } });
    if (!team) throw new NotFoundError('Team not found.');

    const membershipInClub = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: userIdToAdd, clubId: round.clubId } },
    });
    if (!membershipInClub) {
      throw new ValidationError('User is not a member of this club.');
    }

    await ensureOneTeamPerUserPerRound(roundId, userIdToAdd);

    const membership = await prisma.teamMembership.create({
      data: { userId: userIdToAdd, teamId, roundId },
      include: { User: { select: { id: true, displayName: true, email: true } }, Team: true },
    });
    await prisma.activityFeed.create({
      data: {
        clubId: round.clubId,
        actorUserId: userIdToAdd,
        type: 'TEAM_JOINED',
        metadataJson: JSON.stringify({
          teamId,
          teamName: membership.Team.name,
          roundId,
        }),
      },
    }).catch(() => {});
    return membership;
  }

  /** Remove a member from a team. Caller must be club admin or team_lead (team_lead only for their own team). Only allowed when round is draft. */
  static async removeMemberFromTeam(roundId: string, teamId: string, userIdToRemove: string, callerUserId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    if (round.status !== 'draft') {
      throw new ValidationError('Members can only be removed when the round is in draft. Once the round has started, teams are locked.');
    }
    const callerMembership = await ClubService.ensureMember(callerUserId, round.clubId);
    if (callerMembership.role !== 'admin') {
      if (callerMembership.role !== 'team_lead')
        throw new AuthorizationError('Only admins and team leads can remove members from a team.');
      const callerInTeam = await prisma.teamMembership.findUnique({
        where: { userId_roundId: { userId: callerUserId, roundId } },
      });
      if (!callerInTeam || callerInTeam.teamId !== teamId)
        throw new AuthorizationError('Team leads can only remove members from their own team.');
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, roundId } });
    if (!team) throw new NotFoundError('Team not found.');

    const membership = await prisma.teamMembership.findUnique({
      where: { userId_roundId: { userId: userIdToRemove, roundId } },
    });
    if (!membership || membership.teamId !== teamId) {
      throw new NotFoundError('Member is not on this team.');
    }

    await prisma.teamMembership.delete({
      where: { id: membership.id },
    });
    return { success: true };
  }

  /** Get current user's team summary for the round, or null if not in a team. */
  static async getMyTeamSummary(roundId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    const myMembership = await prisma.teamMembership.findUnique({
      where: { userId_roundId: { userId, roundId } },
      include: { Team: true },
    });
    if (!myMembership) return null;
    return this.getTeamSummary(roundId, myMembership.teamId, userId);
  }

  /** Get team with member points and rank for the round. */
  static async getTeamSummary(roundId: string, teamId: string, userId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    const team = await prisma.team.findFirst({
      where: { id: teamId, roundId },
      include: {
        Memberships: {
          select: { id: true, userId: true, isLeader: true, User: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!team) throw new NotFoundError('Team not found.');
    const userIds = team.Memberships.map((m) => m.userId);
    const allCustomMap = await CustomChallengeService.sumPointsByUserForRound(roundId);
    const allScores = await prisma.scoreLedger.groupBy({
      by: ['userId'],
      where: { roundId },
      _sum: { finalAwardedPoints: true },
    });
    const allWorkoutPoints = new Map(allScores.map((s) => [s.userId, s._sum.finalAwardedPoints ?? 0]));

    const [scores, workoutCounts, customCounts] =
      userIds.length > 0
        ? await Promise.all([
            prisma.scoreLedger.groupBy({
              by: ['userId'],
              where: { roundId, userId: { in: userIds } },
              _sum: { finalAwardedPoints: true },
            }),
            prisma.workout.groupBy({
              by: ['userId'],
              where: { roundId, userId: { in: userIds } },
              _count: { id: true },
            }),
            prisma.customChallengeCompletion.groupBy({
              by: ['userId'],
              where: { roundId, userId: { in: userIds } },
              _count: { id: true },
            }),
          ])
        : [[], [], []];
    const workoutPointsByUser = new Map(scores.map((s) => [s.userId, s._sum.finalAwardedPoints ?? 0]));
    const workoutCountByUser = new Map(workoutCounts.map((w) => [w.userId, w._count.id]));
    const challengeCountByUser = new Map(customCounts.map((c) => [c.userId, c._count.id]));
    const pointsByUser = new Map<string, number>();
    for (const uid of userIds) {
      const workoutPts = workoutPointsByUser.get(uid) ?? 0;
      const customPts = allCustomMap.get(uid) ?? 0;
      pointsByUser.set(uid, workoutPts + customPts);
    }
    for (const [uid, pts] of allCustomMap) {
      if (!pointsByUser.has(uid)) pointsByUser.set(uid, pts);
    }
    const total = team.Memberships.reduce((sum, m) => sum + (pointsByUser.get(m.userId) ?? 0), 0);
    const members = team.Memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.User.displayName,
      points: Math.round(pointsByUser.get(m.userId) ?? 0),
      workoutCount: workoutCountByUser.get(m.userId) ?? 0,
      challengeCount: challengeCountByUser.get(m.userId) ?? 0,
      isCurrentUser: m.userId === userId,
      contributionPercent: total > 0 ? ((pointsByUser.get(m.userId) ?? 0) / total) * 100 : 0,
      isTeamLead: m.isLeader,
    }));
    const allTeams = await prisma.team.findMany({ where: { roundId }, include: { Memberships: true } });
    const teamTotals = allTeams.map((t) => {
      const tot = t.Memberships.reduce(
        (sum, m) =>
          sum + (allWorkoutPoints.get(m.userId) ?? 0) + (allCustomMap.get(m.userId) ?? 0),
        0
      );
      return { teamId: t.id, total: tot };
    });
    teamTotals.sort((a, b) => b.total - a.total);
    const rank = teamTotals.findIndex((t) => t.teamId === teamId) + 1 || 0;
    return {
      id: team.id,
      name: team.name,
      rank,
      totalPoints: Math.round(total),
      members,
    };
  }
}
