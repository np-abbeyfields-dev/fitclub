import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { upsertPushToken } from '../services/user.service';

export class UserController {
  /** Register push notification token for the current user. */
  static async registerPushToken(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const token = (req.body?.token ?? '').trim();
    const platform = (req.body?.platform ?? '').trim() || undefined; // ios | android

    if (!token) {
      res.status(400).json({ success: false, error: 'Token is required.' } as ApiResponse);
      return;
    }

    await upsertPushToken(userId, token, platform);
    res.status(200).json({ success: true, message: 'Push token registered.' } as ApiResponse);
  }
}
