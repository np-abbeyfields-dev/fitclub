# FitClub Platform — Product Requirements Document (PRD)

**Product Name:** FitClub Platform (Working Title)  
**Version:** 1.0 (MVP)  
**Author:** Founders  
**Status:** Living document — reflects current implementation  
**Last Updated:** Product capabilities and API reference updated to match built features.

---

## 1. Executive Summary

FitClub Platform is a community-driven, team-based fitness competition system that enables groups (colleges, corporate teams, communities) to organize structured fitness "Rounds" where participants compete in teams through logged workouts.

The platform replaces manual tracking using WhatsApp, Google Sheets, and MapMyRide with a scalable web + mobile SaaS system.

The product emphasizes:

- Community accountability
- Friendly competition
- Team motivation
- Round-based engagement cycles

The system supports multiple clubs and is designed to scale to thousands of users.

---

## 2. Problem Statement

**Current State (Manual System):**

- Workout tracking via MapMyRide screenshots
- Manual logging in Google Sheets
- Team assignments done manually
- Leaderboards manually updated
- Communication via WhatsApp
- Error-prone scoring
- High admin overhead

**Pain Points:**

- Not scalable
- Not monetizable
- No real-time leaderboards
- No anti-cheat validation
- No analytics
- High operational burden

**Opportunity:** Build a scalable SaaS platform that automates scoring, enables multiple independent clubs, reduces admin workload, creates monetization pathways, and expands beyond the current 300-user community.

---

## 3. Product Vision

Create the leading community-based fitness competition platform that transforms social motivation into sustainable health habits.

**Positioning:** *"Fantasy Football for Fitness."*

---

## 4. Target Users

### 4.1 Primary Users

- College fitness groups
- Corporate wellness groups
- Church or community groups
- Alumni networks
- Amateur sports communities

### 4.2 User Personas

| Persona | Description |
|--------|-------------|
| **Participant** | Joins a club, competes in rounds, logs workouts, motivated by team performance |
| **Club Admin** | Creates rounds, defines scoring rules, assigns teams, manages participants |
| **Team Captain** (optional) | Encourages team members, tracks team engagement |

---

## 5. Product Scope

### 5.1 Platforms

- **Mobile App** (iOS + Android) — React Native (Expo)
- **Web App** (Admin + Full Access) — Same codebase via React Native Web
- **Shared backend** (API-first) — Node.js + Express

---

## 6. Core Concepts

### 6.1 Club

A container organization: members, rounds, teams, scoring rules.  
Example: "XYZ College FitClub". Each club has a unique **invite code** for joining.

### 6.2 Round (Season)

A time-bound competition period.

**Attributes:** Start date, end date, teams, participants, scoring model (JSON), daily cap (optional), activity types allowed. **Status:** `draft` | `active` | `ended`. Only one active round per club at a time.

### 6.3 Team

Belongs to a Round; has multiple participants (TeamMembership); accumulates points from members' ScoreLedger entries.

### 6.4 Workout

User-submitted fitness activity.

**Fields:** Activity type, duration (optional), distance (optional), timestamp (loggedAt), optional proof URL. Points are calculated and stored in ScoreLedger (one row per workout).

### 6.5 ScoreLedger

One row per workout: raw points, capped points, daily-adjusted points, final awarded points, optional rule snapshot. Source of truth for all leaderboards and dashboards.

---

## 7. Functional Requirements (MVP)

### 7.1 Authentication

- Register via email + password; login; JWT issued on success.
- Join club via invite code (separate flow from register).
- **Implementation:** JWT in `Authorization: Bearer <token>`; password hashing with bcrypt; auth middleware on protected routes. No password reset in current build.

### 7.2 Club Management

- **Admin:** Create club (name → auto invite code), invite members (share code or invite by email), remove members, set member role (admin / team_lead / member).
- **Member:** List my clubs, get club by ID, list club members (with optional search and active-round team assignment).
- **System:** Multi-tenant; all club-scoped APIs enforce membership via `ClubService.ensureMember`. Roles: admin, team_lead, member.

### 7.3 Round Creation & Lifecycle

