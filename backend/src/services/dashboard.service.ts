import prisma from '../config/database';
import { ClubService } from './club.service';
import { CustomChallengeService } from './customChallenge.service';

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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const rounds = await prisma.round.findMany({
      where: {
        clubId,
        status: 'active',
        endDate: { gte: startOfToday },
      },
      take: 1,
      orderBy: { startDate: 'desc' },
    });
    const activeRound = rounds[0] ?? null;

    const membersCount = await prisma.clubMembership.count({ where: { clubId } });

    if (!activeRound) {
      const lastCompleted = await prisma.round.findFirst({
        where: {
          clubId,
          OR: [
            { status: 'completed' },
            { status: 'active', endDate: { lt: startOfToday } },
          ],
        },
        orderBy: { endDate: 'desc' },
      });
      let lastCompletedRoundRecap: {
        roundId: string;
        roundName: string;
        winningTeamName: string;
        winningTeamPoints: number;
        topTeams: Array<{ rank: number; teamName: string; points: number }>;
        myTeamName: string | null;
        myTeamRank: number | null;
        myTeamPoints: number | null;
        myPoints: number;
        myWorkoutCount: number;
        contributionPercent: number;
      } | null = null;

      if (lastCompleted) {
        const roundId = lastCompleted.id;
        const workoutScores = await prisma.scoreLedger.groupBy({
          by: ['userId'],
          where: { roundId },
          _sum: { finalAwardedPoints: true },
        });
        const customPointsMap = await CustomChallengeService.sumPointsByUserForRound(roundId);
        const userPointsMap = new Map<string, number>();
        for (const s of workoutScores) {
          userPointsMap.set(s.userId, (s._sum.finalAwardedPoints ?? 0) + (customPointsMap.get(s.userId) ?? 0));
        }
        for (const [uid, pts] of customPointsMap) {
          if (!userPointsMap.has(uid)) userPointsMap.set(uid, pts);
        }

        const teams = await prisma.team.findMany({
          where: { roundId },
          include: { Memberships: true },
        });
        const teamTotals = teams
          .map((t) => ({
            teamId: t.id,
            teamName: t.name,
            total: t.Memberships.reduce((sum, m) => sum + (userPointsMap.get(m.userId) ?? 0), 0),
          }))
          .sort((a, b) => b.total - a.total);

        const topTeams = teamTotals.slice(0, 3).map((t, i) => ({
          rank: i + 1,
          teamName: t.teamName,
          points: Math.round(t.total),
        }));
        const winner = teamTotals[0];
        const myMembership = await prisma.teamMembership.findUnique({
          where: { userId_roundId: { userId, roundId } },
          include: { Team: true },
        });
        let myTeamName: string | null = null;
        let myTeamRank: number | null = null;
        let myTeamPoints: number | null = null;
        if (myMembership) {
          myTeamName = myMembership.Team.name;
          const idx = teamTotals.findIndex((t) => t.teamId === myMembership.teamId);
          if (idx >= 0) {
            myTeamRank = idx + 1;
            myTeamPoints = Math.round(teamTotals[idx].total);
          }
        }
        const myPoints = Math.round(userPointsMap.get(userId) ?? 0);
        const myWorkoutCount = await prisma.workout.count({
          where: { userId, roundId },
        });
        const contributionPercent =
          myTeamPoints != null && myTeamPoints > 0 ? Math.round((myPoints / myTeamPoints) * 100) : 0;

        lastCompletedRoundRecap = {
          roundId,
          roundName: lastCompleted.name,
          winningTeamName: winner?.teamName ?? '—',
          winningTeamPoints: winner ? Math.round(winner.total) : 0,
          topTeams,
          myTeamName,
          myTeamRank,
          myTeamPoints,
          myPoints,
          myWorkoutCount,
          contributionPercent,
        };
      }

      return {
        activeRound: null,
        membersCount,
        teams: [],
        topTeams: [],
        recentWorkouts: [],
        todayPoints: 0,
        teamPointsToday: 0,
        topContributorsToday: [],
        dailyCap: 100,
        myTeamRank: null,
        myTeamName: null,
        myRoundPoints: 0,
        myTeamTotal: 0,
        workoutCount: 0,
        weeklyActivity: [],
        currentStreak: 0,
        estimatedCalories: 0,
        lastCompletedRoundRecap,
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
    const customPointsMap = await CustomChallengeService.sumPointsByUserForRound(activeRound.id);
    const userPointsMap = new Map<string, number>();
    for (const s of scoreByUser) {
      userPointsMap.set(s.userId, (s._sum.finalAwardedPoints ?? 0) + (customPointsMap.get(s.userId) ?? 0));
    }
    for (const [uid, pts] of customPointsMap) {
      if (!userPointsMap.has(uid)) userPointsMap.set(uid, pts);
    }

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
    const todayKey = todayStart.toISOString().slice(0, 10);
    const todayCustomCompletions = await prisma.customChallengeCompletion.aggregate({
      where: {
        userId,
        roundId: activeRound.id,
        completionDate: todayKey,
      },
      _sum: { pointsAwarded: true },
    });
    const todayPoints = (todayScores._sum.finalAwardedPoints ?? 0) + (todayCustomCompletions._sum.pointsAwarded ?? 0);

    let teamPointsToday = 0;
    let teamUserIds: string[] = [];
    if (myTeamId) {
      const teamMemberRows = await prisma.teamMembership.findMany({
        where: { roundId: activeRound.id, teamId: myTeamId },
        select: { userId: true },
      });
      teamUserIds = teamMemberRows.map((m) => m.userId);
      if (teamUserIds.length > 0) {
        const teamTodayLedger = await prisma.scoreLedger.aggregate({
          where: {
            roundId: activeRound.id,
            createdAt: { gte: todayStart, lt: todayEnd },
            userId: { in: teamUserIds },
          },
          _sum: { finalAwardedPoints: true },
        });
        const teamTodayCustom = await prisma.customChallengeCompletion.aggregate({
          where: {
            roundId: activeRound.id,
            completionDate: todayKey,
            userId: { in: teamUserIds },
          },
          _sum: { pointsAwarded: true },
        });
        teamPointsToday =
          (teamTodayLedger._sum.finalAwardedPoints ?? 0) + (teamTodayCustom._sum.pointsAwarded ?? 0);
      }
    }

    let topContributorsToday: Array<{ displayName: string; points: number }> = [];
    if (myTeamId && teamUserIds.length > 0) {
      const todayLedgerByUser = await prisma.scoreLedger.groupBy({
        by: ['userId'],
        where: {
          roundId: activeRound.id,
          createdAt: { gte: todayStart, lt: todayEnd },
          userId: { in: teamUserIds },
        },
        _sum: { finalAwardedPoints: true },
      });
      const todayCustomByUser = await prisma.customChallengeCompletion.findMany({
        where: {
          roundId: activeRound.id,
          completionDate: todayKey,
          userId: { in: teamUserIds },
        },
        select: { userId: true, pointsAwarded: true },
      });
      const pointsByUser = new Map<string, number>();
      for (const row of todayLedgerByUser) {
        pointsByUser.set(row.userId, (row._sum.finalAwardedPoints ?? 0) + (pointsByUser.get(row.userId) ?? 0));
      }
      for (const row of todayCustomByUser) {
        pointsByUser.set(row.userId, (pointsByUser.get(row.userId) ?? 0) + row.pointsAwarded);
      }
      const users = await prisma.user.findMany({
        where: { id: { in: teamUserIds } },
        select: { id: true, displayName: true },
      });
      const nameMap = new Map(users.map((u) => [u.id, u.displayName ?? 'Unknown']));
      topContributorsToday = Array.from(pointsByUser.entries())
        .map(([uid, pts]) => ({
          displayName: uid === userId ? 'You' : nameMap.get(uid) ?? 'Unknown',
          points: Math.round(pts),
        }))
        .filter((c) => c.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);
    }

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
    const customCompletionsLast7 = await prisma.customChallengeCompletion.findMany({
      where: {
        userId,
        roundId: activeRound.id,
        completionDate: { gte: sevenDaysAgo.toISOString().slice(0, 10) },
      },
      select: { completionDate: true, pointsAwarded: true },
    });
    for (const c of customCompletionsLast7) {
      pointsByDay.set(c.completionDate, (pointsByDay.get(c.completionDate) ?? 0) + c.pointsAwarded);
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
      teamPointsToday: Math.round(teamPointsToday),
      topContributorsToday,
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
