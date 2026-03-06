# FITCLUB PLATFORM — MASTER PRODUCT + ARCHITECTURE IMPLEMENTATION BRIEF

## PURPOSE

Build FitClub as a multi-club, team-based fitness competition platform with mobile-first UX and an architecture that can scale from a few hundred users to 100,000+ users without major rewrites.

This document is the source of truth for:
- product architecture
- role model
- core business rules
- navigation
- backend data model
- API expectations
- frontend screen responsibilities
- design system direction
- scaling approach
- implementation priorities

The product should feel:
- competitive
- athletic
- modern
- clean
- energetic
- community-driven

It should NOT feel:
- like a generic SaaS admin panel
- like a spreadsheet app
- like a toy fitness tracker
- like a social media clone
- overly playful or cartoonish

---

# 1. PRODUCT IDENTITY

FitClub is a community-driven fitness competition platform where users participate in club-based fitness rounds/challenges, form teams, log workouts, earn points, compete on leaderboards, and build accountability.

Core differentiator:
- team-based competition
- round/challenge-based structure
- social accountability
- individual contribution to team outcome

This is not just a workout logger.
This is not just a leaderboard.
This is a competition and motivation system.

Primary loop:
1. user logs workout
2. points are awarded
3. team score updates
4. leaderboard updates instantly
5. user sees impact
6. user returns to compete again

---

# 2. CORE DOMAIN MODEL

## 2.1 Main entities

Core entities:
- User
- Club
- ClubMembership
- Round
- Team
- TeamMembership
- Workout
- WorkoutMaster
- PointsLedger
- UserStats
- TeamStats
- ActivityFeed
- Notification
- InviteCode / InviteToken

---

# 3. ROLE MODEL

IMPORTANT:
A user does NOT have a global role.
Roles exist only in the context of a club.

Correct rule:
User -> many ClubMemberships -> role defined per club

A single user may be:
- admin in one club
- team_lead in another club
- member in another club

## 3.1 ClubMembership roles

Allowed roles:
- member
- team_lead
- admin

These roles live ONLY in ClubMembership.

Example:
ClubMembership
- id
- clubId
- userId
- role (member | team_lead | admin)
- joinedAt

## 3.2 Role permissions

### member
Can:
- join club
- view current round
- log workouts
- create team during active round
- join a team
- view team
- view leaderboard
- view past rounds

Cannot:
- create round
- manage club members
- assign roles
- manage all teams globally

### team_lead
Can do everything a member can, plus:
- add members to their team
- remove members from their team
- manage their team roster
- help organize team during active round

Cannot:
- create round
- promote members to admin
- edit club settings
- manage club-wide roles

### admin
Can do everything, plus:
- create round/challenge
- end round
- manage club members
- assign admin role
- assign team_lead role
- remove members from club
- manage teams across the club
- edit club settings
- manage invite codes / invitation flows

Important:
Admins should have full access to all teams in their club.

---

# 4. CORE BUSINESS RULES

These rules must be enforced in BOTH backend and frontend.
Backend enforcement is the source of truth.

## 4.1 Club rules
- A user can belong to multiple clubs.
- A club can have many members.
- A club creator is automatically assigned admin role in that club.
- A club should always have at least one admin.
- Admins can assign other users as admin or team_lead.
- Role is defined through ClubMembership only.

## 4.2 Round rules
- A club can have many rounds historically.
- A club can have only ONE active round at a time.
- Only admins can create a round.
- A round must have:
  - name
  - start date
  - end date
  - status
- Round statuses:
  - draft
  - active
  - completed
- A new round cannot be activated if another round in that club is active.
- After a round ends, it becomes read-only except through admin correction tools if implemented later.

## 4.3 Team rules
- Teams belong to a round.
- A round can have multiple teams.
- During an active round, members can create teams.
- A user can only belong to ONE team per round.
- Historically, a user may appear in different teams across different rounds.
- Team leads can manage members in their own team.
- Admins can manage all teams.

## 4.4 Membership rules
- A user can belong to multiple clubs.
- A user can only be in one team per round.
- A user can be a member of one team in Club A's active round and another team in Club B's active round.

