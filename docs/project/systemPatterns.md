# System Patterns

## Architecture Overview

### High-Level

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐           │
│  │   Web App (React)    │              │ Mobile (React Native)│           │
│  │   Admin + Participant│              │   Participant        │           │
│  └──────────┬──────────┘              └──────────┬──────────┘           │
└─────────────┼────────────────────────────────────┼─────────────────────┘
              │                                    │
              │         HTTPS / REST API            │
              └────────────────┬───────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI or Node.js)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │   Auth     │  │   Clubs   │  │   Rounds   │  │  Workouts / Scores  │ │
│  │   (JWT)    │  │   (CRUD)  │  │   Teams    │  │  Leaderboards       │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Background workers (scoring, notifications, leaderboard refresh)   ││
│  └────────────────────────────────────────────────────────────────────┘│
└──────────────┬───────────────────────┬────────────────────┬────────────┘
               │                       │                    │
               ▼                       ▼                    ▼
     ┌─────────────────┐    ┌─────────────────┐   ┌─────────────────┐
     │   PostgreSQL    │    │     Redis       │   │ S3-compatible   │
     │   (primary data)│    │   (leaderboards │   │ (proof images)  │
     │                 │    │    cache)       │   │                 │
     └─────────────────┘    └─────────────────┘   └─────────────────┘
```

### Data Flow (Simplified)

- **Write path:** Client → API → PostgreSQL (+ optional job to update Redis / recalc scores).
- **Leaderboard read path:** API → Redis (prefer) or PostgreSQL if cache miss; target &lt; 300ms.
- **Workout proof:** Upload → API → S3; store URL in Workout row.

---

## Data Model (Design for Backend)

Aligned with PRD §9. All tenant data scoped by `club_id` where applicable.

| Entity | Purpose | Key fields (conceptual) |
|--------|---------|--------------------------|
| **User** | Identity | id, email, hashed_password, name, created_at |
| **Club** | Tenant container | id, name, invite_code, created_at |
| **ClubMembership** | User ↔ Club + role | user_id, club_id, role (admin/member), joined_at |
| **Round** | Time-bound competition | id, club_id, name, start_date, end_date, **round_scoring_config** (see [Scoring Spec](./FITCLUB_SCORING_ENGINE_SPEC.md)), team_size, locked |
| **Team** | Team in a round | id, round_id, name, created_at |
| **TeamMembership** | User ↔ Team in a round | user_id, team_id, round_id (denorm for convenience) |
| **Workout** | Single logged activity | id, user_id, round_id, activity_type, duration_minutes, distance_km?, proof_url?, logged_at, created_at |
| **ScoreLedger** | Auditable points per workout | id, workout_id, user_id, round_id, **raw_points**, **capped_points**, **daily_adjusted_points**, **final_awarded_points**, **rule_snapshot_json**, created_at |
| **LeaderboardSnapshot** | Optional materialized view / cache key | round_id, type (individual|team), payload (JSON or ref to Redis) |

**Relationships (short):**

- User ↔ Club: many-to-many via ClubMembership.
- Club → Round: one-to-many.
- Round → Team: one-to-many.
- Team ↔ User: many-to-many via TeamMembership (within a round).
- User → Workout: one-to-many (workouts always in context of a round).
- Workout → ScoreLedger: one-to-one (or one row per workout for audit).

**Multi-tenancy:** Every query that touches rounds, teams, workouts, or members must filter by `club_id` (via round or membership). Middleware can resolve `club_id` from JWT or path and enforce isolation.

---

## Backend Design

### API Structure (REST-style)

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/join-club` (invite code).
- **Clubs:** `GET/POST /clubs`, `GET/PATCH/DELETE /clubs/:id`, `GET/POST/DELETE /clubs/:id/members`, `POST /clubs/join` (invite code).
- **Rounds:** `GET/POST /clubs/:clubId/rounds`, `GET/PATCH /clubs/:clubId/rounds/:id`, `POST .../rounds/:id/teams` (create/assign teams).
- **Teams:** `GET /clubs/:clubId/rounds/:roundId/teams`, `POST .../teams/:id/members` (assign users).
- **Workouts:** `GET/POST /clubs/:clubId/rounds/:roundId/workouts`, `GET/DELETE .../workouts/:id`; optional `GET /users/me/workouts`.
- **Leaderboards:** `GET /clubs/:clubId/rounds/:roundId/leaderboard/individual`, `.../leaderboard/team` (read from Redis or DB).
- **Analytics:** `GET /clubs/:clubId/rounds/:roundId/analytics` (admin) vs `GET /users/me/analytics` or per-round participant stats.
- **Upload:** `POST /workouts/upload-proof` (presigned or direct upload) → store URL in Workout.

