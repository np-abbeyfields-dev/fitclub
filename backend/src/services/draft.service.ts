/**
 * Snake draft: team leaders pick members in turn (A, B, C, ..., Last, Last, ..., B, A, repeat).
 * Team leaders see previous-round stats to inform picks. Only the team on the clock can pick.
 */

import prisma from '../config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { ClubService } from './club.service';
import { TeamService } from './team.service';

const PREVIOUS_ROUNDS_LIMIT = 10;

/** Snake order: for global pick index k and n teams (0..n-1), returns team index. */
function snakeTeamIndex(pickIndex: number, teamCount: number): number {
  if (teamCount <= 0) return -1;
  const cycle = 2 * teamCount;
  const pos = pickIndex % cycle;
  return pos < teamCount ? pos : 2 * teamCount - 1 - pos;
}

export type PreviousRoundStat = { roundId: string; roundName: string; points: number; workouts: number };

export type DraftState = {
  roundId: string;
  roundName: string;
  pickNumber: number;
  currentTeamId: string | null;
  currentTeamName: string | null;
  isCurrentUserTurn: boolean;
  teams: Array<{ id: string; name: string; memberIds: string[]; isLeader: boolean }>;
  availableMembers: Array<{
    userId: string;
    displayName: string;
    email: string;
    previousRounds: PreviousRoundStat[];
  }>;
};

/**
 * Get draft state for a round: whose turn, teams and members, available (unpicked) members with previous-round stats.
 * Only when round is draft. Team leaders use this to see stats and know when it's their turn.
 */
export async function getDraftState(roundId: string, userId: string): Promise<DraftState> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { Club: { select: { id: true, name: true } } },
  });
  if (!round) throw new NotFoundError('Round not found.');
  await ClubService.ensureMember(userId, round.clubId);
  if (round.status !== 'draft') {
    throw new ValidationError('Draft state is only available when the round is in draft.');
  }

  const teams = await prisma.team.findMany({
    where: { roundId },
    orderBy: { createdAt: 'asc' },
    include: {
      Memberships: {
        include: { User: { select: { id: true, displayName: true } } },
      },
    },
  });

  const pickIndex = round.draftPickIndex ?? 0;
  const teamCount = teams.length;
  const currentTeamIdx = snakeTeamIndex(pickIndex, teamCount);
  const currentTeam = currentTeamIdx >= 0 && currentTeamIdx < teamCount ? teams[currentTeamIdx] : null;

  const alreadyPickedUserIds = new Set(
    (await prisma.teamMembership.findMany({ where: { roundId }, select: { userId: true } })).map((m) => m.userId)
  );
  const clubMembers = await prisma.clubMembership.findMany({
    where: { clubId: round.clubId },
    include: { User: { select: { id: true, displayName: true, email: true } } },
  });
  const availableMembers = clubMembers.filter((m) => !alreadyPickedUserIds.has(m.userId));

  const completedRounds = await prisma.round.findMany({
    where: { clubId: round.clubId, status: 'completed' },
    orderBy: { endDate: 'desc' },
    take: PREVIOUS_ROUNDS_LIMIT,
    select: { id: true, name: true },
  });
  const completedRoundIds = completedRounds.map((r) => r.id);
  const roundNameById = new Map(completedRounds.map((r) => [r.id, r.name]));

  const userIds = availableMembers.map((m) => m.userId);
  const userStats =
    userIds.length > 0 && completedRoundIds.length > 0
      ? await prisma.userStats.findMany({
          where: {
            userId: { in: userIds },
            clubId: round.clubId,
            roundId: { in: completedRoundIds },
          },
          select: { userId: true, roundId: true, totalPoints: true, totalWorkouts: true },
        })
      : [];

  const statsByUserAndRound = new Map(userStats.map((s) => [`${s.userId}:${s.roundId}`, s]));

  const availableWithStats = availableMembers.map((m) => {
    const previousRounds: PreviousRoundStat[] = completedRoundIds.map((rid) => {
      const s = statsByUserAndRound.get(`${m.userId}:${rid}`);
      return {
        roundId: rid,
        roundName: roundNameById.get(rid) ?? 'Unknown',
        points: Math.round(s?.totalPoints ?? 0),
        workouts: s?.totalWorkouts ?? 0,
      };
    });
    return {
      userId: m.userId,
      displayName: m.User.displayName ?? '—',
      email: m.User.email ?? '',
      previousRounds,
    };
  });

  const currentUserMembership = await prisma.teamMembership.findUnique({
    where: { userId_roundId: { userId, roundId } },
    select: { teamId: true, isLeader: true },
  });
  const isCurrentUserTurn =
    currentTeam != null &&
    currentUserMembership != null &&
    currentUserMembership.teamId === currentTeam.id &&
    currentUserMembership.isLeader;

  return {
    roundId: round.id,
    roundName: round.name,
    pickNumber: pickIndex,
    currentTeamId: currentTeam?.id ?? null,
    currentTeamName: currentTeam?.name ?? null,
    isCurrentUserTurn: isCurrentUserTurn ?? false,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberIds: t.Memberships.map((m) => m.userId),
      isLeader: t.Memberships.some((m) => m.userId === userId && m.isLeader),
    })),
    availableMembers: availableWithStats,
  };
}

/**
 * Make a draft pick: add the given user to the given team. Only succeeds if it's that team's turn
 * and the caller is admin or the team lead of that team. Increments draftPickIndex after the pick.
 */
export async function makeDraftPick(
  roundId: string,
  teamId: string,
  userIdToAdd: string,
  callerUserId: string
): Promise<{ membership: Awaited<ReturnType<typeof TeamService.addMemberToTeam>> }> {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new NotFoundError('Round not found.');
  const callerMembership = await ClubService.ensureMember(callerUserId, round.clubId);
  if (round.status !== 'draft') {
    throw new ValidationError('Picks can only be made when the round is in draft.');
  }

  const teams = await prisma.team.findMany({
    where: { roundId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const currentTeamIdx = snakeTeamIndex(round.draftPickIndex ?? 0, teams.length);
  const currentTeamId = currentTeamIdx >= 0 && currentTeamIdx < teams.length ? teams[currentTeamIdx].id : null;

  if (currentTeamId !== teamId) {
    throw new ValidationError(
      `It is not this team's turn to pick. Only the team currently on the clock can make a pick.`
    );
  }

  if (callerMembership.role !== 'admin') {
    const callerTeam = await prisma.teamMembership.findUnique({
      where: { userId_roundId: { userId: callerUserId, roundId } },
    });
    if (!callerTeam || callerTeam.teamId !== teamId) {
      throw new AuthorizationError('Only the team lead of the team on the clock (or an admin) can make the pick.');
    }
    const isLeader = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: callerUserId, teamId } },
      select: { isLeader: true },
    });
    if (!isLeader?.isLeader) {
      throw new AuthorizationError('Only the team lead can make the pick for this team.');
    }
  }

  const membership = await TeamService.addMemberToTeam(roundId, teamId, userIdToAdd, callerUserId);

  await prisma.round.update({
    where: { id: roundId },
    data: { draftPickIndex: { increment: 1 } },
  });

  return { membership };
}