## 4.5 Workout rules
- A workout belongs to:
  - user
  - club
  - round
  - optional team context via membership lookup
- Workouts create points.
- Points should be persisted and immutable after logging, unless an admin correction flow exists.
- Leaderboards should not be recalculated directly from raw workouts every time.
- Use PointsLedger and aggregate stats tables.

## 4.6 Challenge / round launch rules
When a new round is launched:
- push notification should be sent to club members
- on first app open after round start, show one-time launch modal
- update home banner context
- current round becomes the default focus of home + leaderboard

---

# 5. DATA MODEL

## 5.1 User
Fields:
- id
- name
- email
- avatarUrl
- createdAt
- updatedAt

## 5.2 Club
Fields:
- id
- name
- description (optional)
- createdBy
- createdAt
- updatedAt
- inviteCode (optional)
- isArchived (optional)

## 5.3 ClubMembership
Fields:
- id
- clubId
- userId
- role (member | team_lead | admin)
- joinedAt
- createdAt
- updatedAt

Constraints:
- unique(clubId, userId)

## 5.4 Round
Fields:
- id
- clubId
- name
- description (optional)
- startDate
- endDate
- status (draft | active | completed)
- createdBy
- createdAt
- updatedAt

Constraints:
- only one active round per club

Implementation suggestion:
- partial unique index on clubId where status = 'active'

## 5.5 Team
Fields:
- id
- clubId
- roundId
- name
- createdBy
- createdAt
- updatedAt

## 5.6 TeamMembership
Fields:
- id
- teamId
- roundId
- userId
- isLeader (boolean)
- joinedAt
- createdAt
- updatedAt

Constraints:
- unique(roundId, userId)

This enforces:
one user can only be on one team in a round

## 5.7 WorkoutMaster
This is the reference/master list of workout types from backend API.

Fields:
- id
- code
- name
- category
- requiresDuration (boolean)
- requiresDistance (boolean)
- requiresCalories (boolean, optional)
- supportsProof (boolean, optional)
- scoringMetadata (optional future)
- createdAt
- updatedAt

## 5.8 Workout
Fields:
- id
- userId
- clubId
- roundId
- workoutMasterId
- durationMinutes (nullable)
- distanceValue (nullable)
- caloriesBurned (nullable)
- notes (nullable)
- proofUrl (nullable)
- pointsAwarded
- loggedAt
- createdAt
- updatedAt

## 5.9 PointsLedger
This is critical for auditability and scale.

Fields:
- id
- userId
- clubId
- roundId
- teamId
- workoutId
- points
- reasonType (workout | adjustment | admin_override)
- createdAt

Important:
Do not compute leaderboard directly from workouts on every request.
Use PointsLedger as the scoring source of truth.

## 5.10 UserStats
Precomputed stats table.

Fields:
- id
- userId
- clubId
- roundId
- totalPoints
- totalWorkouts
- totalCalories
- streakDays
- updatedAt

## 5.11 TeamStats
Precomputed stats table.

Fields:
- id
- teamId
- clubId
- roundId
- totalPoints
- totalWorkouts
- memberCount
- updatedAt

## 5.12 ActivityFeed
Used for V2 but can be scaffolded early.

Fields:
- id
- clubId
- actorUserId
- type
- metadataJson
- createdAt

Types could include:
- WORKOUT_LOGGED
- STREAK_REACHED
- ROUND_STARTED
- TEAM_JOINED
- TEAM_CREATED
- MILESTONE_REACHED

## 5.13 Notifications
Fields:
- id
- userId
- clubId (nullable)
- type
- title
- body
- isRead
- createdAt

## 5.14 InviteCode / InviteToken
Either one simple invite code per club or expiring invite tokens.

Fields:
- id
- clubId
- code
- createdBy
- expiresAt (optional)
- isActive
- createdAt

---

# 6. SCALING ARCHITECTURE

The architecture should support growth from 300 users to 100k+ users.

