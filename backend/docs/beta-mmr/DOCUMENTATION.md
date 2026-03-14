# Map My Ride (MMR) → Google Sheets – Original Scripts Documentation

This folder contains the original Google Apps Script code that read workout data from the Map My Ride (Under Armour) API and wrote it to Google Sheets. It is kept for reference. **FitClub beta will reimplement the same flow in the backend (no Sheets): MMR API → FitClub DB.**

---

## Overview

- **Source:** Map My Ride API (Under Armour), base URL: `https://mapmyride.api.ua.com/v7.2/workout/`
- **Auth:** One service account; `api-key` + `Authorization: Bearer <token>` in headers. The script used a fixed Bearer token and api-key (see Credentials below).
- **Chunking:** The API returns workouts in pages. The script requested **40 workouts per page** (`limit=40`) and used **offset** (0, 40, 80, …) to page. Loop count was derived from a "number of workouts to fetch" value per user (from a UserIds sheet).
- **Output (original):** Google Sheet `MMROutput`; one row per workout. No Sheets in the FitClub beta—we write to the FitClub `Workout` table instead.

---

## Files and Roles

### 1. `assistUrlBuildingOptions.gs` (same as `updateExecutionStatus.gs` in copy)

**Purpose:** Builds the HTTP options object for MMR API requests.

**Headers used:**
- `accept`: `application/json, text/plain, */*`
- `api-key`: Fixed UUID (MMR app API key)
- `Authorization`: `Bearer <token>` (MMR OAuth or app token)
- `user-agent`, `origin`, `referer`: Set to Map My Ride / browser-like values
- `branch_key`, `token`, `feed_id`: App-specific; may be required by the API

**Returns:** Options object for `UrlFetchApp.fetch(url, options)` with `method: "GET"`, `followRedirects: true`, `muteHttpExceptions: true`.

**Credentials (must not be committed; use env in backend):**
- `api-key`: e.g. `1ef80bd7-e8da-4b50-aeae-eecec2f27423`
- `Authorization` Bearer token: long-lived token that allowed reading workouts for multiple users (service-account style).

---

### 2. `mainUserIdGroup1.gs` (main entry)

**Purpose:** For each user in the UserIds sheet, fetches workouts from MMR in chunks of 40 and writes parsed results to the MMROutput sheet.

**Flow:**
1. Call `updateExecutionStatus(0)`.
2. Get sheet `MMROutput`; call `deleteExistingRows(mmrOutputSheet)` to clear old data (rows 2..last).
3. Get sheet `UserIds`; for each row:
   - Column 0: **MMR user ID** (e.g. numeric or string) to pass in the API URL.
   - Column 3: **Number of workouts to fetch** for that user.
4. For each user:
   - Compute number of fetch loops: `ceil(numberOfWorkoutsToFetchForUserId / 40) + 1` (the +1 may fetch one extra page; safe).
   - Build URL: `https://mapmyride.api.ua.com/v7.2/workout/?user=<userId>&limit=40&offset=<0|40|80|...>&order_by=-start_datetime`
   - For each offset (0, 40, 80, …):
     - `UrlFetchApp.fetch(url, options).getContentText()` → raw JSON.
     - `getAllWorkoutsInStringFormat(response, userIdToFetchWorkouts)` → string representation of workouts (delimiter-based).
     - `build2DArrayOfWorkouts(commaReplacedWorkouts)` → 2D array for the sheet.
     - Append to `MMROutput` sheet.
5. If all users processed, call `updateExecutionStatus(1)`.

**Note:** The script references `url1` which is commented out in the original; the intended base URL is  
`https://mapmyride.api.ua.com/v7.2/workout/?user=`.

---

### 3. `getAllWorkoutsInStringFormat.gs`

**Purpose:** Parses the MMR API JSON response and flattens workout fields into a single string with custom delimiters for later parsing.

**MMR response structure (inferred):**
- `response._embedded.workouts` – object or array of workout objects.
- Each workout has:
  - `name`
  - `start_datetime`
  - `_links.activity_type` – used to get **activityTypeId** (value may be a URL path or ID).
  - `aggregates`:
    - `elapsed_time_total` (seconds)
    - `active_time_total` (seconds)
    - `metabolic_energy_total` (joules)
    - `distance_total` (meters)

