# Role-Based Access Audit — ClubMembership.role

**Date:** 2025-03-05  
**Scope:** All API endpoints that depend on club context; checks use `ClubService.ensureMember(userId, clubId, requireRole?)` or explicit `membership.role` checks.

**Spec reference:** FITCLUB_MASTER_SPEC.md §3 — Roles exist only in ClubMembership; member / team_lead / admin permissions.

**Mechanism:** `ClubService.ensureMember(userId, clubId, requireRole?)` returns the membership or throws `AuthorizationError`. Optional third argument: `'admin'` (only admin), `'team_lead'` (admin or team_lead), `'member'` (any member). Omitted = any club member.

---

## 1. Club routes (`/api/clubs`)

All require authentication (`authenticate` middleware). Club context from `:clubId` unless noted.

| Endpoint | Controller | Service / role check | Spec expectation | Status |
|----------|------------|----------------------|------------------|--------|
| POST / | create | ClubService.createClub — no membership (creator becomes admin) | Any user can create club | ✅ |
| POST /join | join | ClubService.joinByInviteCode — no membership (join creates member) | Any user can join with code | ✅ |
| GET / | listMine | ClubService.listMyClubs — no clubId (lists user's clubs) | Member sees own clubs | ✅ |
| GET /:clubId | getById | ClubService.getClub → ensureMember(userId, clubId) | Member can view club | ✅ |
| GET /:clubId/dashboard | getDashboard | DashboardService.getDashboard → ensureMember(userId, clubId) | Member | ✅ |
| GET /:clubId/members | listMembers | ClubService.listMembers → ensureMember(userId, clubId) | Member | ✅ |
| GET /:clubId/feed | getFeed | FeedService.getClubFeed → ensureMember(userId, clubId) | Member | ✅ |
| GET /:clubId/rounds/:roundId/stats/me | getStatsMe | StatsService.getStatsMe → ensureMember(userId, clubId) | Member | ✅ |
| GET /:clubId/stats/overview | getStatsOverview | StatsService.getClubStatsOverview → ensureMember(userId, clubId) | Member | ✅ |
| PATCH /:clubId/members/:userId/role | setMemberRole | ClubService.setMemberRole → ensureMember(adminUserId, clubId, **'admin'**) | Admin only | ✅ |
| DELETE /:clubId/members/:userId | removeMember | ClubService.removeMember → ensureMember(adminUserId, clubId, **'admin'**) | Admin only | ✅ |

---

## 2. Round routes (`/api/clubs/:clubId/rounds`, `/api/rounds`)

Round operations resolve club via round (round.clubId). All require auth.

| Endpoint | Controller | Service / role check | Spec expectation | Status |
|----------|------------|----------------------|------------------|--------|
| POST /clubs/:clubId/rounds | create | RoundService.createRound → ensureMember(userId, clubId, **'admin'**) | Admin only: create round | ✅ |
| GET /clubs/:clubId/rounds | listByClub | RoundService.listRoundsByClub → ensureMember(userId, clubId) | Member | ✅ |
| GET /rounds/:roundId | getById | RoundService.getRound → ensureMember(userId, round.clubId) | Member | ✅ |
| GET /rounds/:roundId/leaderboard | getLeaderboard | LeaderboardService.getLeaderboard → ensureMember(userId, round.clubId) | Member | ✅ |
| GET /rounds/:roundId/summary | getRoundSummary | RoundService.getRoundSummary → ensureMember(userId, round.clubId) | Member | ✅ |
| POST /rounds/:roundId/workouts | logWorkout | workout.service.logWorkout → ensureMember(userId, round.clubId) | Member (log workouts) | ✅ |
| POST /rounds/:roundId/activate | activate | RoundService.activateRound → ensureMember(userId, round.clubId, **'admin'**) | Admin only | ✅ |
| PATCH /rounds/:roundId | update | RoundService.updateRound → ensureMember(userId, round.clubId, **'admin'**); then status === 'draft' | Admin only, draft only | ✅ |
| POST /rounds/:roundId/end | end | RoundService.endRound → ensureMember(userId, round.clubId, **'admin'**) | Admin only: end round | ✅ |

---

## 3. Team routes (`/api/rounds/:roundId/teams`)

Club context from round. All require auth.

| Endpoint | Controller | Service / role check | Spec expectation | Status |
|----------|------------|----------------------|------------------|--------|
| POST /rounds/:roundId/teams | create | TeamService.createTeam → ensureMember(userId, round.clubId) | Member (create team when active) | ✅ |
| GET /rounds/:roundId/teams | listByRound | TeamService.listTeamsByRound → ensureMember(userId, round.clubId) | Member | ✅ |
| GET /rounds/:roundId/my-team | getMyTeam | TeamService.getMyTeamSummary → ensureMember(userId, round.clubId) | Member | ✅ |
| GET /rounds/:roundId/teams/:teamId/summary | getTeamSummary | TeamService.getTeamSummary → ensureMember(userId, round.clubId) | Member | ✅ |
| GET /rounds/:roundId/teams/:teamId/stats | getTeamStats | StatsService.getTeamStats → ensureMember(userId, team.Round.clubId) | Member | ✅ |
| POST /rounds/:roundId/teams/:teamId/members | addMember | TeamService.addMemberToTeam → ensureMember(caller, round.clubId); then **admin OR (team_lead AND caller in same team)** | Admin or team_lead (own team) | ✅ |
| DELETE /rounds/:roundId/teams/:teamId/members/:userId | removeMember | TeamService.removeMemberFromTeam → ensureMember(caller, round.clubId); then **admin OR (team_lead AND caller in same team)** | Admin or team_lead (own team) | ✅ |

---

## 4. Workout routes (`/api/workouts`)

| Endpoint | Controller | Service / role check | Spec expectation | Status |
|----------|------------|----------------------|------------------|--------|
| GET /workouts/activities | listActivities | None (global reference data) | Any authenticated user | ✅ |
| GET /workouts/workout-master | listWorkoutMaster | None (global reference data) | Any authenticated user | ✅ |
| GET /workouts/me | listMyWorkouts | None — filters by userId (and optional roundId) | User's own workouts | ⚠️ See note |
| GET /workouts/:id | getWorkoutById | getWorkoutById → ensureMember(userId, workout.Round.clubId) | Member of club that owns round | ✅ |
| DELETE /workouts/:id | deleteWorkout | ensureMember(userId, clubId); then **owner OR admin** (membership.role === 'admin') | Owner or admin | ✅ |

**Note (GET /workouts/me):** No club check when `roundId` is provided. Caller can pass any roundId and see their own workouts for that round; if they are not in that round’s club, they could still see the list. Acceptable if rounds are considered non-sensitive IDs; for stricter isolation, add ensureMember when roundId is present (resolve round → clubId, then ensureMember(userId, clubId)).

---

## 5. Notification routes (`/api/notifications`)

| Endpoint | Controller | Service / role check | Spec expectation | Status |
|----------|------------|----------------------|------------------|--------|
| GET /notifications | listNotifications | None — filter by req.user.id | User's own notifications | ✅ |
| POST /notifications/:id/read | markNotificationRead | findFirst({ id, userId }) — only owner can mark read | User's own notification | ✅ |

No club-scoped role check; notifications are per-user. ✅

---

## 6. Auth and user routes

- **Auth routes** (`/api/auth`): login, register, refresh — no club. ✅  
- **User routes**: not listed in club routes above; if there are profile/me endpoints they typically don’t use ClubMembership. (Not audited in detail here.)

---

## 7. Summary

| Category | Endpoints | Admin-only | Team lead (own team) | Member | Notes |
|----------|-----------|------------|------------------------|--------|--------|
| Club | 11 | setMemberRole, removeMember | — | rest | ✅ |
| Round | 9 | create, activate, update, end | — | list, get, leaderboard, summary, logWorkout | ✅ |
| Team | 7 | — | addMember, removeMember (when own team) | create, list, my-team, summary, stats | ✅ |
| Workout | 5 | delete (or owner) | — | getById; list/activities global or self | ⚠️ listMyWorkouts no club check when roundId set |
| Notifications | 2 | — | — | self only | ✅ |

**Conclusion:** Role-based access is consistently enforced via `ClubService.ensureMember` with the correct `requireRole` for admin-only and member-only operations. Team lead can add/remove members only for their own team (explicit `callerInTeam.teamId === teamId` check). DELETE workout allows owner or club admin. The only optional hardening is GET /workouts/me with roundId: consider ensuring the user is a member of that round’s club before returning list.