- **Admin:** Create round (clubId, name, startDate, endDate, scoringConfig, optional teamSize, optional scheduledStartAt); update round (PATCH); activate round (POST activate); end round (POST end).
- **Any member:** List rounds by club; get round by ID; get round summary (aggregates for a round).
- **System:** Teams and workout logging only when round status is `active`; one active round per club. Optional scheduled start: cron can set status to active at `scheduledStartAt`.

### 7.4 Teams & Team Membership

- **Admin (when round not locked):** Create team (roundId, name, optional team lead userId); list teams by round; add member to team; remove member from team.
- **Participant:** Get "my team" for a round (GET my-team); get team summary (rank, total points, members with points and contribution %); get team stats.
- **Snake draft:** Round can be in draft status; GET draft state (current pick, order); POST draft-pick to assign a user to a team when it’s that team’s turn.
- **System:** Unique constraint (userId, roundId) so each user is in at most one team per round.

### 7.5 Dashboard (Participant Home)

- **API:** GET club dashboard (active round, member count, teams with points, top teams, recent workouts, current user’s today points, daily cap, my team rank/name, my round points, workout count, weekly activity, current streak, estimated calories).
- **Frontend:** Home screen shows round name, days left, today’s points vs daily cap (ring), top teams, recent activity, “How FitClub works” cards; empty states when no club or no active round; link to log workout and leaderboard.

### 7.6 Leaderboards

- **Individual:** Ranked by sum of `finalAwardedPoints` per user in round; returns rank, name, points, maxPoints, isCurrentUser.
- **Team:** Ranked by sum of members’ points; same shape.
- **API:** GET round leaderboard with `type=individuals` or `type=teams`. Frontend tabs and "You are #N" banner.

### 7.7 Workout Logging & Scoring

- **Log workout:** POST to round (activityType, durationMinutes, optional distanceKm, optional proofUrl, loggedAt); points calculated server-side per [FITCLUB_SCORING_ENGINE_SPEC.md](./FITCLUB_SCORING_ENGINE_SPEC.md).
- **List my workouts / get by ID / delete:** GET workouts/me, GET workouts/:id, DELETE workouts/:id (own workout).
- **Reference data:** GET list of activities (GenericWorkoutMet) and workout master for workout form. Scoring: daily cap, ScoreLedger per workout; optional User weight for calorie estimation.

### 7.8 Custom Challenges (Round-Scoped)

- **Model:** One round has many custom challenges; each challenge belongs to one round. Challenges can be added after the round is active and end when the round ends.
- **List:** GET /rounds/:roundId/custom-challenges (any club member); returns challenges with completedToday per user.
- **Create:** POST /rounds/:roundId/custom-challenges (name, description?, icon?, pointsAwarded); admin or team_lead; round must be active.
- **Update / delete:** PATCH and DELETE /custom-challenges/:id (admin/team_lead). Complete: POST /custom-challenges/:id/complete (optional date); one completion per user per challenge per calendar day; points apply to that round; round must still be active. Uncomplete: POST uncomplete.
- **Leaderboard & dashboard:** Custom challenge completion points included in round leaderboard and dashboard (sumPointsByUserForRound).

### 7.9 Stats, Feed, and Notifications

- **Stats:** GET club stats overview; GET my stats for a round (e.g. points, workouts).
- **Activity feed:** GET club feed (recent activity for the club).
- **Notifications:** Register Expo push token (POST /users/me/push-token); GET notifications; POST mark notification read. (Push delivery depends on backend/cron.)

### 7.10 Feedback and Support

- **Report bug / Contact:** POST /feedback/bug, POST /feedback/contact.
- **In-app:** FAQ screen, Settings (Report bug, Contact, FAQ, Club info, sign out). Club info: invite code (admin), invite by email.

### 7.11 Analytics (Planned)

- Participant and admin analytics (totals, charts, streaks, team breakdown) — planned; Analytics screen exists on web; full backend not yet implemented.

---

