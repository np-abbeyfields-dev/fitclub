import prisma from '../config/database';
import { ClubService } from './club.service';

function getDailyCap(round: { scoringConfig: unknown }): number {
  try {
    const config = round.scoringConfig as { dailyCap?: number };
    return typeof config?.dailyCap === 'number' ? config.dailyCap : 100;
  } catch {
    return 100;
  }
}

export class DashboardService {
  /**
   * Returns dashboard for a club: active round, teams with points, member count,
   * recent workouts, today's points for current user, daily cap.
   */
  static async getDashboard(clubId: string, userId: string) {
    await ClubService.ensureMember(userId, clubId);

    const rounds = await prisma.round.findMany({
      where: { clubId, status: 'active' },
      take: 1,
      orderBy: { startDate: 'desc' },
    });
    const activeRound = rounds[0] ?? null;

    const membersCount = await prisma.clubMembership.count({ where: { clubId } });

    if (!activeRound) {
      return {
        activeRound: null,
        membersCount,
        teams: [],
        topTeams: [],
        recentWorkouts: [],
        todayPoints: 0,
        dailyCap: 100,
        myTeamRank: null,
      };
    }

    const dailyCap = getDailyCap(activeRound);

    const teams = await prisma.team.findMany({
      where: { roundId: activeRound.id },
      include: { Memberships: { include: { User: { select: { id: true, displayName: true } } } } },
    });

    const scoreByUser = await prisma.scoreLedger.groupBy({
      by: ['userId'],
      where: { roundId: activeRound.id },
      _sum: { finalAwardedPoints: true },
    });
    const userPointsMap = new Map(scoreByUser.map((s) => [s.userId, s._sum.finalAwardedPoints ?? 0]));

    const teamSums = teams.map((t) => {
      const total = t.Memberships.reduce((sum, m) => sum + (userPointsMap.get(m.userId) ?? 0), 0);
      return { teamId: t.id, teamName: t.name, total };
    });
    teamSums.sort((a, b) => b.total - a.total);
    const topTeams = teamSums.slice(0, 10).map((t, i) => ({ rank: i + 1, teamName: t.teamName, points: Math.round(t.total) }));

    const myMembership = await prisma.teamMembership.findUnique({
      where: { userId_roundId: { userId, roundId: activeRound.id } },
      include: { Team: true },
    });
    const myTeamId = myMembership?.teamId ?? null;
    let myTeamRank: number | null = null;
    if (myTeamId) {
      const idx = teamSums.findIndex((t) => t.teamId === myTeamId);
      if (idx >= 0) myTeamRank = idx + 1;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayScores = await prisma.scoreLedger.aggregate({
      where: {
        userId,
        roundId: activeRound.id,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      _sum: { finalAwardedPoints: true },
    });
    const todayPoints = todayScores._sum.finalAwardedPoints ?? 0;

    const recentWorkouts = await prisma.workout.findMany({
      where: { roundId: activeRound.id },
      include: { User: { select: { id: true, displayName: true } } },
      orderBy: { loggedAt: 'desc' },
      take: 10,
    });
    const workoutIds = recentWorkouts.map((w) => w.id);
    const pointsByWorkout = workoutIds.length
      ? await prisma.scoreLedger.findMany({
          where: { workoutId: { in: workoutIds } },
          select: { workoutId: true, finalAwardedPoints: true },
        })
      : [];
    const pointsMap = new Map(pointsByWorkout.map((p) => [p.workoutId, p.finalAwardedPoints]));

    return {
      activeRound: {
        id: activeRound.id,
        name: activeRound.name,
        endDate: activeRound.endDate,
        daysLeft: Math.max(0, Math.ceil((new Date(activeRound.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      },
      membersCount,
      teams: teamSums.map((t) => ({ id: t.teamId, name: t.teamName, points: Math.round(t.total) })),
      topTeams,
      recentWorkouts: recentWorkouts.map((w) => ({
        id: w.id,
        activityName: w.activityType,
        points: Math.round(pointsMap.get(w.id) ?? 0),
        createdAt: w.loggedAt.toISOString(),
        userName: w.User.id === userId ? 'You' : w.User.displayName,
      })),
      todayPoints: Math.round(todayPoints),
      dailyCap,
      myTeamRank,
      myTeamName: myMembership?.Team.name ?? null,
    };
  }
}
