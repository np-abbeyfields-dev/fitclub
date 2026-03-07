# FitClub Implementation vs FITCLUB_MASTER_SPEC — Compliance Audit

**Date:** 2025-03-05  
**Source:** FITCLUB_MASTER_SPEC.md

This document highlights **rule violations**, **architecture inconsistencies**, and **missing validations** between the current codebase and the spec.

---

## 1. Rule violations

### 1.1 Round status naming (§4.2, §5.4)

| Spec | Implementation | Severity |
|------|----------------|----------|
| Round statuses: **draft**, **active**, **completed** | Schema uses **draft**, **active**, **ended** | **Medium** |

- **Violation:** Spec says "completed"; code uses "ended". Same intent, but spec §4.2 and §5.4 explicitly say "completed".
- **Impact:** Documentation/API consumers expecting "completed" will see "ended". Cross-system or future spec-based tooling may break.
- **Recommendation:** Add alias in API responses (e.g. map `ended` → `completed`) or rename enum to `completed` in a migration and update all references.

---

### 1.2 PointsLedger / ScoreLedger shape (§5.9, §18)

| Spec | Implementation | Severity |
|------|----------------|----------|
| **PointsLedger**: `teamId`, `points`, **reasonType** (workout \| adjustment \| admin_override) | **ScoreLedger**: no `teamId`, no `reasonType`; has `rawPoints`, `cappedPoints`, `dailyAdjustedPoints`, `finalAwardedPoints`, `ruleSnapshotJson` | **Medium** |

- **Violation:** Spec requires a single `points` field and **reasonType** for audit. Implementation uses multiple point fields and no explicit reason type.
- **Impact:** reasonType is required for audit trail (workout vs adjustment vs admin_override). Team-level attribution (teamId) is missing for ledger rows.
- **Recommendation:** Add `reasonType` (default `'workout'`) and optional `teamId` to ScoreLedger; keep existing point breakdown for scoring engine, but ensure reasonType is set on every insert and for any future adjustment flows.

---

### 1.3 Workout model (§5.8)

| Spec | Implementation | Severity |
|------|----------------|----------|
| Workout: **clubId**, **workoutMasterId**, **distanceValue**, **notes**, **pointsAwarded** | Workout: no clubId, **activityType** (string), **distanceKm**, no notes, no pointsAwarded (points only in ScoreLedger) | **Low–Medium** |

- **Violation:** Spec lists clubId, workoutMasterId (FK to WorkoutMaster), distanceValue, notes, pointsAwarded. Implementation uses activityType string, distanceKm, and no notes; points only in ScoreLedger.
- **Impact:** clubId can be derived from round; workoutMasterId would enforce valid activity types; notes would support optional user input; pointsAwarded is redundant with ledger. Main gaps: no formal link to WorkoutMaster (we accept any activityType string), no notes field.
- **Recommendation:** Add optional `notes`; consider adding `workoutMasterId` (optional FK) and validating activityType against WorkoutMaster when present.

---

### 1.4 Team / TeamMembership (§5.5, §5.6)

| Spec | Implementation | Severity |
|------|----------------|----------|
| Team: **clubId**, **createdBy** | Team: no clubId, no createdBy (clubId derivable from Round) | **Low** |
| TeamMembership: **isLeader**, **joinedAt** | TeamMembership: no isLeader, no joinedAt | **Low** |

- **Violation:** Spec defines Team with clubId and createdBy; TeamMembership with isLeader and joinedAt. Implementation omits these.
- **Impact:** createdBy would support "who created this team"; isLeader would support "team lead" at team level (spec §3.2 uses club-level team_lead; isLeader could indicate who leads this team). joinedAt is useful for history.
- **Recommendation:** Add optional `createdBy` to Team; add optional `joinedAt` to TeamMembership; add `isLeader` if you want team-level lead distinct from club role.

---

## 2. Architecture inconsistencies

### 2.1 Admin / round entry points (§21, §10.5, §10.6)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "Admin tools belong in **Profile -> Club -> Admin Tools**"; "Do NOT scatter admin actions across multiple random tabs" | **DashboardScreen** (admin-focused) has "Invite member", "Create challenge" → Rounds; **ProfileScreen** also has "Create challenge" → Rounds, Join/Create club, Past rounds | **Low** |

- **Inconsistency:** Round creation ("Create challenge") is reachable from both Dashboard and Profile. Spec says admin tools should live under Profile → Club → Admin Tools and not be scattered.
- **Recommendation:** Treat Profile as the single entry for club/admin actions; remove or downgrade "Create challenge" from Dashboard so it’s not a second top-level admin entry, or clearly document Dashboard as "admin dashboard" and align spec wording.

---

### 2.2 API path vs spec (§7.6, §7.7)

| Spec | Implementation | Severity |
|------|----------------|----------|
| **POST /workouts** | **POST /rounds/:roundId/workouts** | **None** |

- Implementation uses round-scoped create, which matches "validate there is an active round" and is consistent. No change required; note as intentional deviation from literal §7.6 path.

---

### 2.3 User model (§5.1)

| Spec | Implementation | Severity |
|------|----------------|----------|
| User: **name**, **email**, **avatarUrl** | User: **displayName**, **email**, no avatarUrl | **Low** |

- **Inconsistency:** Spec uses "name"; implementation uses "displayName". avatarUrl is missing.
- **Recommendation:** Align naming in docs/API (e.g. expose as "name" in API if spec is contract); add avatarUrl when profile images are required.

---

## 3. Missing validations

### 3.1 Workout type validity (§17)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "Workout type and inputs are valid" | Only checks activityType non-empty and (duration or distance) for points; **does not validate activityType against WorkoutMaster** | **Medium** |

