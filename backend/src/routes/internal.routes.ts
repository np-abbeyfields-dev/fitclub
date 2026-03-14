import { Request, Response, Router } from 'express';
import { env } from '../config/env';
import { RoundService } from '../services/round.service';
// BETA_MMR: remove import and route when dropping MMR sync
import { runMMRSync } from '../services/beta-mmr/mmr-sync.service';

/**
 * Internal/cron routes. When CRON_SECRET is set, requests must send
 * Authorization: Bearer <CRON_SECRET>.
 */
function cronAuth(req: Request, res: Response, next: () => void): void {
  if (!env.cronSecret) {
    res.status(503).json({ success: false, error: 'Cron not configured.' });
    return;
  }
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== env.cronSecret) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }
  next();
}

async function activateScheduledRoundsHandler(_req: Request, res: Response): Promise<void> {
  const result = await RoundService.activateScheduledRounds();
  res.json({ success: true, ...result });
}

// BETA_MMR: remove handler and route when dropping MMR sync
async function importMMRWorkoutsHandler(_req: Request, res: Response): Promise<void> {
  const result = await runMMRSync();
  res.json({ success: true, ...result });
}

const router = Router();
router.post('/internal/activate-scheduled-rounds', cronAuth, activateScheduledRoundsHandler);
router.post('/internal/import-mmr-workouts', cronAuth, importMMRWorkoutsHandler);

export default router;
