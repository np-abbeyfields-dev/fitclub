import { Response } from 'express';
import { TeamService } from '../services/team.service';
import * as StatsService from '../services/stats.service';
import { AuthRequest, ApiResponse } from '../types';

function param(req: AuthRequest, key: string): string | undefined {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

export class TeamController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const name = (req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Team name is required.' } as ApiResponse);
      return;
    }
    const team = await TeamService.createTeam(roundId, userId, name);
    res.status(201).json({ success: true, data: team, message: 'Team created.' } as ApiResponse);
  }

  static async listByRound(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const teams = await TeamService.listTeamsByRound(roundId, userId);
    res.json({ success: true, data: teams } as ApiResponse);
  }

  static async addMember(req: AuthRequest, res: Response): Promise<void> {
    const callerUserId = req.user!.id;
    const roundId = param(req, 'roundId');
    const teamId = param(req, 'teamId');
    if (!roundId || !teamId) {
      res.status(400).json({ success: false, error: 'Round ID and team ID required.' } as ApiResponse);
      return;
    }
    const userIdToAdd = (req.body?.userId || req.body?.user_id || '').trim();
    if (!userIdToAdd) {
      res.status(400).json({ success: false, error: 'userId is required.' } as ApiResponse);
      return;
    }
    const membership = await TeamService.addMemberToTeam(roundId, teamId, userIdToAdd, callerUserId);
    res.status(201).json({ success: true, data: membership, message: 'Member added to team.' } as ApiResponse);
  }

  static async removeMember(req: AuthRequest, res: Response): Promise<void> {
    const callerUserId = req.user!.id;
    const roundId = param(req, 'roundId');
    const teamId = param(req, 'teamId');
    const userId = param(req, 'userId');
    if (!roundId || !teamId || !userId) {
      res.status(400).json({ success: false, error: 'Round ID, team ID, and user ID required.' } as ApiResponse);
      return;
    }
    await TeamService.removeMemberFromTeam(roundId, teamId, userId, callerUserId);
    res.json({ success: true, message: 'Member removed from team.' } as ApiResponse);
  }

  static async getTeamSummary(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    const teamId = param(req, 'teamId');
    if (!roundId || !teamId) {
      res.status(400).json({ success: false, error: 'Round ID and team ID required.' } as ApiResponse);
      return;
    }
    const data = await TeamService.getTeamSummary(roundId, teamId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  static async getMyTeam(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = param(req, 'roundId');
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const data = await TeamService.getMyTeamSummary(roundId, userId);
    if (!data) {
      res.status(404).json({ success: false, error: 'You are not in a team for this round.' } as ApiResponse);
      return;
    }
    res.json({ success: true, data } as ApiResponse);
  }

  /** GET /rounds/:roundId/teams/:teamId/stats — team stats for round (§7.8). */
  static async getTeamStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const teamId = param(req, 'teamId');
    if (!teamId) {
      res.status(400).json({ success: false, error: 'Team ID required.' } as ApiResponse);
      return;
    }
    const data = await StatsService.getTeamStats(teamId, userId);
    res.json({ success: true, data } as ApiResponse);
  }
}
