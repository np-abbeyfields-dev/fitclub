import { Response } from 'express';
import { ClubService } from '../services/club.service';
import { DashboardService } from '../services/dashboard.service';
import * as StatsService from '../services/stats.service';
import * as FeedService from '../services/feed.service';
import { AuthRequest, ApiResponse } from '../types';

export class ClubController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const name = (req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'Club name is required.' } as ApiResponse);
      return;
    }
    const club = await ClubService.createClub(userId, name);
    res.status(201).json({ success: true, data: club, message: 'Club created.' } as ApiResponse);
  }

  static async join(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const inviteCode = req.body?.inviteCode || req.body?.invite_code || '';
    if (!inviteCode) {
      res.status(400).json({ success: false, error: 'Invite code is required.' } as ApiResponse);
      return;
    }
    const membership = await ClubService.joinByInviteCode(userId, inviteCode);
    res.status(201).json({ success: true, data: membership, message: 'Joined club.' } as ApiResponse);
  }

  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const data = await DashboardService.getDashboard(clubId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const club = await ClubService.getClub(clubId, req.user!.id);
    res.json({ success: true, data: club } as ApiResponse);
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ success: false, error: 'Club name is required.' } as ApiResponse);
      return;
    }
    const club = await ClubService.updateClub(clubId, userId, { name });
    res.json({ success: true, data: club, message: 'Club updated.' } as ApiResponse);
  }

  static async listMine(req: AuthRequest, res: Response): Promise<void> {
    const clubs = await ClubService.listMyClubs(req.user!.id);
    res.json({ success: true, data: clubs } as ApiResponse);
  }

  static async setMemberRole(req: AuthRequest, res: Response): Promise<void> {
    const adminUserId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!clubId || !userId) {
      res.status(400).json({ success: false, error: 'Club ID and user ID required.' } as ApiResponse);
      return;
    }
    const role = req.body?.role;
    if (role !== 'admin' && role !== 'team_lead' && role !== 'member') {
      res.status(400).json({ success: false, error: 'role must be "admin", "team_lead", or "member".' } as ApiResponse);
      return;
    }
    const membership = await ClubService.setMemberRole(clubId, adminUserId, userId, role);
    res.json({ success: true, data: membership, message: 'Member role updated.' } as ApiResponse);
  }

  static async listMembers(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const search = typeof req.query?.search === 'string' ? req.query.search : undefined;
    const activeRoundId = typeof req.query?.activeRoundId === 'string' ? req.query.activeRoundId : undefined;
    const members = await ClubService.listMembers(clubId, userId, { search, activeRoundId });
    res.json({ success: true, data: members } as ApiResponse);
  }

  static async removeMember(req: AuthRequest, res: Response): Promise<void> {
    const adminUserId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!clubId || !userId) {
      res.status(400).json({ success: false, error: 'Club ID and user ID required.' } as ApiResponse);
      return;
    }
    await ClubService.removeMember(clubId, adminUserId, userId);
    res.json({ success: true, message: 'Member removed.' } as ApiResponse);
  }

  /** GET /clubs/:clubId/rounds/:roundId/stats/me — current user stats for round (§7.8). */
  static async getStatsMe(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    const roundId = Array.isArray(req.params.roundId) ? req.params.roundId[0] : req.params.roundId;
    if (!clubId || !roundId) {
      res.status(400).json({ success: false, error: 'Club ID and round ID required.' } as ApiResponse);
      return;
    }
    const data = await StatsService.getStatsMe(clubId, roundId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  /** GET /clubs/:clubId/stats/overview — club stats overview (§7.8). */
  static async getStatsOverview(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const data = await StatsService.getClubStatsOverview(clubId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  /** POST /clubs/:clubId/invite — any member sends invite email. Body: { email }. */
  static async inviteByEmail(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    if (!email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required.' } as ApiResponse);
      return;
    }
    const result = await ClubService.sendInviteByEmail(clubId, userId, email);
    if (result.sent) {
      res.status(200).json({ success: true, message: 'Invite sent.' } as ApiResponse);
    } else {
      res.status(502).json({ success: false, error: result.error || 'Failed to send invite email.' } as ApiResponse);
    }
  }

  /** GET /clubs/:clubId/feed — activity feed (§7.9). */
  static async getFeed(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
    if (!clubId) {
      res.status(400).json({ success: false, error: 'Club ID required.' } as ApiResponse);
      return;
    }
    const before = typeof req.query?.before === 'string' ? req.query.before : undefined;
    const limit = req.query?.limit != null ? Number(req.query.limit) : undefined;
    const data = await FeedService.getClubFeed(clubId, userId, { before, limit });
    res.json({ success: true, data } as ApiResponse);
  }
}
