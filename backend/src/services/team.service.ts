import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';

export class TeamService {
  /** Any club member when round is active. Create a team. */
  static async createTeam(roundId: string, userId: string, name: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);
    if (round.status !== 'active') {
      throw new ValidationError('Teams can only be created when the round is active.');
    }
    const team = await prisma.team.create({
      data: { roundId, name: name.trim() },
      include: { Round: { select: { id: true, name: true, status: true } } },
    });
    return team;
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

    if (round.status !== 'active') {
      throw new ValidationError('Members can only be added to teams when the round is active.');
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, roundId } });
    if (!team) throw new NotFoundError('Team not found.');

    const membershipInClub = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: userIdToAdd, clubId: round.clubId } },
    });
    if (!membershipInClub) {
      throw new ValidationError('User is not a member of this club.');
    }

    // One team per user per round (user may be in different teams in other rounds).
    const existingInRound = await prisma.teamMembership.findUnique({
      where: { userId_roundId: { userId: userIdToAdd, roundId } },
    });
    if (existingInRound) {
      throw new ValidationError(
        'This user is already on a team for this round. A user can only be in one team per round.'
      );
    }

    const membership = await prisma.teamMembership.create({
      data: { userId: userIdToAdd, teamId, roundId },
      include: { User: { select: { id: true, displayName: true, email: true } }, Team: true },
    });
    return membership;
  }

  /** Remove a member from a team. Caller must be club admin or team_lead (team_lead only for their own team). */
  static async removeMemberFromTeam(roundId: string, teamId: string, userIdToRemove: string, callerUserId: string) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
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
      include: { Memberships: { include: { User: { select: { id: true, displayName: true } } } } },
    });
    if (!team) throw new NotFoundError('Team not found.');
    const userIds = team.Memberships.map((m) => m.userId);
    const scores = userIds.length
      ? await prisma.scoreLedger.groupBy({
          by: ['userId'],
          where: { roundId, userId: { in: userIds } },
          _sum: { finalAwardedPoints: true },
        })
      : [];
    const pointsByUser = new Map(scores.map((s) => [s.userId, s._sum.finalAwardedPoints ?? 0]));
    const total = team.Memberships.reduce((sum, m) => sum + (pointsByUser.get(m.userId) ?? 0), 0);
    const members = team.Memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.User.displayName,
      points: Math.round(pointsByUser.get(m.userId) ?? 0),
      isCurrentUser: m.userId === userId,
      contributionPercent: total > 0 ? ((pointsByUser.get(m.userId) ?? 0) / total) * 100 : 0,
    }));
    const allTeams = await prisma.team.findMany({ where: { roundId }, include: { Memberships: true } });
    const teamTotals = await Promise.all(
      allTeams.map(async (t) => {
        const ids = t.Memberships.map((m) => m.userId);
        const s =
          ids.length > 0
            ? await prisma.scoreLedger.groupBy({
                by: ['userId'],
                where: { roundId, userId: { in: ids } },
                _sum: { finalAwardedPoints: true },
              })
            : [];
        const tot = s.reduce((sum, x) => sum + (x._sum.finalAwardedPoints ?? 0), 0);
        return { teamId: t.id, total: tot };
      })
    );
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
