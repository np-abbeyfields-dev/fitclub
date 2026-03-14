import { Response } from 'express';
import { RoundService } from '../services/round.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { logWorkout, listWorkoutsForUserInRound } from '../services/workout.service';
import { getDraftState, makeDraftPick } from '../services/draft.service';
import { AuthRequest, ApiResponse } from '../types';

function param(req: AuthRequest, key: string): string | undefined {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

export class RoundController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = param(req, 'clubId');
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const body = req.body || {};
    const sourceRoundId = typeof body.sourceRoundId === 'string' ? body.sourceRoundId.trim() : undefined;
    const copyTeams = body.copyTeams === true;

    const name = (body.name || '').trim();
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    const scoringConfig = body.scoringConfig && typeof body.scoringConfig === 'object' ? body.scoringConfig : undefined;

    if (!sourceRoundId) {
      if (!name) {
        res.status(400).json({ success: false, error: 'Round name is required.' } as ApiResponse);
        return;
      }
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ success: false, error: 'Valid startDate and endDate are required.' } as ApiResponse);
        return;
      }
      if (endDate <= startDate) {
        res.status(400).json({ success: false, error: 'endDate must be after startDate.' } as ApiResponse);
        return;
      }
      if (!scoringConfig) {
        res.status(400).json({ success: false, error: 'scoringConfig object is required.' } as ApiResponse);
        return;
      }
    } else if (startDate !== undefined && endDate !== undefined) {
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid startDate or endDate.' } as ApiResponse);
        return;
      }
      if (endDate <= startDate) {
        res.status(400).json({ success: false, error: 'endDate must be after startDate.' } as ApiResponse);
        return;
      }
    }

    const round = await RoundService.createRound(clubId, userId, {
      name: name || undefined,
      startDate,
      endDate,
      scoringConfig,
      teamSize: body.teamSize != null ? Number(body.teamSize) : undefined,
      sourceRoundId,
      copyTeams,
    });
    res.status(201).json({ success: true, data: round, message: 'Round created.' } as ApiResponse);
  }

  static async listByClub(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = param(req, 'clubId');
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const rounds = await RoundService.listRoundsByClub(clubId, userId);
    res.json({ success: true, data: rounds } as ApiResponse);
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const round = await RoundService.getRound(roundId, userId);
    res.json({ success: true, data: round } as ApiResponse);
  }

  static async activate(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const round = await RoundService.activateRound(roundId, userId);
    res.json({ success: true, data: round, message: 'Round activated.' } as ApiResponse);
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.startDate !== undefined) data.startDate = body.startDate;
    if (body.endDate !== undefined) data.endDate = body.endDate;
    if (body.scoringConfig !== undefined) data.scoringConfig = body.scoringConfig;
    if (body.teamSize !== undefined) data.teamSize = body.teamSize;
    if (body.scheduledStartAt !== undefined) data.scheduledStartAt = body.scheduledStartAt;
    const round = await RoundService.updateRound(roundId, userId, data as any);
    res.json({ success: true, data: round, message: 'Round updated.' } as ApiResponse);
  }

  static async end(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const round = await RoundService.endRound(roundId, userId);
    res.json({ success: true, data: round, message: 'Round completed.' } as ApiResponse);
  }

  static async getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const type = (req.query?.type === 'teams' ? 'teams' : 'individuals') as 'individuals' | 'teams';
    const data = await LeaderboardService.getLeaderboard(roundId, userId, type);
    res.json({ success: true, data } as ApiResponse);
  }

  /** GET /rounds/:roundId/summary — round wrap-up / summary (Phase 4). */
  static async getRoundSummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const data = await RoundService.getRoundSummary(roundId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  /** POST /rounds/:roundId/workouts — log workout, create Workout + ScoreLedger (FITCLUB_MASTER_SPEC §6.3). */
  static async logWorkout(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const body = req.body || {};
    if (body.workoutMasterId == null) {
      res.status(400).json({ success: false, error: 'workoutMasterId is required.' } as ApiResponse);
      return;
    }
    const result = await logWorkout(roundId, userId, {
      workoutMasterId: Number(body.workoutMasterId),
      durationMinutes: body.durationMinutes,
      distanceKm: body.distanceKm,
      heartRate: body.heartRate,
      proofUrl: body.proofUrl,
      note: body.note,
      loggedAt: body.loggedAt,
    });
    res.status(201).json({ success: true, data: { id: result.id, points: result.points } } as ApiResponse);
  }

  /** GET /rounds/:roundId/draft-state — snake draft: whose turn, teams, available members with previous-round stats. */
  static async getDraftState(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const data = await getDraftState(roundId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  /** GET /rounds/:roundId/users/:userId/workouts — list workouts for a member in the round (same-club only). */
  static async listMemberWorkouts(req: AuthRequest, res: Response): Promise<void> {
    const callerUserId = req.user!.id;
    const roundId = param(req, 'roundId');
    const targetUserId = param(req, 'userId');
    if (!roundId || !targetUserId) {
      res.status(400).json({ success: false, error: 'Round ID and user ID required.' } as ApiResponse);
      return;
    }
    const limit = req.query?.limit != null ? Math.min(Number(req.query.limit), 100) : 50;
    const data = await listWorkoutsForUserInRound(roundId, targetUserId, callerUserId, limit);
    res.json({ success: true, data } as ApiResponse);
  }

  /** POST /rounds/:roundId/draft-pick — snake draft: team on the clock picks a member. Body: { teamId, userId }. */
  static async makeDraftPick(req: AuthRequest, res: Response): Promise<void> {
    const callerUserId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const teamId = typeof req.body?.teamId === 'string' ? req.body.teamId.trim() : '';
    const userIdToAdd = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (!teamId || !userIdToAdd) {
      res.status(400).json({ success: false, error: 'teamId and userId are required.' } as ApiResponse);
      return;
    }
    const { membership } = await makeDraftPick(roundId, teamId, userIdToAdd, callerUserId);
    res.status(201).json({ success: true, data: membership, message: 'Member picked.' } as ApiResponse);
  }
}
