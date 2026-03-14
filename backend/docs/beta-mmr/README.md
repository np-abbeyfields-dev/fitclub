# Beta: Map My Ride (MMR) import

**BETA_MMR:** Temporary integration for beta testing. To remove after beta: search the codebase for `BETA_MMR` and delete all marked code, the `backend/src/services/beta-mmr/` folder, the `Workout.mmrWorkoutId` migration/column, and this doc folder if desired.

- **DOCUMENTATION.md** – Documents the original Google Apps Script (`.gs`) files. Reference only.
- **BETA_MMR_IMPORT_PLAN.md** – Design and implementation plan.
- **HOW_TO_CALL_MMR_API.md** – How to call the MMR API and the FitClub import endpoint (no UI).

## Implemented pieces

- **Env:** `MMR_API_KEY`, `MMR_BEARER_TOKEN`, `MMR_USER_MAP`, optional `MMR_CLUB_ID`, `MMR_IMPORT_DAYS` (default 90).
- **DB:** `Workout.mmrWorkoutId` (unique, nullable) for dedupe.
- **Cron:** `POST /api/internal/import-mmr-workouts` (requires `Authorization: Bearer <CRON_SECRET>`).

## Env example

```bash
# Required for MMR import
MMR_API_KEY=your-mmr-api-key
MMR_BEARER_TOKEN=your-mmr-bearer-token
MMR_USER_MAP='[{"email":"user1@example.com","mmrUserId":"12345"},{"email":"user2@example.com","mmrUserId":"67890"}]'

# Optional
MMR_CLUB_ID=uuid-of-club          # default: first club with an active round
MMR_IMPORT_DAYS=90                # only import workouts from last N days (default 90)
CRON_SECRET=your-cron-secret      # same as for activate-scheduled-rounds
```

## Run the cron

```bash
curl -X POST https://your-api/api/internal/import-mmr-workouts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response: `{ "success": true, "usersProcessed", "workoutsImported", "workoutsSkippedDuplicate", "errors": [] }`.

**Long-term:** Replace with Apple Health / Samsung Health direct integration or per-user MMR OAuth.