## 8. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | Target 10,000 concurrent users; leaderboard queries < 300ms (currently DB-backed; Redis optional later). |
| **Scalability** | Stateless API; horizontal scaling; background jobs for scoring/notifications (planned). |
| **Security** | Data isolation per club; JWT auth; rate limiting on auth and API; CORS config; security headers. |
| **Reliability** | Health checks (/api/health, /health); daily backup and zero data loss targets. |

---

## 9. Data Model (Implemented)

**Entities (Prisma/PostgreSQL):**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **User** | Identity | id, email, passwordHash, displayName, weight?, createdAt, updatedAt |
| **PushToken** | Expo push notifications | id, userId, token, platform?; unique(userId, token) |
| **Club** | Tenant | id, name, inviteCode (unique), createdAt |
| **ClubMembership** | User ↔ Club + role | userId, clubId, role (admin / team_lead / member), joinedAt; unique(userId, clubId) |
| **Round** | Time-bound competition | id, clubId, name, startDate, endDate, scoringConfig (JSON), teamSize?, locked, status (draft/active/completed), scheduledStartAt?, draftPickIndex, createdAt, updatedAt |
| **Team** | Team in a round | id, roundId, name, createdAt; optional createdByUserId (team lead) |
| **TeamMembership** | User ↔ Team in round | id, userId, teamId, roundId; unique(userId, roundId), unique(userId, teamId) |
| **Workout** | Logged activity | id, userId, roundId, activityType, durationMinutes?, distanceKm?, proofUrl?, loggedAt, createdAt |
| **ScoreLedger** | Points per workout | id, workoutId (unique), userId, roundId, rawPoints, cappedPoints, dailyAdjustedPoints, finalAwardedPoints, ruleSnapshotJson?, createdAt |
| **CustomChallenge** | Round-scoped habit challenge | id, roundId, clubId, name, description?, icon?, pointsAwarded, createdByUserId, createdAt, updatedAt |
| **CustomChallengeCompletion** | One per user per challenge per day | id, userId, customChallengeId, roundId, completionDate (YYYY-MM-DD), pointsAwarded, createdAt |
| **GenericWorkoutMet** | Reference: activity MET/config | id, workoutType, avgMetPerHour?, minMet?, maxMet?, mlp?, maxMetLimit?, metCap? |
| **WorkoutMaster** | Mapping specific → generic | id, workoutType, genericWorkoutType → GenericWorkoutMet |

**Relationships:**

- User ↔ Club: ClubMembership (many-to-many). User → PushToken (one-to-many).
- Club → Round: one-to-many. Club → CustomChallenge (via round).
- Round → Team: one-to-many. Round → CustomChallenge: one-to-many. Round → CustomChallengeCompletion: one-to-many.
- Team ↔ User: TeamMembership (many-to-many per round).
- User → Workout: one-to-many (per round). Workout → ScoreLedger: one-to-one.
- Round → ScoreLedger: one-to-many (for aggregations).
- CustomChallenge → CustomChallengeCompletion: one-to-many. Completion points roll into round totals.

---

## 10. Technical Architecture (Detailed)

### 10.1 Stack Summary

| Layer | Technology | Notes |
|-------|------------|--------|
| **Backend** | Node.js 20+, Express 4.x, TypeScript | Async via express-async-errors; no Redis in current build |
| **Database** | PostgreSQL | Prisma ORM; migrations in `backend/prisma/migrations` |
| **Auth** | JWT (jsonwebtoken), bcrypt | Token in header; auth middleware on protected routes |
| **Frontend** | React 19, React Native 0.81, Expo 54 | Single codebase: iOS, Android, Web |
| **State** | Zustand (auth), React state/context (club, UI) | No React Query in critical path; API calls via fetch in services |
| **API style** | REST; JSON; base path `/api` | All responses: `{ success, data?, error?, message? }` |

### 10.2 Repository Structure

