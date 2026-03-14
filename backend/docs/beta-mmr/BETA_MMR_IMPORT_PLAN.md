# Beta: MMR Import – Design and Implementation Plan

**Status:** Plan (to be implemented).  
**Scope:** Temporary, throw-away code for beta. Long-term: target Apple Health / Samsung Health direct integration.

---

## Goal

- Run a **cron job** that pulls workouts from the Map My Ride (MMR) API and inserts them into the FitClub **Workout** table (and thus ScoreLedger, stats, leaderboard).
- **No Google Sheets.** Same logical flow as the original scripts: one service account, chunked fetch (40 per page), map MMR user → FitClub user by **email**, one club and one **active round**.
- **Deduplication:** Store MMR workout ID on each imported workout so re-runs of the cron do not create duplicates.

---

## Assumptions (from your answers)

1. One service account; MMR and FitClub users share the **same email**.
2. One club, one active round at a time.
3. MMR returns activity types; we map them to FitClub **WorkoutMaster** (existing seed has many types).
4. Credentials: Recreate from the original script pattern (api-key + Bearer token); store in **env** (no Sheets).

---

## 1. Configuration and credentials

| Env var | Purpose |
|--------|--------|
| `MMR_API_KEY` | MMR API key (header `api-key`). |
| `MMR_BEARER_TOKEN` | MMR OAuth/app Bearer token (header `Authorization: Bearer …`). |
| `MMR_USER_MAP` | JSON array of `{ "email": "user@example.com", "mmrUserId": "12345" }` for users to sync. Email must exist in FitClub User table. |
| (Optional) `MMR_CLUB_ID` | FitClub club ID to use. If not set, use the first club that has an active round. |
| (Optional) `MMR_IMPORT_DAYS` | Only import workouts from the last N days (default e.g. 90) to limit scope. |

Credentials are loaded in a small MMR client used only by the cron. **Do not commit real values;** use `.env` and deployment secrets.

---

## 2. Database change (minimal, temporary)

- Add to **Workout** table:
  - `mmrWorkoutId` (String?, unique, nullable) – MMR workout identifier from the API (e.g. from `_links.self.href` or `id`).
- Before inserting a workout from MMR, check that no `Workout` with that `mmrWorkoutId` exists; if it does, skip.
- Migration: one new column + unique index. Clearly comment in schema that this is for beta MMR sync only.

---

## 3. MMR API client (temporary module)

**Location:** e.g. `backend/src/services/beta-mmr/mmr-api.client.ts` (or `lib/mmr-client.ts`).

- **Build request options:** Same headers as the original script (api-key, Authorization Bearer, user-agent, origin, referer). No branch_key/token/feed_id unless we discover they are required.
- **Fetch workouts for one user:**  
  `GET https://mapmyride.api.ua.com/v7.2/workout/?user=<mmrUserId>&limit=40&offset=<n>&order_by=-start_datetime`
- **Chunking:** Loop with `offset = 0, 40, 80, …` until the response has fewer than 40 workouts (or empty).
- **Parse response:** Read `_embedded.workouts` (handle both array and object-with-entries). For each workout extract:
  - Workout ID (from `id` or from `_links.self.href` for dedupe).
  - `start_datetime` (ISO string → `loggedAt`).
  - Activity type from `_links.activity_type` (URL or embedded name/ID).
  - `aggregates.active_time_total` or `elapsed_time_total` (seconds → `durationMinutes`).
  - `aggregates.distance_total` (meters → `distanceKm`).
  - Optionally `metabolic_energy_total` (joules → kcal) for `caloriesBurned` if we want to store it.
- Return a list of **normalized workout DTOs** (e.g. `{ mmrWorkoutId, loggedAt, activityTypeIdOrName, durationMinutes, distanceKm, calories? }`). No Resend/Sheets dependency.

---

## 4. Activity type mapping (MMR → FitClub)

- **Input:** MMR activity type (string name or numeric ID from API).
- **Output:** FitClub `workoutMasterId` (and thus `activityType` from WorkoutMaster.workoutType).
- **Implementation:** A static mapping object in the beta module (or a small JSON file under `backend/docs/beta-mmr/`). Map common MMR types (Run, Cycling, Walk, etc.) to existing **WorkoutMaster.workoutType** values from seed (e.g. "Run" → Run, "Cycling" / "Bike Ride" → Biking). If MMR returns IDs, we need a small table or map (MMR activity ID → workoutType). Unmapped types can fall back to a default (e.g. "Generic Workout" or "Unidentified Workout Type") so the cron doesn’t fail.

