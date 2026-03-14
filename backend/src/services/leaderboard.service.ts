import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';
import { ClubService } from './club.service';
import { CustomChallengeService } from './customChallenge.service';

export class LeaderboardService {
  /**
   * Get leaderboard for a round: individuals (by user points) or teams (by team total).
   * Points = workout (ScoreLedger) + custom challenge completions.
   */
  static async getLeaderboard(roundId: string, userId: string, type: 'individuals' | 'teams') {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError('Round not found.');
    await ClubService.ensureMember(userId, round.clubId);

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

    if (type === 'individuals') {
      const userIds = Array.from(userPointsMap.keys());
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u.displayName]));
      const entries = userIds
        .map((uid) => ({
          id: uid,
          name: userMap.get(uid) ?? 'Unknown',
          points: userPointsMap.get(uid) ?? 0,
          isCurrentUser: uid === userId,
        }))
        .sort((a, b) => b.points - a.points);
      const maxPoints = entries.length ? Math.max(...entries.map((e) => e.points)) : 0;
      return entries.map((e, i) => ({
        id: e.id,
        rank: i + 1,
        name: e.name,
        points: Math.round(e.points),
        maxPoints,
        isCurrentUser: e.isCurrentUser,
      }));
    }

    const teams = await prisma.team.findMany({
      where: { roundId },
      include: { Memberships: true },
    });
    const teamTotals = teams.map((t) => {
      const total = t.Memberships.reduce((sum, m) => sum + (userPointsMap.get(m.userId) ?? 0), 0);
      return { id: t.id, name: t.name, total, hasCurrentUser: t.Memberships.some((m) => m.userId === userId) };
    });
    teamTotals.sort((a, b) => b.total - a.total);
    const maxPoints = teamTotals.length ? Math.max(...teamTotals.map((t) => t.total)) : 0;
    return teamTotals.map((t, i) => ({
      id: t.id,
      rank: i + 1,
      name: t.name,
      points: Math.round(t.total),
      maxPoints,
      isCurrentUser: t.hasCurrentUser,
    }));
  }
}