```
FitClub/
├── backend/                    # Node.js API
│   ├── prisma/
│   │   ├── schema.prisma       # Data model
│   │   ├── migrations/         # SQL migrations
│   │   └── seed.ts             # Optional seed
│   ├── src/
│   │   ├── app.ts              # Express app, CORS, routes, error handler
│   │   ├── config/             # env, database
│   │   ├── middleware/         # auth, rateLimit, security, requestLogger, error
│   │   ├── routes/             # auth, club, round, team, workout
│   │   ├── controllers/        # Auth, Club, Round, Team, Workout
│   │   ├── services/           # Business logic (club, round, team, workout, dashboard, leaderboard)
│   │   └── utils/              # errors, etc.
│   ├── scripts/                # deploy, GCP config
│   └── package.json
├── frontend/                   # Expo (React Native + Web)
│   ├── src/
│   │   ├── components/         # Button, Card, CircularProgressRing, LeaderboardRow, etc.
│   │   ├── config/             # environment (API URL), api (getAuthToken), activities, workoutInputMap
│   │   ├── context/            # ClubContext (clubs, selectedClub, refreshClubs)
│   │   ├── data/               # mockDashboard, mockLeaderboard, mockProfile (fallback/legacy)
│   │   ├── hooks/              # useIsWeb
│   │   ├── layout/             # WebAppLayout, WebSidebar, WebTopBar, webNavConfig
│   │   ├── navigation/         # RootStack, MainTabs, HomeStack, AuthStack, WebStack, types
│   │   ├── screens/            # Home, Leaderboard, Team, Profile, Settings, CreateClub, JoinClub, Dashboard, Rounds, Teams, Members, Analytics, WorkoutNew, Landing, Login, Register
│   │   ├── services/           # clubService, roundService, teamService, workoutService (API clients)
│   │   ├── store/              # authStore (Zustand), themeStore
│   │   ├── theme/              # ThemeContext, colors, tokens, theme types
│   │   └── types/              # dashboard, leaderboard, profile, team, etc.
│   ├── app.json
│   └── package.json
└── docs/
    ├── project/                # PRD, scoring spec, system patterns, tech context, progress
    ├── setup/                  # Backend/frontend setup
    └── deployment/              # GCP, Cloud SQL
```

### 10.3 API Reference (Implemented)

Base URL: `http(s)://<host>:<port>/api`. All protected routes require `Authorization: Bearer <jwt>`.

#### Auth (no auth required for these)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Body: `{ email, password, displayName }` → user + token |
| POST | /api/auth/login | Body: `{ email, password }` → token |

#### Clubs (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/clubs | List current user's clubs (with role) |
| GET | /api/clubs/:clubId | Get club by ID (inviteCode only if admin) |
| POST | /api/clubs | Create club; body: `{ name }` → club + inviteCode |
| PATCH | /api/clubs/:clubId | Update club name (admin only) |
| POST | /api/clubs/join | Join by invite code; body: `{ inviteCode }` |
| GET | /api/clubs/:clubId/dashboard | Dashboard: active round, top teams, recent workouts, today points, daily cap, my team rank/name, weekly activity, streak, etc. |
| GET | /api/clubs/:clubId/members | Query: `?search=&activeRoundId=` → members with optional team for round |
| PATCH | /api/clubs/:clubId/members/:userId/role | Body: `{ role: 'admin' \| 'team_lead' \| 'member' }` (admin only) |
| DELETE | /api/clubs/:clubId/members/:userId | Remove member (admin only) |
| POST | /api/clubs/:clubId/invite | Invite by email; body: `{ email }` (admin only) |
| GET | /api/clubs/:clubId/rounds/:roundId/stats/me | Current user's stats for round |
| GET | /api/clubs/:clubId/stats/overview | Club stats overview |
| GET | /api/clubs/:clubId/feed | Activity feed for club |

#### Rounds (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/clubs/:clubId/rounds | List rounds for club |
| GET | /api/rounds/:roundId | Get round by ID |
| GET | /api/rounds/:roundId/summary | Round summary (aggregates, stats) |
| POST | /api/clubs/:clubId/rounds | Create round; body: name, startDate, endDate, scoringConfig, teamSize?, scheduledStartAt? |
| PATCH | /api/rounds/:roundId | Update round |
| POST | /api/rounds/:roundId/activate | Set status to active |
| POST | /api/rounds/:roundId/end | Set status to ended |
| GET | /api/rounds/:roundId/leaderboard | Query: `?type=individuals|teams` → ranked list with points, maxPoints, isCurrentUser |
| GET | /api/rounds/:roundId/draft-state | Draft state (snake draft; current pick, order) |
| POST | /api/rounds/:roundId/draft-pick | Make draft pick; body: `{ teamId, userId }` |
| POST | /api/rounds/:roundId/workouts | Log workout; body: activityType, durationMinutes?, distanceKm?, proofUrl?, loggedAt? |
| GET | /api/rounds/:roundId/custom-challenges | List custom challenges for round |
| POST | /api/rounds/:roundId/custom-challenges | Create custom challenge; body: name, description?, icon?, pointsAwarded (admin/team_lead; round must be active) |

