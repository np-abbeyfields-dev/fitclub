import { Response } from 'express';
import { ClubService } from '../services/club.service';
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

  static async listMine(req: AuthRequest, res: Response): Promise<void> {
    const clubs = await ClubService.listMyClubs(req.user!.id);
    res.json({ success: true, data: clubs } as ApiResponse);
  }
}