- **Missing validation:** Backend accepts any string for `activityType`. Spec §17 requires workout type and inputs to be valid. WorkoutMaster defines allowed types.
- **Impact:** Typos or unsanitized client input can create workouts with unknown types; scoring and reporting may be inconsistent.
- **Recommendation:** In `workout.service.logWorkout`, validate that `activityType` exists in WorkoutMaster (or in GenericWorkoutMet as workoutType) and return 400 with a message like "Unknown workout type" if not.

---

### 3.2 Distance/duration by type (§17)

| Spec | Implementation | Severity |
|------|----------------|----------|
| Example: "**Distance is required for this workout type.**" | Backend only requires "duration or distance" for points; does not enforce that distance-only types (e.g. Running) have distance, or duration-only types have duration | **Low–Medium** |

- **Missing validation:** Spec implies workout types have required inputs (e.g. distance vs duration). Implementation uses a single rule: at least one of duration or distance for points.
- **Recommendation:** If WorkoutMaster/GenericWorkoutMet defines requiresDuration/requiresDistance (or equivalent), enforce in logWorkout and return specific errors (e.g. "Distance is required for this workout type.").

---

### 3.3 Round update limited to draft (§4.2)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "After a round ends, it becomes read-only" (and only draft is editable) | **RoundService.updateRound** checks `round.status !== 'draft'` and rejects; no update of active/ended rounds | **None** |

- Implemented correctly.

---

### 3.4 Last admin protection (§17)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "Admin cannot accidentally remove the last admin" | **ClubService.removeMember** checks adminCount <= 1 and throws before removing | **None** |

- Implemented correctly.

---

### 3.5 One team per user per round (§4.3, §17)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "User is not already on another team this round" | **TeamService.addMemberToTeam** checks existingInRound and returns clear error | **None** |

- Implemented correctly.

---

### 3.6 Only admins can create/end round (§4.2, §17)

| Spec | Implementation | Severity |
|------|----------------|----------|
| "Only admins can create a round" / end round | **RoundService**: createRound, activateRound, updateRound, endRound all use `ensureMember(..., 'admin')` | **None** |

- Implemented correctly.

---

## 4. Summary table

| Category | Item | Severity | Status |
|----------|------|----------|--------|
| **Rule** | Round status "completed" vs "ended" | Medium | Violation |
| **Rule** | ScoreLedger missing reasonType, teamId | Medium | Violation |
| **Rule** | Workout missing notes; activityType not FK to WorkoutMaster | Low–Medium | Violation |
| **Rule** | Team/TeamMembership missing createdBy, isLeader, joinedAt | Low | Violation |
| **Architecture** | Admin entry points (Dashboard + Profile) | Low | Inconsistency |
| **Architecture** | User name vs displayName; no avatarUrl | Low | Inconsistency |
| **Validation** | activityType not validated against WorkoutMaster | Medium | Missing |
| **Validation** | Distance/duration not enforced by workout type | Low–Medium | Missing |
| **Validation** | Last admin, one team per round, admin-only round actions | — | Compliant |

---

## 5. Recommendations (priority order)

1. **High:** Validate `activityType` in logWorkout against WorkoutMaster (or GenericWorkoutMet) and return 400 for unknown types.
2. **Medium:** Add `reasonType` (and optionally `teamId`) to ScoreLedger; set `reasonType: 'workout'` on all current and future workout-created ledger rows.
3. **Medium:** Align round status with spec: either rename `ended` → `completed` (migration + code) or document "ended" as the implementation name and map to "completed" in any spec-facing API/docs.
4. **Low:** Add optional `notes` to Workout; consider `workoutMasterId` and type-based validation for duration/distance.
5. **Low:** Consolidate admin entry points so "Create challenge" / round management is clearly under Profile (or document Dashboard as the admin hub and update spec).
6. **Low:** Add Team.createdBy, TeamMembership.joinedAt (and optionally isLeader) if you need that audit/history and team-lead distinction.

---

## 6. Implementation (2025-03-05)

All six recommendations above were implemented:

- **Rec 1:** `workout.service.logWorkout` now validates `activityType` against `WorkoutMaster` and returns 400 with "Unknown workout type. Choose an activity from the list." if not found. Type-based duration/distance (e.g. distance required for Running) was not added because the reference schema has no `requiresDuration`/`requiresDistance`; can be added later if WorkoutMaster or GenericWorkoutMet is extended.
- **Rec 2:** `ScoreLedger` has `reasonType` (default `'workout'`) and optional `teamId`. Workout flow sets `reasonType: 'workout'` and `teamId` from the user’s team membership when present. Daily cap aggregate filters by `reasonType: 'workout'`.
- **Rec 3:** Round status renamed `ended` → `completed` in schema, migration `20260305100000_spec_compliance`, backend (round.service, round.controller), and frontend (roundService types, HomeScreen, ProfileScreen, RoundsScreen, PastRoundsScreen, WebTopBar).
- **Rec 4:** `Workout` has optional `notes` and `workoutMasterId` (FK to WorkoutMaster). Log workout accepts `note`, stores it as `notes`, and sets `workoutMasterId` from the validation lookup. GET workout responses include `notes`. Distance/duration by type not enforced (no requires* fields in reference data yet).
- **Rec 5:** "Create challenge" button removed from DashboardScreen; admins use Profile → Rounds / Create challenge only.
- **Rec 6:** `Team` has optional `createdBy` (FK to User); `TeamMembership` has `joinedAt` (default now) and `isLeader` (default false). `TeamService.createTeam` sets `createdBy: userId`. New memberships get `joinedAt`/`isLeader` via DB defaults.

---

*End of audit. All checks against FITCLUB_MASTER_SPEC.md as of the audit date.*