All club-scoped routes must validate that the authenticated user belongs to that club and has the right role (admin vs member).

### Scoring Engine

**Full specification:** [FITCLUB_SCORING_ENGINE_SPEC.md](./FITCLUB_SCORING_ENGINE_SPEC.md)

- **Config per round:** `RoundScoringConfig` — scoring_mode (distance | duration | fixed | hybrid), daily_cap_points, per_workout_cap (optional), activity_rules[] (activity_type, metric_type, conversion_ratio, minimum_threshold, max_per_workout).
- **Algorithm:** (1) Validate workout (no negatives, above threshold, in round range, no duplicate); (2) Raw points = distance/duration × conversion_ratio or fixed; (3) Cap by max_per_workout; (4) Cap by remaining daily allowance; (5) Persist ScoreLedger (raw_points, capped_points, daily_adjusted_points, final_awarded_points, rule_snapshot_json).
- **When:** On workout create (sync or async); before round start allow full recalc if rules change; after start no rule changes or trigger full recalc.
- **Idempotency:** Reject duplicate submission; one workout = one ledger entry.
- **Performance targets:** Score calc &lt; 50ms; leaderboard update &lt; 100ms.

### Background Jobs

- After new score: update Redis leaderboard sorted sets (see below).
- Notifications: round starting soon, ending soon, daily reminder (optional).
- Future: export round results (e.g. CSV).

### Caching (Redis) — Leaderboards

Per [FITCLUB_SCORING_ENGINE_SPEC.md](./FITCLUB_SCORING_ENGINE_SPEC.md) §11:

- **Individual:** `ZINCRBY leaderboard:user:<round_id> final_awarded_points user_id` (Redis sorted set).
- **Team:** `ZINCRBY leaderboard:team:<round_id> final_awarded_points team_id`.
- ScoreLedger in Postgres remains source of truth; Redis enables O(log n) ranking and instant fetch; target &lt; 5s freshness.

---

## Frontend Design

### Web App (React)

- **Auth:** Login, register, forgot/reset password, join-by-invite-code flow.
- **Participant:** Club home (active round, my team), log workout (form: type, duration, distance, proof upload), view individual + team leaderboards, personal analytics (totals, weekly chart, streaks).
- **Admin:** Club settings, create/edit round (dates, rules, daily cap, activity types, team size), team assignment (auto generate or manual drag/drop), member list (invite, remove, assign admin), round analytics (active users %, workouts/day, team breakdown), export results.
- **Routing:** e.g. `/login`, `/register`, `/join`, `/clubs`, `/clubs/:id`, `/clubs/:id/rounds`, `/clubs/:id/rounds/:roundId`, `/clubs/:id/rounds/:roundId/leaderboard`, `/clubs/:id/rounds/:roundId/workouts`, `/settings` (profile, clubs).
- **State:** Server state (API) via React Query or similar; auth state (JWT, user, current club) in context or store; minimal local UI state.

### Mobile App (React Native)

- **Participant-focused:** Login/register, join club (invite code), view active round and team, log workout (same fields as web), view leaderboards and personal stats.
- **Offline:** MVP can be online-only; later consider caching last leaderboard and queueing workout submits.
- **Navigation:** Bottom tabs or stack: Home (round/team summary), Log Workout, Leaderboard, My Activity / Analytics, Profile/Settings.

### Shared

- **API client:** Base URL, JWT in header, interceptors for 401 (refresh or re-login).
- **Types:** Align with backend DTOs (User, Club, Round, Team, Workout, LeaderboardEntry, etc.).

---

## Project Structure (Suggested)

```
FitClub/
├── backend/                 # FastAPI or Node
│   ├── app/
│   │   ├── api/             # Routes by domain (auth, clubs, rounds, workouts, leaderboard)
│   │   ├── core/            # Config, security, middleware
│   │   ├── models/          # DB models
│   │   ├── schemas/         # Request/response DTOs
│   │   ├── services/        # Business logic (scoring, leaderboard)
│   │   └── jobs/            # Background tasks
│   ├── migrations/
│   └── tests/
├── web/                     # React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/             # API client
│   │   ├── auth/
│   │   └── ...
│   └── package.json
├── mobile/                  # React Native
│   ├── src/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── api/
│   │   └── ...
│   └── package.json
└── docs/
```

---

*PRD: [FITCLUB_PRD.md](./FITCLUB_PRD.md). Scoring: [FITCLUB_SCORING_ENGINE_SPEC.md](./FITCLUB_SCORING_ENGINE_SPEC.md). Tech: [techContext.md](./techContext.md).*
