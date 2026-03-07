import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';
import { ClubService } from './club.service';

/**
 * GET /clubs/:clubId/rounds/:roundId/stats/me — current user's stats for the round (FITCLUB_MASTER_SPEC §7.8).
 * Uses UserStats if present, otherwise derives from ScoreLedger + Workout.
 */
export async function getStatsMe(clubId: string, roundId: string, userId: string) {
  await ClubService.ensureMember(userId, clubId);
  const round = await prisma.round.findUnique({ where: { id: roundId, clubId } });
  if (!round) throw new NotFoundError('Round not found.');

  const userStats = await prisma.userStats.findUnique({
    where: { userId_clubId_roundId: { userId, clubId, roundId } },
  });
  if (userStats) {
    return {
      totalPoints: Math.round(userStats.totalPoints),
      totalWorkouts: userStats.totalWorkouts,
      totalCalories: Math.round(userStats.totalCalories),
      streakDays: userStats.streakDays,
    };
  }

  const score = await prisma.scoreLedger.aggregate({
    where: { userId, roundId },
    _sum: { finalAwardedPoints: true },
    _count: true,
  });
  const workoutCount = await prisma.workout.count({ where: { userId, roundId } });
  const workouts = await prisma.workout.findMany({
    where: { userId, roundId },
    select: { durationMinutes: true },
  });
  const totalCalories = workouts.reduce((s, w) => s + (w.durationMinutes ?? 0) * 6, 0);
  const workoutDays = await prisma.workout.findMany({
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

  return {
    totalPoints: Math.round(score._sum.finalAwardedPoints ?? 0),
    totalWorkouts: workoutCount,
    totalCalories: Math.round(totalCalories),
    streakDays,
  };
}

/**
 * GET /teams/:teamId/stats — team stats for the round (FITCLUB_MASTER_SPEC §7.8).
 */
export async function getTeamStats(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { Round: true, Memberships: true },
  });
  if (!team) throw new NotFoundError('Team not found.');
  await ClubService.ensureMember(userId, team.Round.clubId);

  const teamStats = await prisma.teamStats.findUnique({
    where: { teamId_roundId: { teamId, roundId: team.roundId } },
  });
  if (teamStats) {
    return {
      teamId: team.id,
      teamName: team.name,
      roundId: team.roundId,
      totalPoints: Math.round(teamStats.totalPoints),
      totalWorkouts: teamStats.totalWorkouts,
      memberCount: teamStats.memberCount,
    };
  }

  const userIds = team.Memberships.map((m) => m.userId);
  const scores = await prisma.scoreLedger.groupBy({
    by: ['userId'],
    where: { roundId: team.roundId, userId: { in: userIds } },
    _sum: { finalAwardedPoints: true },
    _count: true,
  });
  const totalPoints = scores.reduce((s, x) => s + (x._sum.finalAwardedPoints ?? 0), 0);
  const totalWorkouts = scores.reduce((s, x) => s + (x._count ?? 0), 0);
  return {
    teamId: team.id,
    teamName: team.name,
    roundId: team.roundId,
    totalPoints: Math.round(totalPoints),
    totalWorkouts,
    memberCount: team.Memberships.length,
  };
}

/**
 * GET /clubs/:clubId/stats/overview — high-level club stats (FITCLUB_MASTER_SPEC §7.8).
 */
export async function getClubStatsOverview(clubId: string, userId: string) {
  await ClubService.ensureMember(userId, clubId);
  const membersCount = await prisma.clubMembership.count({ where: { clubId } });
  const activeRound = await prisma.round.findFirst({
    where: { clubId, status: 'active' },
    orderBy: { startDate: 'desc' },
  });
  const roundsCount = await prisma.round.count({ where: { clubId } });
  return {
    membersCount,
    activeRoundId: activeRound?.id ?? null,
    activeRoundName: activeRound?.name ?? null,
    roundsCount,
  };
}
