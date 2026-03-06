# Workout Logging Flow Audit vs FITCLUB_MASTER_SPEC.md

**Date:** 2025-03-05  
**Source of truth:** FITCLUB_MASTER_SPEC.md (sections 4.5, 5.8, 5.9, 6.3, 6.4, 6.5, 18, 20)

---

## Spec Requirements (Summary)

From **§6.3 Workout logging flow**, when a user logs a workout:

1. Validate request
2. Validate user belongs to club
3. Validate there is an active round for that club
4. Validate workout type / inputs
5. Calculate points
6. Create workout row
7. Create points ledger row
8. Update UserStats
9. Update TeamStats
10. Update Redis leaderboard sorted sets
11. Optionally create ActivityFeed event
12. Return updated totals to client

From **§4.5 Workout rules** and **§5.9 PointsLedger**:

- Workouts create points; points persisted and immutable after logging.
- Leaderboards must **not** be recalculated from raw workouts every request.
- **PointsLedger (ScoreLedger) is the scoring source of truth.**

From **§6.5 Aggregation strategy**:

- Maintain `user_stats` and `team_stats`; update on workout write.

From **§6.4 Leaderboard strategy**:

- Use Redis sorted sets for fast rank lookups; update on score updates.

---

## 1. Round Detection

| Requirement | Status | Notes |
|-------------|--------|--------|
| Validate round exists | ✅ **Implemented** | `logWorkout()` loads round by `roundId`; throws NotFoundError if missing. |
| Validate round belongs to club | ✅ **Implemented** | Round has `clubId`; membership check is per club via `ClubService.ensureMember(userId, round.clubId)`. |
| Validate user is club member | ✅ **Implemented** | `ClubService.ensureMember(userId, round.clubId)` before any write. |
| Validate round status = active | ✅ **Implemented** | `logWorkout()` throws if `round.status !== 'active'`. |
| One active round per club (spec §4.2) | ✅ **Enforced** | Round model has `status`; activation logic in `RoundService.activateRound` ensures single active round (via application logic; consider partial unique index in DB). |

**Conclusion:** Round detection is implemented in `workout.service.logWorkout()`: load round by `roundId`, ensure `round.status === 'active'`, ensure `ClubService.ensureMember(userId, round.clubId)`.

---

## 2. Points Ledger Insertion

| Requirement | Status | Notes |
|-------------|--------|--------|
| Create Workout row | ❌ **Missing** | No code path creates `Workout` in backend. |
| Create PointsLedger/ScoreLedger row | ❌ **Missing** | No code path creates `ScoreLedger`. |
| Points immutable after logging (§4.5) | N/A | No write path exists. |
| Ledger as source of truth (§5.9) | ✅ **Read path correct** | Dashboard and leaderboard read from `ScoreLedger` (groupBy/aggregate), not from Workout. |

**Conclusion:** The write path has been **implemented**. Route `POST /api/rounds/:roundId/workouts` is registered in `round.routes.ts`. `workout.service.logWorkout()` creates `Workout` and `ScoreLedger` in one transaction; daily cap from `round.scoringConfig.dailyCap` is applied; points are calculated server-side (0.2 pts/min, 5 pts/km) and stored in ScoreLedger as source of truth.

---

## 3. Stats Aggregation Update

| Requirement | Status | Notes |
|-------------|--------|--------|
| UserStats table (§5.10) | ❌ **Missing** | Schema has no `UserStats` model. |
| TeamStats table (§5.11) | ❌ **Missing** | Schema has no `TeamStats` model. |
| Update on workout write (§6.5) | ❌ **N/A** | No stats tables, no workout write. |
| Avoid heavy SUM on every request | ⚠️ **Partial** | Leaderboard and dashboard use `ScoreLedger` (and Workout for counts/recent list), which is correct per spec (“Use PointsLedger”). Aggregations are done via Prisma `groupBy`/`aggregate` on each request—no Redis or precomputed stats. |

**Conclusion:** Precomputed **UserStats** and **TeamStats** tables are not implemented. The spec recommends them for scale; current implementation relies on live aggregation from `ScoreLedger` and `Workout`. For Phase 2 this is acceptable; for Phase 3/4 consider adding these tables and updating them in the same transaction as the workout + ledger write.

---

## 4. Leaderboard Cache Update

| Requirement | Status | Notes |
|-------------|--------|--------|
| Redis sorted sets (§6.4) | ❌ **Not implemented** | No Redis in codebase. |
| Update on score update | ❌ **N/A** | No score write path. |
| Leaderboard read from PointsLedger | ✅ **Correct** | `LeaderboardService.getLeaderboard` uses `prisma.scoreLedger.groupBy` by `roundId`; no direct SUM over Workout. |

**Conclusion:** Leaderboard **read** path follows the spec (scoring source = ScoreLedger). **Cache** (Redis) is a Phase 3 item per spec §20; current design is DB-only and will scale up to a point before Redis is needed.

---

## Summary Table

| Area | Spec | Current | Action |
|------|------|---------|--------|
| Round detection | Validate round, club, member, active | ✅ Implemented | `RoundController.logWorkout` + `logWorkout()` validate round exists, status active, user is club member |
| Points ledger | Create Workout + ScoreLedger | ✅ Implemented | Single transaction in `workout.service.logWorkout`: create Workout then ScoreLedger with daily cap applied |
| Stats aggregation | UserStats / TeamStats on write | No tables, live aggregate | **Defer tables; document as future work** |
| Leaderboard cache | Redis on write | No Redis; read from DB | **Defer Redis; document as Phase 3** |

---

## Recommendations

1. **Implement workout logging endpoint**  
   - Route: `POST /rounds/:roundId/workouts` (register in round routes or a dedicated workout route under rounds).  
   - Validate: round exists, `round.status === 'active'`, user is club member via `ClubService.ensureMember(userId, round.clubId)`.  
   - In one transaction: create `Workout`, then create `ScoreLedger` with points (raw, capped by daily cap, final).  
   - Use round `scoringConfig.dailyCap` and same-day ScoreLedger sum for daily cap logic (align with dashboard).

2. **Keep leaderboard read from ScoreLedger**  
   - No change; already correct.

3. **UserStats / TeamStats**  
   - Add in a later migration and update them in the same transaction as workout + ledger when targeting higher scale.

4. **Redis leaderboard**  
   - Add per spec Phase 3 when optimizing for “fast leaderboard response” and high write frequency.

---

*Audit complete. Implementation of the workout logging endpoint (round validation + Workout + ScoreLedger) is required to satisfy the spec.*
