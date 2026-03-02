# Active Context

## Current Status

**Phase:** Design & setup (pre-Phase 1)  
**Focus:** Frontend and backend design based on the FitClub PRD; docs are the single source of truth.

### Recent Changes

- PRD saved as [FITCLUB_PRD.md](./FITCLUB_PRD.md) (source of truth for product requirements).
- [projectbrief.md](./projectbrief.md), [productContext.md](./productContext.md), [techContext.md](./techContext.md) updated from PRD.
- [systemPatterns.md](./systemPatterns.md) updated with:
  - High-level architecture (clients → API → PostgreSQL, Redis, S3).
  - Data model: User, Club, ClubMembership, Round, Team, TeamMembership, Workout, ScoreLedger, LeaderboardSnapshot.
  - Backend: API route structure, scoring engine, background jobs, Redis caching for leaderboards.
  - Frontend: Web (React) and Mobile (React Native) screens and flows; shared API client and types.
  - Suggested repo layout: backend/, web/, mobile/, docs/.

## What We're Working On

- Using the PRD and the updated project docs to **design and then implement** frontend and backend.
- Next implementation step: choose stack (FastAPI vs Node.js, Celery vs BullMQ), then scaffold backend and define first migrations.

## Next Steps

1. Confirm backend stack (FastAPI or Node.js; job queue choice).
2. Initialize backend repo (e.g. under `backend/`): app structure, config, DB connection, first migration (User, Club, ClubMembership).
3. Implement auth (register, login, JWT) and club creation + invite-code join.
4. Add Round, Team, Workout, ScoreLedger models and scoring engine; then leaderboards (DB first, Redis in Phase 2).

## Active Decisions and Considerations

- **Backend:** PRD suggests FastAPI or Node.js; decision will drive folder layout and ORM (e.g. SQLAlchemy vs Prisma).
- **Multi-tenancy:** All club-scoped data must enforce `club_id`; consider middleware or service-layer pattern to resolve and validate club access.
- **Leaderboards:** Redis for Phase 2; Phase 1 can use DB aggregates with indexes to meet &lt; 300ms where possible.

---

*Product scope: [FITCLUB_PRD.md](./FITCLUB_PRD.md). Architecture: [systemPatterns.md](./systemPatterns.md).*
