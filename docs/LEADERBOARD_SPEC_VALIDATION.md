# Leaderboard Implementation vs FITCLUB_MASTER_SPEC.md

**Date:** 2025-03-05  
**Focus:** Validate leaderboard implementation and confirm use of Redis sorted sets per spec.

---

## Spec requirements

### §6.4 Leaderboard strategy

- **Use Redis sorted sets for fast rank lookups.**
- Examples:
  - `leaderboard:club:{clubId}:round:{roundId}:teams`
  - `leaderboard:club:{clubId}:round:{roundId}:users`
- On score updates: **increment sorted set scores**, return fresh rank data.

### §6.3 Workout logging flow (step 10)

- **Update Redis leaderboard sorted sets** when a workout is logged.

### §4.5 / §5.9

- Do not compute leaderboard directly from workouts on every request.
- Use PointsLedger (ScoreLedger) as the scoring source of truth.

### Roadmap (§Phase 3)

- **Add Redis leaderboards** is listed as a Phase 3 item (with push notifications, round start modal, etc.).

---

## Current implementation

### Data source

- **LeaderboardService** (`backend/src/services/leaderboard.service.ts`) serves leaderboards by:
  - **Individuals:** `prisma.scoreLedger.groupBy({ by: ['userId'], where: { roundId }, _sum: { finalAwardedPoints: true } })`, then in-memory sort by points and assign rank.
  - **Teams:** Load teams for the round + memberships; `prisma.scoreLedger.groupBy` by `userId` for the round; sum points per team from member totals; sort and rank in memory.

- Scoring source of truth is **ScoreLedger** (PointsLedger). Workouts are not summed for leaderboard. ✅ Aligns with §4.5 / §5.9.

### Redis usage

- **Redis is not used anywhere in the codebase.**  
  (No `redis`, `Redis`, or `ioredis` in backend or frontend.)

- **Workout logging** (`workout.service.logWorkout`) does **not** update any Redis keys. It:
  - Creates Workout + ScoreLedger
  - Upserts UserStats + TeamStats
  - Creates ActivityFeed event  
  and does **not** call Redis.

---

## Validation result

| Spec requirement | Implemented? | Notes |
|------------------|--------------|--------|
| Leaderboard from PointsLedger (ScoreLedger), not raw workouts | ✅ Yes | Both individuals and teams use `scoreLedger.groupBy` / aggregates. |
| Redis sorted sets for team leaderboard | ❌ No | No Redis; team leaderboard is computed from DB (ScoreLedger + Team memberships) on each request. |
| Redis sorted sets for user/individual leaderboard | ❌ No | No Redis; individual leaderboard is computed from ScoreLedger on each request. |
| Update Redis on score (workout) write | ❌ No | Workout write does not touch Redis. |

---

## Conclusion

**Redis sorted sets are not used for team or user leaderboards.**

- Leaderboards are **correct**: they use ScoreLedger as the source of truth and update on the next read after a workout is logged (because the write goes to the DB).
- The spec’s **Redis** design (§6.4 and §6.3 step 10) is **not implemented**; it is explicitly deferred to **Phase 3** (“add Redis leaderboards” in the roadmap).

To align with the spec’s Redis strategy you would need to:

1. Introduce Redis (e.g. `ioredis` or `redis`) in the backend.
2. On workout log (in the same flow that writes ScoreLedger), update:
   - `leaderboard:club:{clubId}:round:{roundId}:users` (e.g. ZADD or ZINCRBY by userId with score = total points for that user in the round).
   - `leaderboard:club:{clubId}:round:{roundId}:teams` (e.g. ZADD/ZINCRBY by teamId with score = team total).
3. Optionally serve leaderboard GETs from Redis (e.g. ZREVRANGE with scores) for fast rank lookups, with a fallback to the current DB path if Redis is unavailable.

Until then, the implementation remains **spec-compliant on data source and correctness** and **non-compliant on the Redis caching strategy**, which is intentionally deferred per the roadmap.
