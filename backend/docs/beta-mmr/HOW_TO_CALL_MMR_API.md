# How to call the MMR API

No UI—everything is done via API/cron. Use this doc when you’re ready to run the import.

---

## Option 1: Use FitClub’s import endpoint (recommended)

FitClub’s backend calls the MMR API for you and writes workouts into the DB. You only call our internal cron.

### 1. Set environment variables

In `backend/.env` (or your deployment env):

```bash
# Required for the cron to accept the request
CRON_SECRET=your-cron-secret

# Required for MMR
MMR_API_KEY=your-mmr-api-key
MMR_BEARER_TOKEN=your-mmr-bearer-token
MMR_USER_MAP='[{"email":"user1@example.com","mmrUserId":"12345"},{"email":"user2@example.com","mmrUserId":"67890"}]'
```

- **CRON_SECRET** – Any secret; send it as `Authorization: Bearer <CRON_SECRET>`.
- **MMR_API_KEY** – From your MMR/Under Armour app or integration.
- **MMR_BEARER_TOKEN** – MMR OAuth or app Bearer token (same one that could read multiple users in the original script).
- **MMR_USER_MAP** – JSON array. Each item: `email` (FitClub user email), `mmrUserId` (MMR user ID for the API). Same email in FitClub and MMR.

Optional:

```bash
MMR_CLUB_ID=uuid-of-club    # default: first club with an active round
MMR_IMPORT_DAYS=90          # only import workouts from last N days (default 90)
```

### 2. Call the endpoint

**Local:**

```bash
curl -X POST http://localhost:8080/api/internal/import-mmr-workouts \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

**Deployed (e.g. Cloud Run):**

```bash
curl -X POST https://YOUR_API_HOST/api/internal/import-mmr-workouts \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

**Scheduling (e.g. cron or Cloud Scheduler):**  
Call the same URL on a schedule (e.g. daily). No request body; same headers.

### 3. Response

- **200** – JSON body:

```json
{
  "success": true,
  "usersProcessed": 2,
  "workoutsImported": 15,
  "workoutsSkippedDuplicate": 0,
  "errors": []
}
```

- **401** – Wrong or missing `Authorization: Bearer <CRON_SECRET>`.
- **503** – `CRON_SECRET` not set in env.

If `success` is true but `errors` is non-empty, the run still completed; check `errors` for per-user or per-workout issues.

---

## Option 2: Call the Map My Ride API directly

Use this for debugging or to see raw MMR responses. No FitClub DB writes.

### Base URL and auth

- **Base:** `https://mapmyride.api.ua.com/v7.2/workout/`
- **Auth:** Two headers:
  - `api-key: <MMR_API_KEY>`
  - `Authorization: Bearer <MMR_BEARER_TOKEN>`

### List workouts for one user (paginated)

**Request:**

```http
GET https://mapmyride.api.ua.com/v7.2/workout/?user=<MMR_USER_ID>&limit=40&offset=0&order_by=-start_datetime
api-key: <MMR_API_KEY>
Authorization: Bearer <MMR_BEARER_TOKEN>
Accept: application/json
```

**Query parameters:**

| Parameter   | Description                          |
|------------|--------------------------------------|
| `user`     | MMR user ID (required).              |
| `limit`    | Max workouts per page (e.g. 40).     |
| `offset`   | Pagination offset (0, 40, 80, …).    |
| `order_by` | `-start_datetime` for newest first.  |

**Example (curl):**

```bash
curl -s -X GET "https://mapmyride.api.ua.com/v7.2/workout/?user=YOUR_MMR_USER_ID&limit=40&offset=0&order_by=-start_datetime" \
  -H "api-key: YOUR_MMR_API_KEY" \
  -H "Authorization: Bearer YOUR_MMR_BEARER_TOKEN" \
  -H "Accept: application/json"
```

**Response shape (simplified):**

- `_embedded.workouts` – Object or array of workout objects.
- Each workout can have:
  - `id` or `_links.self.href` – workout ID.
  - `start_datetime` – ISO datetime.
  - `_links.activity_type` – activity type (e.g. href with type ID).
  - `aggregates`:
    - `active_time_total` / `elapsed_time_total` – seconds.
    - `distance_total` – meters.
    - `metabolic_energy_total` – joules.

FitClub’s import uses the same URL pattern and pagination (chunks of 40) and maps these fields into the Workout table.

---

## Getting MMR credentials and user IDs

- **API key and Bearer token** – From the MMR/Under Armour developer portal or the app/integration you used for the original Google Sheets script. The same credentials that worked there should work for the FitClub import.
- **MMR user ID** – From the original setup (e.g. UserIds sheet: column 0 was the MMR user ID). If you only have email, you may need to look up the user ID via MMR’s API or account tools; FitClub does not resolve email → MMR user ID.

---

## Summary

| Goal                         | What to call                                                                 |
|-----------------------------|-------------------------------------------------------------------------------|
| Import MMR → FitClub (no UI) | `POST /api/internal/import-mmr-workouts` with `Authorization: Bearer <CRON_SECRET>`. |
| Call MMR API directly       | `GET .../v7.2/workout/?user=<id>&limit=40&offset=<n>&order_by=-start_datetime` with `api-key` and `Authorization: Bearer`. |

No UI is required; use curl, a scheduler, or any HTTP client.
