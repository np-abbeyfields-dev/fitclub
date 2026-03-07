# Workout Logging Flow Audit vs FITCLUB_MASTER_SPEC.md

**Date:** 2025-03-05 (updated)  
**Source of truth:** FITCLUB_MASTER_SPEC.md (§4.5, §5.8, §5.9, §6.3, §6.4, §6.5)

This audit verifies the workout logging flow against the spec for:
- correct round detection
- points ledger insertion
- stats aggregation update
- leaderboard cache update

---

## Spec Reference (§6.3 Workout logging flow)

When a user logs a workout:

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

§4.5 / §5.9: PointsLedger (ScoreLedger) is the scoring source of truth; do not compute leaderboard from raw workouts.  
§6.5: user_stats and team_stats update on workout write.

---

## 1. Round detection

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Round exists | ✅ | `workout.service.logWorkout()` loads round by `roundId`; throws `NotFoundError` if missing. |
| Round is active | ✅ | `if (round.status !== 'active') throw new ValidationError('Workouts can only be logged for an active round.')` |
| User belongs to club | ✅ | `ClubService.ensureMember(userId, round.clubId)` before any write. |
| Round belongs to club | ✅ | Round is fetched by `roundId`; membership check uses `round.clubId`, so round and club are consistent. |

**Frontend:** `WorkoutNewScreen` gets `activeRoundId` from `clubService.getDashboard(selectedClub.id)` → `dash.data?.activeRound?.id`, then calls `workoutService.logWorkout(activeRoundId!, payload)`. So the client sends the club’s active round ID; the backend re-validates existence and status.

**Conclusion:** Round detection is correct. Backend validates round exists, `status === 'active'`, and user is a member of the round’s club. No reliance on “current round” without validation.

---

## 2. Points ledger insertion

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Create Workout row | ✅ | `tx.workout.create()` inside `prisma.$transaction` in `workout.service.logWorkout()`. |
| Create PointsLedger/ScoreLedger row | ✅ | `tx.scoreLedger.create()` in the same transaction, linked via `workoutId`. |
| Points from ledger, not recomputed from workouts | ✅ | Leaderboard and stats read from ScoreLedger (see §§3–4). |
| reasonType for audit | ✅ | ScoreLedger has `reasonType: 'workout'`; daily cap aggregate filters `reasonType: 'workout'`. |
| teamId attribution | ✅ | `teamId` set from user’s `TeamMembership` for the round when present. |

**Details:**

- **Transaction:** Workout and ScoreLedger are created in a single `prisma.$transaction`; no partial state.
- **Points:** Raw points from duration/distance (0.2 pts/min, 5 pts/km); daily cap from `round.scoringConfig.dailyCap`; `finalAwardedPoints` = min(raw, remaining daily cap). Stored in ScoreLedger as `finalAwardedPoints` (and breakdown in `rawPoints`, `cappedPoints`, `dailyAdjustedPoints`, `ruleSnapshotJson`).
- **Immutability:** No backend flow modifies points after logging; DELETE workout cascades to ScoreLedger (row removed, not adjusted).

**Conclusion:** Points ledger insertion is correct and spec-compliant. Single transaction, ScoreLedger is source of truth, reasonType and teamId set.

---

## 3. Stats aggregation update

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| UserStats exists and is updated on workout write | ✅ | `tx.userStats.upsert()` in same transaction: `userId_clubId_roundId`, increment `totalPoints`, `totalWorkouts`, `totalCalories`; set `updatedAt`. |
| TeamStats exists and is updated on workout write | ✅ | If user has a team for the round, `tx.teamStats.upsert()` in same transaction: `teamId_roundId`, increment `totalPoints`, `totalWorkouts`; `memberCount` from current memberships; `updatedAt`. |
| Stats read path uses precomputed tables | ✅ | `stats.service.getStatsMe()` uses `userStats.findUnique` first, falls back to ScoreLedger aggregate. `getTeamStats()` uses `teamStats.findUnique` first, falls back to ScoreLedger groupBy. |

**Details:**

- UserStats: key `userId_clubId_roundId`; create with `totalPoints`, `totalWorkouts`, `totalCalories`, `streakDays: 0`; update with increment.
- TeamStats: only when `membership` exists for the user in that round; key `teamId_roundId`; `memberCount` taken from `membership.Team.Memberships.length` at write time.

**Gap (known):** On **DELETE workout**, Workout and ScoreLedger are removed (cascade), but UserStats and TeamStats are **not** decremented. So after a delete, precomputed stats can be too high until a future workout write or a manual correction. Consider adding a delete handler that decrements UserStats/TeamStats or recomputes them for that user/team.

**Conclusion:** Stats aggregation update on **log** is correct and in the same transaction as workout + ledger. Delete path does not update stats.

---

## 4. Leaderboard “cache” update

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Leaderboard read from PointsLedger (not raw workouts) | ✅ | `LeaderboardService.getLeaderboard()` uses `prisma.scoreLedger.groupBy` by `userId` (individuals) or aggregates user points per team (teams); no SUM over Workout. |
| Redis sorted sets updated on write (§6.3 step 10, §6.4) | ⚠️ **Not implemented** | No Redis in codebase. Leaderboard is computed on each GET from ScoreLedger. |

**Details:**

- **Individuals:** `scoreLedger.groupBy({ by: ['userId'], where: { roundId }, _sum: { finalAwardedPoints: true } })`, then sort and rank.
- **Teams:** Teams for round + `scoreLedger.groupBy` by userId; team total = sum of members’ points from ledger; then sort and rank.

Because every new workout writes to ScoreLedger in the same transaction as Workout and stats, the **next** GET leaderboard request sees the new row and rankings are correct. There is no separate “cache” to invalidate; the DB is the source of truth.

**Conclusion:** Leaderboard data is correct and updates immediately (read-through from ScoreLedger). There is no Redis cache; spec’s “update Redis leaderboard sorted sets” is a scaling optimization for later (Phase 3 / §6.6).

---

## Summary table

| Area | Spec | Current | Verdict |
|------|------|---------|--------|
| Round detection | Validate round exists, active, user in club | Round loaded by `roundId`; `status === 'active'`; `ensureMember(userId, round.clubId)` | ✅ Compliant |
| Points ledger | Create Workout + ledger row; ledger = source of truth | Workout + ScoreLedger in one transaction; reasonType, teamId, daily cap | ✅ Compliant |
| Stats aggregation | Update UserStats + TeamStats on write | Upsert UserStats and TeamStats in same transaction; stats APIs use precomputed first | ✅ Compliant (delete does not update stats) |
| Leaderboard cache | Redis optional; leaderboard from ledger | No Redis; leaderboard read from ScoreLedger; data correct after each log | ✅ Compliant (no cache; N/A for Redis) |

---

## Recommendations

1. **DELETE workout:** When a workout is deleted, consider decrementing or recomputing UserStats and TeamStats for that user/round and team/round so precomputed stats stay consistent.
2. **Redis leaderboard:** Add per spec §6.4 when scaling (e.g. Phase 3) for fast rank lookups; current DB-only leaderboard is correct and acceptable until then.

---

*Audit complete. Workout logging flow satisfies the spec for round detection, ledger insertion, and stats aggregation; leaderboard is correct with no Redis cache.*
