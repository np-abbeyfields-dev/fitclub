import { Response } from 'express';
import { CustomChallengeService } from '../services/customChallenge.service';
import { AuthRequest, ApiResponse } from '../types';

export class CustomChallengeController {
  /** GET /rounds/:roundId/custom-challenges */
  static async listByRound(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = Array.isArray(req.params.roundId) ? req.params.roundId[0] : req.params.roundId;
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const data = await CustomChallengeService.listByRound(roundId, userId);
    res.json({ success: true, data } as ApiResponse);
  }

  /** POST /rounds/:roundId/custom-challenges. Body: { name, description?, icon?, pointsAwarded }. */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = Array.isArray(req.params.roundId) ? req.params.roundId[0] : req.params.roundId;
    if (!roundId) {
      res.status(400).json({ success: false, error: 'Round ID required.' } as ApiResponse);
      return;
    }
    const body = req.body || {};
    const data = await CustomChallengeService.create(roundId, userId, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      pointsAwarded: body.pointsAwarded,
    });
    res.status(201).json({ success: true, data, message: 'Custom challenge created.' } as ApiResponse);
  }

  /** PATCH /custom-challenges/:id */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Challenge ID required.' } as ApiResponse);
      return;
    }
    const body = req.body || {};
    const data = await CustomChallengeService.update(id, userId, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      pointsAwarded: body.pointsAwarded,
    });
    res.json({ success: true, data, message: 'Custom challenge updated.' } as ApiResponse);
  }

  /** DELETE /custom-challenges/:id */
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Challenge ID required.' } as ApiResponse);
      return;
    }
    await CustomChallengeService.delete(id, userId);
    res.json({ success: true, message: 'Custom challenge deleted.' } as ApiResponse);
  }

  /** POST /custom-challenges/:id/complete. Body: { date? } (YYYY-MM-DD). */
  static async complete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Challenge ID required.' } as ApiResponse);
      return;
    }
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const data = await CustomChallengeService.complete(id, userId, date);
    res.status(201).json({ success: true, data } as ApiResponse);
  }

  /** POST /custom-challenges/:id/uncomplete. Body: { date? }. */
  static async uncomplete(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Challenge ID required.' } as ApiResponse);
      return;
    }
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    await CustomChallengeService.uncomplete(id, userId, date);
    res.json({ success: true, message: 'Completion removed.' } as ApiResponse);
  }
}