---

## 5. Sync service (orchestration)

**Location:** e.g. `backend/src/services/beta-mmr/mmr-sync.service.ts`.

1. **Load config:** Parse `MMR_USER_MAP`; resolve each email to FitClub **User** (by email). Skip users not found.
2. **Resolve round:** If `MMR_CLUB_ID` set, get that club’s active round; else get any active round (e.g. first by endDate). If none, abort and return “no active round”.
3. **For each user (email, mmrUserId):**
   - Fetch all workouts from MMR (chunked) for `mmrUserId`.
   - Filter by `start_datetime` if `MMR_IMPORT_DAYS` is set.
   - For each workout:
     - If a Workout with this `mmrWorkoutId` already exists, skip.
     - Map MMR activity type → `workoutMasterId`.
     - Call existing **logWorkout(roundId, fitclubUserId, input)** with:
       - `workoutMasterId`, `durationMinutes`, `distanceKm`, `loggedAt` (and optional calories).
       - **Important:** We must pass through the fact that this workout came from MMR so we can set `mmrWorkoutId` on the created row. So either:
         - **Option A:** Extend `logWorkout` with an optional `mmrWorkoutId` (or `externalId`) and set it on `Workout` only when provided; or  
         - **Option B:** Create the Workout + ScoreLedger in a dedicated “import” path that reuses the same business logic but allows setting `mmrWorkoutId`.  
     - Prefer **Option A** (add optional `mmrWorkoutId` to the workout create path) to avoid duplicating daily-cap and points logic.
4. **Return summary:** e.g. `{ usersProcessed, workoutsImported, workoutsSkippedDuplicate, errors[] }`.

---

## 6. Cron endpoint

- **Route:** `POST /api/internal/import-mmr-workouts` (or `/internal/beta/import-mmr-workouts`).
- **Auth:** Same as existing internal cron: require `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.
- **Handler:** Call the MMR sync service; return JSON summary and 200, or 503 if MMR not configured / no active round.

---

## 7. Implementation order

| Step | Task |
|------|------|
| 1 | Add **env** vars: `MMR_API_KEY`, `MMR_BEARER_TOKEN`, `MMR_USER_MAP` (and optional `MMR_CLUB_ID`, `MMR_IMPORT_DAYS`). |
| 2 | **Migration:** Add `Workout.mmrWorkoutId` (String?, unique). |
| 3 | **MMR client:** Implement fetch with chunking and response parsing (normalized DTOs). |
| 4 | **Activity mapping:** Implement MMR activity type → WorkoutMaster (by workoutType or id). |
| 5 | **logWorkout extension:** Allow optional `mmrWorkoutId` on create; skip create if `mmrWorkoutId` already exists for this round/user (or globally unique). |
| 6 | **Sync service:** Load user map, resolve round, loop users, fetch MMR → call logWorkout with `mmrWorkoutId`, collect stats. |
| 7 | **Cron route:** Wire POST handler with cron auth, call sync service, return summary. |
| 8 | **Docs:** Add a short `backend/docs/beta-mmr/README.md` with env example and how to run the cron (curl or Cloud Scheduler). |

---

## 8. Future replacement

- This is **temporary** for beta. Later, replace with:
  - Direct **Apple Health** and **Samsung Health** integration, or
  - User-linked MMR/OAuth so each user authorizes their own MMR account (no shared service account).
- When deprecating, remove the cron route, sync service, MMR client, and optionally drop or ignore `mmrWorkoutId` (or keep column for historical data).

---

## 9. Security and robustness

- **Secrets:** Only in env; never log tokens or full user map.
- **Idempotency:** Dedupe by `mmrWorkoutId` so repeated cron runs are safe.
- **Rate limiting:** MMR may have rate limits; keep chunk size 40 and optional short delay between users if needed.
- **Errors:** Per-user or per-workout errors should not stop the whole run; log and continue, report in summary.

Once you approve this plan, implementation can follow the order above.