#### Teams (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/rounds/:roundId/teams | List teams with members (User displayName, email) |
| POST | /api/rounds/:roundId/teams | Create team; body: `{ name }` (and optional team lead) |
| GET | /api/rounds/:roundId/my-team | Current user's team summary (404 if not in a team) |
| GET | /api/rounds/:roundId/teams/:teamId/summary | Team summary: rank, totalPoints, members (points, contributionPercent, isCurrentUser) |
| GET | /api/rounds/:roundId/teams/:teamId/stats | Team stats for round |
| POST | /api/rounds/:roundId/teams/:teamId/members | Add member; body: `{ userId }` |
| DELETE | /api/rounds/:roundId/teams/:teamId/members/:userId | Remove member from team |

#### Workouts (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/workouts/activities | List generic activities (GenericWorkoutMet) for workout form |
| GET | /api/workouts/workout-master | List workout type → generic mapping |
| GET | /api/workouts/me | List current user's workouts (query params as applicable) |
| GET | /api/workouts/:id | Get workout by ID |
| DELETE | /api/workouts/:id | Delete own workout |

#### Custom challenges (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| PATCH | /api/custom-challenges/:id | Update challenge (admin/team_lead) |
| DELETE | /api/custom-challenges/:id | Delete challenge (admin/team_lead) |
| POST | /api/custom-challenges/:id/complete | Complete for today or body `{ date }` (YYYY-MM-DD); idempotent |
| POST | /api/custom-challenges/:id/uncomplete | Remove completion for date |

#### User (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users/me/push-token | Register Expo push token; body: token, platform? |

#### Notifications (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | List current user's notifications |
| POST | /api/notifications/:id/read | Mark notification as read |

#### Feedback (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/feedback/bug | Report bug; body: message, etc. |
| POST | /api/feedback/contact | Contact form |

#### Internal (cron / service auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/internal/activate-scheduled-rounds | Set rounds to active when scheduledStartAt reached |
| POST | /api/internal/import-mmr-workouts | Import MMR workouts (beta) |

#### Health (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | JSON: success, message, timestamp, environment, database |
| GET | /health | 200/503 + database status (for probes) |

### 10.4 Frontend API Clients & Data Flow

- **Auth:** Token stored in Zustand (`authStore`). `getAuthToken()` used by service layer for `Authorization` header.
- **Club context:** `ClubProvider` loads clubs on mount; exposes `selectedClub`, `setSelectedClub`, `refreshClubs`. Used by Home, Leaderboard, Team, Dashboard, Rounds, Teams, Members.
- **Key flows:**
  - **Home:** `clubService.getDashboard(selectedClub.id)` → map to DashboardData (round, todayPoints, dailyCap, topTeams, recentWorkouts, teamRank).
  - **Leaderboard:** Dashboard → activeRoundId; then `roundService.getLeaderboard(roundId, 'individuals'|'teams')`; myRank from entry where `isCurrentUser`.
  - **Team:** Dashboard → activeRoundId; `teamService.getMyTeam(roundId)` → TeamDetail (or 404 → "no team" message).
  - **Teams management (web):** `roundService.listByClub` → active round; `teamService.listByRound(roundId)`; `clubService.listMembers(clubId, { activeRoundId })` for add-member modal; `teamService.addMember(roundId, teamId, userId)`.
- **Environment:** `EXPO_PUBLIC_API_URL` or default `http://<EXPO_PUBLIC_LOCAL_IP>:8080/api` (frontend points to backend).

### 10.5 Backend Services (Logic Layer)

