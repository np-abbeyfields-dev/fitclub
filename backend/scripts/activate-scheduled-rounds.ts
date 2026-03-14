/**
 * Batch job: activate challenge rounds that are draft and have scheduledStartAt <= now.
 * Run via cron every 1–5 minutes.
 *
 * Run from backend/: npx ts-node scripts/activate-scheduled-rounds.ts
 * Or call HTTP: POST /api/internal/activate-scheduled-rounds with Authorization: Bearer <CRON_SECRET>
 */

import { RoundService } from '../src/services/round.service';

async function main() {
  const result = await RoundService.activateScheduledRounds();
  console.log('[activate-scheduled-rounds]', result.activated, 'round(s) activated:', result.roundIds);
  process.exit(0);
}

main().catch((err) => {
  console.error('[activate-scheduled-rounds]', err);
  process.exit(1);
});
