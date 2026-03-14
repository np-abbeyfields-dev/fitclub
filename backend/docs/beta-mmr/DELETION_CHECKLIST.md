# BETA_MMR – Deletion checklist (post beta)

When replacing MMR import with Apple/Samsung Health or per-user OAuth, remove all code marked **BETA_MMR** as follows.

1. **Search codebase for `BETA_MMR`** and remove or revert each hit.

2. **Delete the folder**  
   `backend/src/services/beta-mmr/`  
   (mmr-api.client.ts, mmr-activity-map.ts, mmr-sync.service.ts)

3. **Revert changes in existing files**
   - `backend/src/config/env.ts` – Remove the block under "BETA_MMR" (mmrApiKey, mmrBearerToken, mmrUserMapJson, mmrClubId, mmrImportDays).
   - `backend/prisma/schema.prisma` – Remove `mmrWorkoutId` from model Workout and its comment.
   - `backend/src/services/workout.service.ts` – Remove `mmrWorkoutId` from `LogWorkoutInput` and from the `workout.create` data spread.
   - `backend/src/routes/internal.routes.ts` – Remove the import of `runMMRSync`, `importMMRWorkoutsHandler`, and the route `POST /internal/import-mmr-workouts`.

4. **Database**
   - Add a new migration that drops the unique constraint/index on `Workout.mmrWorkoutId` and drops the column `mmrWorkoutId` (or keep the column and stop writing to it if you want to retain historical MMR imports).

5. **Optional:** Delete this docs folder  
   `backend/docs/beta-mmr/`  
   or keep it as archive.

6. **Env:** Remove from deployment/env: `MMR_API_KEY`, `MMR_BEARER_TOKEN`, `MMR_USER_MAP`, `MMR_CLUB_ID`, `MMR_IMPORT_DAYS` (if set).