## 6.1 Core stack
Recommended:
- Mobile app: React Native + Expo
- Backend API: FastAPI
- Database: PostgreSQL
- Cache / leaderboard: Redis
- File storage: S3 / R2 / GCS
- Push notifications: Firebase Cloud Messaging / Expo notifications initially
- Background jobs: Celery / RQ / worker process
- Monitoring: Sentry + Datadog / Grafana later

## 6.2 Core principle
Separate:
- transactional data
from
- aggregate/stat/leaderboard data

## 6.3 Workout logging flow
When a user logs a workout:

1. validate request
2. validate user belongs to club
3. validate there is an active round for that club
4. validate workout type / inputs
5. calculate points
6. create workout row
7. create points ledger row
8. update UserStats
9. update TeamStats
10. update Redis leaderboard sorted sets
11. optionally create ActivityFeed event
12. return updated totals to client

## 6.4 Leaderboard strategy
Use Redis sorted sets for fast rank lookups.

Examples:
- leaderboard:club:{clubId}:round:{roundId}:teams
- leaderboard:club:{clubId}:round:{roundId}:users

On score updates:
- increment sorted set scores
- return fresh rank data

## 6.5 Aggregation strategy
Do not run heavy SUM queries repeatedly.
Maintain:
- user_stats
- team_stats

These update on workout write.

## 6.6 Future scalability
At larger scale:
- separate worker process for feed generation and notifications
- add event queue if needed
- keep monolith until complexity forces a split
- do NOT overbuild microservices early

---

# 7. API STRUCTURE

## 7.1 Auth
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- POST /auth/forgot-password
- POST /auth/reset-password

## 7.2 Clubs
- GET /clubs
  - list clubs the user belongs to
- POST /clubs
  - create club
  - creator automatically becomes admin
- GET /clubs/{clubId}
- PATCH /clubs/{clubId}
  - admin only
- POST /clubs/{clubId}/join
  - via invite code or token
- POST /clubs/{clubId}/invite-code
  - admin only
- POST /clubs/{clubId}/invites
  - admin only if using email invites
- GET /clubs/{clubId}/members
- DELETE /clubs/{clubId}/members/{userId}
  - admin only

## 7.3 Club memberships / roles
- PATCH /clubs/{clubId}/members/{userId}/role
  - admin only
  - assign member / team_lead / admin

## 7.4 Rounds
- GET /clubs/{clubId}/rounds/current
- GET /clubs/{clubId}/rounds/history
- POST /clubs/{clubId}/rounds
  - admin only
- PATCH /rounds/{roundId}
  - admin only, likely only before active
- POST /rounds/{roundId}/activate
  - admin only
- POST /rounds/{roundId}/end
  - admin only
- GET /rounds/{roundId}

## 7.5 Teams
- GET /rounds/{roundId}/teams
- POST /rounds/{roundId}/teams
  - allowed during active round
- GET /teams/{teamId}
- POST /teams/{teamId}/members
  - team_lead or admin
- DELETE /teams/{teamId}/members/{userId}
  - team_lead of that team or admin
- PATCH /teams/{teamId}
- DELETE /teams/{teamId}
  - admin only or if empty and allowed

## 7.6 Workouts
- GET /workout-masters
- POST /workouts
- GET /workouts/me
- GET /workouts/recent
- GET /workouts/{workoutId}
- DELETE /workouts/{workoutId}
  - maybe only within safe window or admin only later

## 7.7 Leaderboard
- GET /clubs/{clubId}/rounds/{roundId}/leaderboard/teams
- GET /clubs/{clubId}/rounds/{roundId}/leaderboard/individuals
- GET /clubs/{clubId}/rounds/{roundId}/leaderboard/me

## 7.8 Stats
- GET /clubs/{clubId}/rounds/{roundId}/stats/me
- GET /teams/{teamId}/stats
- GET /clubs/{clubId}/stats/overview

## 7.9 Feed
- GET /clubs/{clubId}/feed
- POST /feed/{feedId}/reactions (future)

## 7.10 Notifications
- GET /notifications
- POST /notifications/{id}/read

---

# 8. FRONTEND APP ARCHITECTURE

