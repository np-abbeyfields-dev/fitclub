# Scheduled challenge round activation (batch job)

Challenge rounds can have a **scheduled start time** (`scheduledStartAt`). A batch job must run periodically to set such rounds to **active** when the time is reached.

## Options

### 1. Cron + script (recommended for VMs / single server)

Run every 1–5 minutes:

```bash
cd backend && npx ts-node scripts/activate-scheduled-rounds.ts
```

Example crontab (every 2 minutes):

```
*/2 * * * * cd /path/to/FitClub/backend && npx ts-node scripts/activate-scheduled-rounds.ts >> /var/log/fitclub-cron.log 2>&1
```

### 2. HTTP endpoint (e.g. Google Cloud Scheduler)

1. Set `CRON_SECRET` in the backend environment to a long random string.
2. Call:

   ```
   POST /api/internal/activate-scheduled-rounds
   Authorization: Bearer <CRON_SECRET>
   ```

3. In Cloud Scheduler, create a job that runs every 1–5 minutes and calls this URL with the header.

## Behaviour

- Finds rounds where `status = 'draft'` and `scheduledStartAt <= now`.
- At most **one** round per club is activated per run (the earliest due).
- Activates the round (sets status to `active`, completes any other active round in that club, sends notifications).

## Flow summary

1. Admin creates a round → status **draft**.
2. Admin adds teams; team leads add members (draft only).
3. Admin sets **Schedule start** in the round edit screen (or uses "Start now" to activate immediately).
4. Batch job runs periodically; when `scheduledStartAt` is in the past, the round becomes **active**.
5. Once active, teams and members are **locked** (no add/remove).