| Service | Responsibilities |
|---------|------------------|
| **ClubService** | ensureMember, createClub, joinByInviteCode, listMyClubs, getClub, updateClub, listMembers (with optional activeRoundId → team), setMemberRole, removeMember, inviteByEmail |
| **RoundService** | createRound, listByClub, getById, getRoundSummary, update, activate, end, getDraftState, makeDraftPick; workout logging (logWorkout) |
| **TeamService** | createTeam, listTeamsByRound, addMemberToTeam, removeMemberFromTeam, getTeamSummary, getTeamStats, getMyTeamSummary |
| **DashboardService** | getDashboard(clubId, userId) — active round, teams with points, top teams, recent workouts, today points, daily cap, my team rank/name, weekly activity, streak, etc. |
| **LeaderboardService** | getLeaderboard(roundId, userId, type) — individuals or teams (includes custom challenge points) |
| **WorkoutService** | listGenericActivities, listWorkoutMaster, listMyWorkouts, getWorkoutById, deleteWorkout, logWorkout (scoring integration) |
| **CustomChallengeService** | listByRound, create(roundId), update, delete, complete, uncomplete, sumPointsByUserForRound |
| **StatsService / FeedService** | getStatsMe, getStatsOverview; getFeed |
| **NotificationService** | listNotifications, markRead; push token registration via UserController |

### 10.6 Security & Middleware

- **Auth middleware:** Validates JWT; attaches `req.user` (id, email, etc.). Used on all routes except auth and health.
- **Rate limiting:** Applied to `/api` and to auth routes (e.g. login/register).
- **CORS:** Configurable allowed origins via env; credentials true.
- **Security headers:** Helmet-style headers; optional HTTPS redirect in production.
- **Multi-tenancy:** Club-scoped operations validate membership via `ClubService.ensureMember(userId, clubId)` before any data access.

### 10.7 Database & Migrations

- **ORM:** Prisma 5.x; client generated to `node_modules/.prisma`.
- **Migrations:** Stored in `backend/prisma/migrations`; apply with `prisma migrate deploy` (prod) or `prisma migrate dev` (dev).
- **Seed:** Optional `prisma/seed.ts`; run with `prisma db seed`. Used for reference data (e.g. GenericWorkoutMet, WorkoutMaster) or test data.

### 10.8 Environment & Configuration

**Backend (e.g. `.env`):**

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for signing JWTs
- `NODE_ENV` — development | production
- `PORT` — Server port (e.g. 8080)
- `CORS_ORIGIN` — Allowed origins (comma-separated or `*`)

**Frontend:**

- `EXPO_PUBLIC_API_URL` — Override for API base (default not set)
- `EXPO_PUBLIC_LOCAL_IP` — Default 127.0.0.1 for local backend URL

### 10.9 Deployment (Reference)

- Backend: Node 20+; `npm run build` then `node dist/app.js`; can be containerized (Docker) and run on GCP Cloud Run, AWS ECS, etc.
- Database: PostgreSQL (e.g. Cloud SQL); run migrations on deploy.
- Frontend: Expo build for iOS/Android; Web export or hosting of web bundle. API base URL must point to deployed backend.
- Scripts in `backend/scripts/` (e.g. `deploy_to_dev.sh`, `gcp.config.sh`) support deployment and config; see `docs/deployment/` for details.

---

## 11. Monetization Strategy (Phase 2)

- **Model A:** Subscription per club ($49/mo up to 100 users; $99/mo 100–500 users)
- **Model B:** Per round pricing ($5 per participant per round)
- **Model C:** Corporate wellness contracts
- **Payments:** Stripe; subscription billing; invoice generation

---

## 12. Metrics for Success

**Product:** 70% round completion; 60% returning users per round; 4+ workouts/user/week; < 10% churn per club  

**Business:** CAC < $50; LTV > $200 per club

---

## 13. MVP Exclusions (Not in Phase 1)

Apple Health, Strava sync, Garmin integration, AI coaching, public marketplace, cross-club competition, advanced gamification, marketplace features.

---

## 14. Risks & Mitigation