## 8.1 Tech
- React Native + Expo
- React Query or Zustand (or both)
- dedicated services/api layer
- reusable design system
- centralized theme tokens
- no hardcoded colors scattered around

## 8.2 Suggested folder structure

```
/src
  /api
    client.ts
    authService.ts
    clubService.ts
    roundService.ts
    teamService.ts
    workoutService.ts
    leaderboardService.ts
    statsService.ts
    notificationService.ts
  /components
    Button.tsx
    Card.tsx
    MetricCard.tsx
    SectionHeader.tsx
    Banner.tsx
    Input.tsx
    StatPill.tsx
    ProgressBar.tsx
    EmptyState.tsx
    Avatar.tsx
    RoleBadge.tsx
  /screens
    HomeScreen.tsx
    LeaderboardScreen.tsx
    LogWorkoutScreen.tsx
    TeamScreen.tsx
    ProfileScreen.tsx
    AdminToolsScreen.tsx
    CreateRoundScreen.tsx
    ManageMembersScreen.tsx
    RoundHistoryScreen.tsx
    JoinClubScreen.tsx
    CreateClubScreen.tsx
  /hooks
    useCurrentClub.ts
    useCurrentRound.ts
    useUserStats.ts
    useLeaderboard.ts
    useTeam.ts
    useNotifications.ts
  /store
    appStore.ts
    authStore.ts
    clubStore.ts
  /theme
    colors.ts
    spacing.ts
    typography.ts
    radius.ts
    elevation.ts
    index.ts
  /types
    api.ts
    models.ts
  /utils
    formatters.ts
    date.ts
    validations.ts
```

---

# 9. NAVIGATION MODEL

Bottom navigation should stay focused on high-frequency behavior.

Recommended bottom tabs:
1. Home
2. Leaderboard
3. Log Workout (center action button)
4. Team
5. Profile

Do NOT include Challenges / Rounds as a bottom tab.
Reason:
Rounds are admin-created infrastructure, not a daily user destination.

Where challenge/round functionality lives:
- current round context: Home + Leaderboard
- past rounds: Leaderboard or Profile
- create/manage round: Profile -> Admin Tools

---

# 10. SCREEN RESPONSIBILITIES

## 10.1 Home Screen
Purpose:
Personal performance hub.
User-first, not club-first.

Should show:
1. welcome / dynamic status banner
2. personal metrics:
   - workouts
   - calories burned
   - streak
3. weekly activity chart
4. contribution to team
5. team summary
6. recent activity

Must NOT show:
- create club
- join club
- club selector

Club switching should live in Profile.

The home screen should answer:
- how am I doing?
- what should I do next?
- why does my effort matter?

## 10.2 Leaderboard Screen
Purpose:
Competition tension.

Primary focus:
current round

Secondary access:
historical rounds

Structure:
- compact round header
- competitive insight strip
- toggle: teams / individuals
- top 3 podium
- ranked list
- highlight current user/team
- view past rounds link

Must feel:
- competitive
- high contrast
- slightly intense
- structured

## 10.3 Log Workout Screen
Purpose:
Fastest and most rewarding flow in the app.

Must feel:
- slightly bold
- energetic
- minimal friction
- not like boring form entry

Structure:
1. quick log card
   - last workout
   - repeat
   - edit
2. activity selection
3. dynamic numeric inputs
4. live points preview
5. optional proof / notes section
6. sticky bottom CTA
7. success celebration overlay
8. instant leaderboard / stats update

Requirement:
Leaderboard and stats should update immediately after log.

## 10.4 Team Screen
Purpose:
Show team identity, performance, and member roster.

Should show:
- current round + team header
- team performance card
- team members list
- points contributed per member
- team lead / admin actions if allowed
- create/join team states if unassigned

Conditional actions:
- team_lead/admin can add/remove team members
- adding member must check if user is already in another team this round

## 10.5 Profile Screen
Purpose:
Identity + memberships + control center

Should show:
1. identity section
2. my clubs
3. join club
4. create club
5. admin tools if applicable
6. past rounds
7. preferences

This is where club switching should happen.

## 10.6 Admin Tools Screen
Purpose:
Club administration and operational control

