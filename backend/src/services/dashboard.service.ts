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
        myTeamName: null,
        myRoundPoints: 0,
        myTeamTotal: 0,
        workoutCount: 0,
        weeklyActivity: [],
        currentStreak: 0,
        estimatedCalories: 0,
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

    const myRoundPoints = userPointsMap.get(userId) ?? 0;
    const myTeamTotal = myTeamId ? teamSums.find((t) => t.teamId === myTeamId)?.total ?? 0 : 0;

    const workoutCount = await prisma.workout.count({
      where: { userId, roundId: activeRound.id },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const ledgerRows = await prisma.scoreLedger.findMany({
      where: {
        userId,
        roundId: activeRound.id,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, finalAwardedPoints: true },
    });
    const pointsByDay = new Map<string, number>();
    for (const row of ledgerRows) {
      const key = new Date(row.createdAt).toISOString().slice(0, 10);
      pointsByDay.set(key, (pointsByDay.get(key) ?? 0) + row.finalAwardedPoints);
    }
    const workoutsLast7Days = await prisma.workout.findMany({
      where: {
        userId,
        roundId: activeRound.id,
        loggedAt: { gte: sevenDaysAgo },
      },
      select: { loggedAt: true },
    });
    const workoutCountByDay = new Map<string, number>();
    for (const w of workoutsLast7Days) {
      const key = new Date(w.loggedAt).toISOString().slice(0, 10);
      workoutCountByDay.set(key, (workoutCountByDay.get(key) ?? 0) + 1);
    }
    const weeklyActivity: Array<{ date: string; points: number; workoutCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      weeklyActivity.push({
        date: dateStr,
        points: Math.round(pointsByDay.get(dateStr) ?? 0),
        workoutCount: workoutCountByDay.get(dateStr) ?? 0,
      });
    }

    const workoutDays = await prisma.workout.findMany({
      where: { userId, roundId: activeRound.id },
      select: { loggedAt: true },
    });
    const daySet = new Set(
      workoutDays.map((w) => new Date(w.loggedAt).toISOString().slice(0, 10))
    );
    let currentStreak = 0;
    const checkDate = new Date();
    for (;;) {
      const key = checkDate.toISOString().slice(0, 10);
      if (!daySet.has(key)) break;
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const userWorkoutsForCalories = await prisma.workout.findMany({
      where: { userId, roundId: activeRound.id },
      select: { durationMinutes: true },
    });
    const estimatedCalories = userWorkoutsForCalories.reduce(
      (sum, w) => sum + (w.durationMinutes ?? 0) * 6,
      0
    );

    return {
      activeRound: {
        id: activeRound.id,
        name: activeRound.name,
        startDate: activeRound.startDate,
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
      myRoundPoints: Math.round(myRoundPoints),
      myTeamTotal: Math.round(myTeamTotal),
      workoutCount,
      weeklyActivity,
      currentStreak,
      estimatedCalories,
    };
  }
}
