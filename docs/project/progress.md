# Progress Tracker

## Overview

Tracks what is done, in progress, and left to build for FitClub. Aligned with the 90-day roadmap in [FITCLUB_PRD.md](./FITCLUB_PRD.md).

## Completion Status

### ✅ Completed

- [x] PRD captured as source of truth ([FITCLUB_PRD.md](./FITCLUB_PRD.md))
- [x] Docs structure: project/, setup/, deployment/, features/, guides/, testing/, archive/
- [x] Project brief, product context, tech context updated from PRD
- [x] System design: backend + frontend architecture, data model, API shape, scoring and leaderboard approach

### 🔄 In Progress

- [ ] Finalize stack choice (FastAPI vs Node.js; Celery vs BullMQ)
- [ ] Backend repo scaffolding and first migrations
- [ ] Web and mobile app scaffolding (when ready)

### 📋 To Do (Phase 1 — 0–30 days)

**Backend**

- [ ] Auth: register, login, reset password, JWT, RBAC
- [ ] Club model + CRUD; invite code; ClubMembership
- [ ] Round model + CRUD; scoring config; lock after start
- [ ] Team + TeamMembership; auto or manual assignment
- [ ] Workout model + API; validation; proof upload (S3)
- [ ] Scoring engine: rules, daily cap, ScoreLedger
- [ ] PostgreSQL migrations; multi-tenant isolation in queries

**Frontend (after backend core)**

- [ ] Web: auth flows, join-by-invite, club home
- [ ] Web: round creation (admin), team assignment
- [ ] Web: workout logging form, leaderboard views
- [ ] Mobile: auth, join club, log workout, leaderboards

### 📋 To Do (Phase 2 — 30–60 days)

- [ ] Redis-backed leaderboards (< 5s updates; < 300ms read)
- [ ] Analytics: participant (totals, chart, streaks) and admin (active %, workouts/day, team breakdown)
- [ ] Admin dashboard (rounds, members, analytics, export)

### 📋 To Do (Phase 3 — 60–90 days)

- [ ] Polished UI/UX
- [ ] Notifications (round start/end, optional daily reminder)
- [ ] Stripe integration (Phase 2 monetization)
- [ ] Beta launch to 1 external club; results export

## Definition of Done (MVP)

From PRD §17: MVP is complete when a new club can sign up, admin can create a round, users can log workouts, points are auto-calculated, team leaderboard works in real time, round completes successfully, and results can be exported.

## Known Issues

- None yet.

---

*Full roadmap: [FITCLUB_PRD.md](./FITCLUB_PRD.md) §15.*