Should only appear if ClubMembership.role == admin

Sections:
1. round management
2. member management
3. team management
4. club settings

Admins should be able to:
- create round
- end round
- assign roles
- manage members
- manage teams
- edit invite code
- edit club name

---

# 11. DESIGN SYSTEM DIRECTION

The current problem in the UI is too much neutrality and not enough semantic color / excitement.

Desired visual personality:
- competitive athletic
- clean modern tech
- structured
- energetic
- bold but not gaudy

Think:
Strava x Linear x Nike Training Club

## 11.1 Semantic colors
Use semantic colors, not random one-off hex values.

Core color roles:
- primary = brand / actions
- energy = points / workouts / active progress
- success = streaks / goals / completed state
- competition = podium / rank / leaderboard emphasis
- neutral = layout

Suggested values:
- primary: #2563EB
- primarySoft: #EFF6FF
- energy: #F97316
- energySoft: #FFF7ED
- success: #22C55E
- successSoft: #ECFDF5
- competition: #F59E0B
- background: #F8FAFC
- card: #FFFFFF
- border: #E2E8F0
- textPrimary: #0F172A
- textSecondary: #64748B
- danger: #EF4444

## 11.2 Typography
Numbers must dominate.
Metrics should feel celebrated.

Use styles for:
- hero
- title
- section
- body
- caption
- metric

## 11.3 Spacing
Use fixed spacing scale:
- xs = 4
- sm = 8
- md = 16
- lg = 24
- xl = 32

## 11.4 Radius
Avoid overly bubbly UI.

Suggested:
- sm = 6
- md = 10
- lg = 16

## 11.5 Elevation
Cards should not be flat against background.
Use subtle shadows for hierarchy.

---

# 12. MOMENTUM / PROGRESS SYSTEM

This is one of the biggest engagement drivers.

The UI should not just show static numbers.
It should show momentum.

Implement these progress layers:

## 12.1 Daily progress
Show progress toward daily cap or daily goal.

Examples:
- progress bar
- progress ring

## 12.2 Weekly momentum
Show weekly activity visually.
Use:
- weekly chart
- streak indicator
- active-day markers

## 12.3 Round contribution
Show:
- points contributed to team this round
- percentage of team total
- team progress bar

## 12.4 Rank movement
Show:
- up/down rank changes
- gap to #1
- gap to next rank

## 12.5 Milestones
Future:
- 5 workouts
- 100 points
- 7 day streak

---

# 13. QUICK LOG

Quick Log is a core engagement feature.

It should appear at the top of Log Workout screen.

Minimum version:
- show last workout
- repeat
- edit

Future version:
- show last 3 workouts
- most frequent workout
- smart suggested workout

Quick Log should be optimized for minimal taps.

---

# 14. NOTIFICATION STRATEGY

When a new round starts, use layered communication:

1. push notification
2. one-time launch modal on next app open
3. persistent home banner context

Other notification triggers:
- team added you
- rank changed
- milestone reached
- round ending soon

---

# 15. V1 / V2 / V3 PRODUCT IMPLEMENTATION ROADMAP

## V1 — Competitive Core
Goal:
Run an entire club season without WhatsApp + spreadsheets.

Build:
- auth
- clubs
- club memberships with roles
- round creation and activation
- team creation and team joining
- workout logging
- points engine
- points ledger
- user stats
- team stats
- home
- leaderboard
- log workout
- team
- profile
- admin tools
- push for round start
- one-time challenge launch modal

V1 must deliver:
- smooth core competition loop
- clean admin control
- real-time leaderboard feel

## V2 — Social Engagement Layer
Goal:
Make the app sticky even when users are not logging.

Build:
- activity feed
- reactions
- milestones
- weekly summary
- round wrap-up
- rank change indicators
- richer notifications
- smarter quick log

## V3 — Platform and Scale
Goal:
Expand beyond one-off clubs into larger ecosystems.

Build:
- organization / league model
- cross-club competition
- public clubs
- wearable integrations
- premium analytics
- corporate wellness support

---

# 16. STATE MANAGEMENT + CLIENT DATA FLOW