| Risk | Mitigation |
|------|-------------|
| Cheating (fake workouts) | Daily caps, random proof audits, future API integrations |
| Engagement drop-off | Round-based model, team accountability, notifications |
| Admin overload | Automation, team auto-assignment, templates |

---

## 15. Roadmap (90 Days)

| Phase | Timeline | Focus |
|-------|----------|--------|
| **Phase 1** | 0–30 days | Auth, club model, round model, workout logging, basic scoring |
| **Phase 2** | 30–60 days | Leaderboards, analytics, admin dashboard |
| **Phase 3** | 60–90 days | Polished UI, notifications, Stripe integration, beta launch to 1 external club |

*Current implementation covers: auth, clubs, rounds, teams, dashboard, leaderboards, team summary, workout logging and scoring, custom challenges (round-scoped), stats/feed, notifications (push token, list, read), feedback, invite by email, snake draft, scheduled rounds, and web + mobile. See §18 Product Capabilities for full list. Analytics (detailed charts/breakdown) and export remain optional for MVP.*

---

## 16. Go-To-Market Strategy

- **Phase 1:** Existing 300-member community; beta test internally; testimonials
- **Phase 2:** 5 other colleges; free pilot; case studies
- **Phase 3:** Corporate wellness outreach; paid acquisition experiments

---

## 17. Definition of Done (MVP)

The MVP is complete when:

- A new club can sign up — **done**
- Admin can create a round — **done**
- Users can log workouts (submit → Workout + ScoreLedger) — **done**
- Points are auto-calculated (workouts + custom challenges) — **done**
- Team and individual leaderboards work — **done**
- Round completes successfully (activate, end) — **done**
- Custom challenges (round-scoped) for bonus points — **done**
- Results export — optional / planned

---

## 18. Product Capabilities — Built to Date

This section is the single source of truth for what the product can do today. Use it for onboarding, handoffs, or context for AI assistants.

### 18.1 Product overview

- **FitClub** is a community-driven, team-based fitness competition platform (“Fantasy Football for Fitness”).
- **Clubs** run time-bound **Rounds**; members belong to **Teams** and log **Workouts**; points are auto-calculated; **Individual** and **Team Leaderboards** are shown.
- **Platforms:** Mobile (iOS + Android via React Native/Expo) and Web (same codebase). **Backend:** Node.js + Express, API-first; PostgreSQL + Prisma.

### 18.2 Authentication

- **Register:** Email, password, displayName → user + JWT.
- **Login:** Email + password → JWT.
- **Auth:** JWT in `Authorization: Bearer <token>`; bcrypt; auth middleware on protected routes. **No password reset** in current build.

### 18.3 Clubs (multi-tenant)

- Create club (name → auto invite code). List my clubs (with role). Get club by ID (inviteCode only if admin). Update club name (admin). Join by invite code.
- List members (optional search, active-round team). Set member role (admin / team_lead / member). Remove member. Invite by email.
- Data isolation: all club-scoped APIs enforce membership. One user can be in multiple clubs.

### 18.4 Rounds (time-bound competition)

- Create round (name, startDate, endDate, scoringConfig, teamSize?, scheduledStartAt?). List rounds by club. Get round by ID. Get round summary. Update round. Activate round. End round.
- Status: draft | active | completed. One active round per club. Optional **scheduled start:** cron can set status to active at `scheduledStartAt`.

### 18.5 Teams and draft

- Create team (roundId, name; optional team lead). List teams by round. Get my team. Team summary (rank, points, members with contribution %). Team stats. Add/remove member from team.
- **Snake draft:** Draft state (current pick, order); draft-pick API to assign users to teams when it’s that team’s turn.

### 18.6 Workout logging and scoring

- Log workout (POST to round: activityType, durationMinutes?, distanceKm?, proofUrl?, loggedAt). List my workouts. Get workout by ID. Delete own workout.
- Reference: GET activities and workout master for form. Scoring engine: rules in round’s scoringConfig; daily cap; ScoreLedger per workout; optional User weight for calorie estimation.

### 18.7 Leaderboards

