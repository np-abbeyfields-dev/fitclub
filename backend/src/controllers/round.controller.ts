import { Response } from 'express';
import { RoundService } from '../services/round.service';
import { LeaderboardService } from '../services/leaderboard.service';
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
    const name = (body.name || '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Round name is required.' } as ApiResponse);
      return;
    }
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, error: 'Valid startDate and endDate are required.' } as ApiResponse);
      return;
    }
    if (endDate <= startDate) {
      res.status(400).json({ success: false, error: 'endDate must be after startDate.' } as ApiResponse);
      return;
    }
    if (!body.scoringConfig || typeof body.scoringConfig !== 'object') {
      res.status(400).json({ success: false, error: 'scoringConfig object is required.' } as ApiResponse);
      return;
    }
    const round = await RoundService.createRound(clubId, userId, {
      name,
      startDate,
      endDate,
      scoringConfig: body.scoringConfig,
      teamSize: body.teamSize != null ? Number(body.teamSize) : undefined,
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
    res.json({ success: true, data: round, message: 'Round ended.' } as ApiResponse);
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
}