Use React Query (recommended) for server state:
- current club
- current round
- user stats
- leaderboard
- team data
- workout masters
- activity feed

Use a light local store for:
- selected club
- auth session
- local UI preferences
- notification badge count
- last quick log data

When workout is logged:
- optimistically update local home stats
- optimistically update leaderboard snippet if practical
- sync from backend response
- invalidate related queries

Important:
Do not wait too long before showing success.
The app should feel immediate.

---

# 17. VALIDATION RULES

Backend must always validate:
- user belongs to club
- club has active round if operation requires it
- user has required club role
- user is not already on another team this round
- round status permits action
- workout type and inputs are valid
- admin cannot accidentally remove the last admin

Frontend should provide:
- inline validation
- specific error messages
- no generic failure toasts if avoidable

Examples:
- "This user is already on another team in this round."
- "Only admins can create a round."
- "This club already has an active round."
- "Distance is required for this workout type."

---

# 18. SECURITY / INTEGRITY RULES

Never trust the client for:
- role checks
- team eligibility
- membership status
- round status
- points calculation

Backend must own:
- permissions
- constraints
- scoring
- final points

Prefer immutable points records via PointsLedger.

---

# 19. NON-FUNCTIONAL REQUIREMENTS

- mobile-first UX
- fast leaderboard response
- scalable stats architecture
- minimal client friction
- durable audit trail for scoring
- resilient to high write frequency during popular workout windows

---

# 20. IMPLEMENTATION PRIORITY ORDER

## Phase 1
- finalize schema
- implement ClubMembership role model
- implement round constraints
- implement team constraints
- implement workout logging
- implement points ledger
- implement UserStats and TeamStats
- implement core APIs

## Phase 2
- build Home
- build Leaderboard
- build Log Workout
- build Team
- build Profile
- build Admin Tools

## Phase 3
- add Redis leaderboards
- add push notifications
- add round start modal
- add quick log polish
- add rank movement and momentum UI

## Phase 4
- add activity feed scaffold
- add milestones scaffold
- add round wrap-up

---

# 21. WHAT TO AVOID

Do NOT:
- put global role on user
- compute leaderboards directly from workouts every request
- scatter admin actions across multiple random tabs
- put Challenges as bottom nav tab
- clutter Home with club creation/joining actions
- build overly soft / gray / generic SaaS visuals
- overbuild microservices too early

---

# 22. WHAT SUCCESS LOOKS LIKE

A successful V1 means:
- a club admin can create a club
- invite users
- create a round
- users can create/join teams
- users can log workouts
- points update immediately
- team and individual leaderboards feel live
- users can clearly see their contribution
- clubs can complete a round without external spreadsheets or WhatsApp coordination

A successful V2 means:
- users open the app even when not logging
- activity feed and milestones create emotional pull
- rounds feel like real "seasons"

A successful V3 means:
- clubs beyond the original community can adopt FitClub easily
- organizations can run structured competitions at scale
- the platform can monetize cleanly

---

# 23. ENGINEERING QUALITY REQUIREMENTS

Cursor should help refactor code toward:
- reusable components
- centralized design tokens
- no hardcoded roles outside club membership context
- no hardcoded colors everywhere
- service-based API access
- predictable screen responsibilities
- scalable data-fetching patterns
- clear permission boundaries

---

# 24. CURSOR INSTRUCTION FOR FUTURE WORK

When making changes to this codebase, always follow these rules:

1. Roles live only in ClubMembership.
2. One club can have only one active round.
3. One user can only be on one team per round.
4. Admin tools belong in Profile -> Club -> Admin Tools.
5. Home must remain user-first.
6. Challenges / rounds should not be a bottom nav tab.
7. Leaderboard should focus on the current round, with historical rounds secondary.
8. Workout logging must feel fast and rewarding.
9. All points must be persisted in PointsLedger.
10. Use precomputed stats tables for performance.
11. Use semantic color tokens and centralized design system.
12. Preserve a competitive athletic visual direction.
13. Do not introduce architecture that would make scaling to 100k users difficult.
14. Prefer additive, modular changes over brittle hacks.

End of document.
