# Project Brief: FitClub

## Project Overview

FitClub Platform is a community-driven, team-based fitness competition system. Groups (colleges, corporate teams, communities) organize structured fitness "Rounds" where participants compete in teams through logged workouts. The platform replaces manual tracking (WhatsApp, Google Sheets, MapMyRide) with a scalable web + mobile SaaS system.

**Vision:** *"Fantasy Football for Fitness."* — Transform social motivation into sustainable health habits.

## Core Objectives

1. **Automate competition** — Replace manual scoring, leaderboards, and team assignment with a deterministic, auditable system.
2. **Multi-tenant scale** — Support multiple independent clubs and thousands of users with strict data isolation.
3. **Reduce admin burden** — Round creation, team assignment (auto or manual), and scoring run with minimal manual work.
4. **Monetization-ready** — Create pathways for club subscriptions, per-round pricing, and corporate wellness (Phase 2).

## Target Audience

- **Primary:** College fitness groups, corporate wellness groups, church/community groups, alumni networks, amateur sports communities.
- **Personas:** Participant (logs workouts, motivated by team), Club Admin (creates rounds, manages members), Team Captain (optional; encourages engagement).

## Platform Requirements

- **Mobile App** — iOS + Android (React Native).
- **Web App** — Admin + full participant access (React).
- **Backend** — API-first; shared by web and mobile; horizontal scaling; stateless.

## Core Features (MVP)

1. **Auth** — Register/login (email), reset password, join club via invite code; JWT, RBAC.
2. **Clubs** — Create club, invite/remove members, assign admin roles; multi-tenant isolation.
3. **Rounds** — Create round (dates, activity types, scoring rules, daily cap, team size); auto or manual teams; lock after start.
4. **Workout logging** — Manual entry: activity type, duration, distance (optional), proof image (optional); auto-scoring.
5. **Scoring engine** — Distance/duration/fixed rules; daily caps; deterministic, auditable.
6. **Leaderboards** — Individual and team; real-time (< 5s); Redis-backed.
7. **Analytics** — Participant: totals, weekly chart, streaks; Admin: active users, workouts/day, team breakdown.
8. **Notifications** — Round start/end reminders; daily reminder optional; push in Phase 2.

## Success Criteria

- 70% round completion rate; 60% returning users per round; 4+ workouts per user per week; < 10% churn per club.
- Leaderboard queries < 300ms; support 10,000 concurrent users; 99% uptime.

## Technical Constraints

- Data isolation per club; secure file uploads (S3-compatible); rate limiting; audit logging.
- No Apple Health / Strava / Garmin in MVP; no cross-club competition or marketplace in Phase 1.

## Future Considerations

- Integrations: Apple Health, Strava, Garmin.
- AI coaching, advanced gamification, public marketplace.
- Monetization: Stripe, subscription tiers, per-round pricing, corporate contracts.

---

*Source of truth for scope: [FITCLUB_PRD.md](./FITCLUB_PRD.md).*