**Output format:** String with `NWN` (new workout) and `SWN` (new field) delimiters, then key=value pairs. Commas in values are replaced with spaces to avoid breaking CSV-style parsing.

**Fields extracted per workout:**
- `userIdToFetchWorkouts` (passed in)
- `name`
- `start_datetime`
- `activityTypeId` (from `_links.activity_type`)
- `Elapsed Time` (seconds)
- `Active Time` (seconds)
- `cals` (metabolic_energy_total)
- `distance` (meters)

---

### 4. `build2DArrayOfWorkouts.gs`

**Purpose:** Converts the delimiter-based string back into a 2D array (rows × columns) and normalizes units for display/storage.

**Parsing:**
- Split by `NWN` → one segment per workout (first segment before first `NWN` is dropped).
- Split each segment by `SWN` → key=value pairs.
- Default `cals` to 0 if missing.

**Normalizations:**
- **Active Time / Elapsed Time:** value is in seconds → divide by 60 for **minutes**.
- **cals:** value in joules → multiply by `0.0002388458966275` → **kcal** (≈ 1/4184).
- **distance:** value in meters → divide by 1000 → **km**.
- **start_datetime:** kept or split (script has a bug: assigns `x1 = split("=")` then uses `x1`; intent is to keep datetime string).
- **activityTypeId:** kept as-is (may be URL path or ID string).

**Bugs / quirks in original:**
- `arrayOfAllWorkouts2D` is used but not declared in the snippet (commented as `//NU var`); likely a global.
- For `distance`, code does `x1 = eachWorkoutElementSplit[1].split("=")` then `x1/1000`; correct would be `parseFloat(eachWorkoutElementSplit[1])/1000`.
- `deleteExistingRows` references `howManyToDelete` which is never set (commented `//NU`); row deletion may be broken.

---

### 5. `deleteExistingRows.gs`

**Purpose:** Clear existing data from the MMROutput sheet (rows 2 to last). In the snippet, `howManyToDelete` is never assigned, so the delete may not run correctly. For backend we do not need this; we only insert new workouts and dedupe by external ID.

---

### 6. `updateExecutionStatus.gs`

**Purpose:** Update some execution status (e.g. a cell or sheet) with success/failure (0 or 1). Not needed for backend; we can log and return job status in the cron response.

---

## MMR API summary (for backend reimplementation)

| Item | Value |
|------|--------|
| Base URL | `https://mapmyride.api.ua.com/v7.2/workout/` |
| Auth | `api-key` header + `Authorization: Bearer <token>` |
| List workouts | `GET ?user=<mmrUserId>&limit=40&offset=<n>&order_by=-start_datetime` |
| Pagination | `limit=40`; increment `offset` by 40 until no more results |
| Per-workout fields | `name`, `start_datetime`, `_links.activity_type`, `aggregates.elapsed_time_total`, `active_time_total`, `metabolic_energy_total`, `distance_total` |
| Units | Time: seconds → convert to minutes; distance: meters → km; energy: joules → kcal (× 0.0002388…) |

---

## User mapping (for FitClub beta)

- **Original:** UserIds sheet had at least: column 0 = MMR user ID, column 3 = number of workouts to fetch.
- **Beta:** FitClub users are identified by **email**. We need a mapping **FitClub user (email) → MMR user ID** so we know which MMR `user=` to call for each FitClub user. Options:
  - **A)** Config/DB table: `email → mmr_user_id` (e.g. env list or a small `mmr_sync_config` table).
  - **B)** If MMR API supports "user by email", we could resolve email → MMR user ID via API (to be confirmed).

---

## Activity type mapping (for FitClub beta)

- MMR exposes **activity type** via `_links.activity_type` (value may be an ID or a URL containing the type name).
- FitClub uses **WorkoutMaster** rows with a specific `workoutType` (e.g. "Run", "Walk", "Biking", "Cycling", "Gym Workout").
- We need a **mapping**: MMR activity type (name or ID) → FitClub `WorkoutMaster.workoutType` (or id). The existing `backend/prisma/seed.ts` already has many MMR-style names (e.g. "Run", "Cycling", "Bike Ride"); we can build a map from MMR type name/ID to our `workoutType` and then resolve to `workoutMasterId`.

---

## Next step

See **BETA_MMR_IMPORT_PLAN.md** for the design and implementation plan of the temporary backend cron that pulls from MMR and populates the FitClub Workout table (no Google Sheets).