- Individual and team leaderboards by round; ranked by sum of points (workouts + custom challenge completions). GET with `?type=individuals|teams`. Frontend: tabs, “You are #N,” round leaderboard screen.

### 18.8 Dashboard (participant home)

- GET club dashboard: active round, membersCount, teams with points, top teams, recent workouts, today’s points, daily cap, my team rank/name, my round points, workout count, weekly activity, streak, estimated calories.
- Frontend (Home): round name, days left, today vs cap (ring), top teams, recent activity, “How FitClub works” cards; empty states; link to log workout and leaderboard.

### 18.9 Custom challenges (round-scoped)

- **Model:** One round has many challenges; each challenge belongs to one round. Challenges can be added after the round is active and end when the round ends.
- List by round. Create (admin/team_lead; round must be active). Update, delete. Complete (one per user per challenge per calendar day; round must still be active). Uncomplete.
- Points included in round leaderboard and dashboard. Frontend: Challenges tab (list, toggle complete, FAB to create); Create/Edit screens; long-press to edit/delete.

### 18.10 Stats and activity

- My stats for a round. Club stats overview. GET club activity feed.

### 18.11 Profile and past rounds

- Profile screen: user info, current club, links to Past Rounds, Rounds, Members, Teams Management, Club Info, Settings; admin tools (Create round, Rounds, Members, Teams). Past rounds list; tap → round summary. Round summary screen: stats and link to that round’s leaderboard.

### 18.12 Notifications

- Register Expo push token. List notifications. Mark as read. (Push delivery depends on backend/cron.)

### 18.13 Feedback and support

- Report bug. Contact form. FAQ screen. Settings: Report bug, Contact, FAQ, Club info, sign out. Club info: name, invite code (admin), invite by email.

### 18.14 Admin and management (by role)

- **Roles:** admin, team_lead, member (per club). Admin: full club and round management, teams, custom challenges, stats. Team lead: create/edit/delete custom challenges; team management where permitted.
- **Screens:** Rounds (list, create, round config), Round config (create/edit round, dates, scoring, team size, scheduled start, copy from past), Teams management (list teams, create, add/remove members, draft pick), Members (list, search, team for active round).

### 18.15 Internal / cron

- Health: GET /api/health, GET /health (DB check). Activate scheduled rounds (cron). Import MMR workouts (cron; beta).

### 18.16 Frontend screens (mobile-first)

- **Auth:** Landing, Login, Register.
- **Tabs:** Home, Leaderboard, Team, Challenges. (Log workout from Home.)
- **Stacks:** Home stack (Home, Join Club, Create Club, Log Workout); Root stack (tabs + Settings, Past Rounds, Round Summary, Round Leaderboard, Rounds, Round Config, Members, Teams Management, Club Info, Report Bug, Contact, FAQ, Profile, Create/Edit Custom Challenge). Profile opened from header avatar.
- **Web:** Sidebar/top bar: Dashboard, Leaderboards, Teams, Members, Rounds, Round Config, Analytics, Settings, Workout New.

### 18.17 Technical / non-functional

- REST, JSON, base `/api`; responses `{ success, data?, error?, message? }`. CORS, rate limiting, security headers, optional HTTPS. Invalid token: app can clear session and redirect to login. Theme: light/dark; design tokens (spacing, radius, colors, typography).

### 18.18 MVP exclusions (not in current build)

- Password reset, Apple Health / Strava / Garmin, AI coaching, public marketplace, cross-club competition UI, Stripe/monetization.

---

## 19. Related Documents

| Document | Description |
|----------|-------------|
| [FITCLUB_SCORING_ENGINE_SPEC.md](./FITCLUB_SCORING_ENGINE_SPEC.md) | Scoring rules, RoundScoringConfig, daily cap, activity rules |
| [systemPatterns.md](./systemPatterns.md) | High-level architecture, data flow, API shape, caching (Redis) design |
| [techContext.md](./techContext.md) | Stack choices, constraints, dependencies |
| [productContext.md](./productContext.md) | Problem, solution, UX goals |
| [projectbrief.md](./projectbrief.md) | Overview, objectives, platform, success criteria |
| [progress.md](./progress.md) | Completion status, to-do, known issues |
