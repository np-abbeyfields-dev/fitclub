# FitClub Platform — Product Requirements Document (PRD)

**Product Name:** FitClub Platform (Working Title)  
**Version:** 1.0 (MVP)  
**Author:** Founders  
**Status:** Draft  

---

## 1. Executive Summary

FitClub Platform is a community-driven, team-based fitness competition system that enables groups (colleges, corporate teams, communities) to organize structured fitness "Rounds" where participants compete in teams through logged workouts.

The platform replaces manual tracking using WhatsApp, Google Sheets, and MapMyRide with a scalable web + mobile SaaS system.

The product emphasizes:

- Community accountability
- Friendly competition
- Team motivation
- Round-based engagement cycles

The system will support multiple clubs and scale to thousands of users.

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

- **Mobile App** (iOS + Android)
- **Web App** (Admin + Full Access)
- **Shared backend** (API-first architecture)

---

## 6. Core Concepts

### 6.1 Club

A container organization: members, rounds, teams, scoring rules.  
Example: "XYZ College FitClub".

### 6.2 Round (Season)

A time-bound competition period.

**Attributes:** Start date, end date, teams, participants, scoring model, daily caps (optional), activity types allowed.

### 6.3 Team

Belongs to a Round; has multiple participants; accumulates points from members.

### 6.4 Workout

User-submitted fitness activity.

**Fields:** Activity type, duration, distance, timestamp, optional proof (image upload), auto-calculated points.

---

## 7. Functional Requirements (MVP)

### 7.1 Authentication

- Register via email, login, reset password
- Join club via invite code
- **Non-functional:** JWT-based auth, secure password hashing, role-based access control

### 7.2 Club Management

- Admin: create club, invite members, remove members, assign admin roles
- **System:** Multi-tenant structure, data isolated per club

### 7.3 Round Creation

- Admin: create round; define start/end date, activity types, points rule, daily cap, team size
- Auto-generate teams OR manually assign
- **System:** Prevent joining after round ends; lock editing after round start (configurable)

### 7.4 Workout Logging (MVP = Manual Entry)

- Participant: log workout; select activity type; enter duration; enter distance (optional); upload proof image (optional)
- **System:** Validate input, prevent duplicate submission, apply scoring logic automatically

### 7.5 Scoring Engine

- Calculate points automatically (distance-based, duration-based, or fixed per-activity rules)
- Apply daily caps; prevent double counting
- **Scoring:** Deterministic, auditable; recalculated if rules change before round starts

### 7.6 Leaderboards

- **Individual Leaderboard:** Ranked by total points; filterable by round
- **Team Leaderboard:** Ranked by total team points; real-time updates
- **Performance:** Updates within 5 seconds; Redis caching recommended

### 7.7 Analytics Dashboard

- **Participant view:** Total workouts, total points, weekly chart, streak count
- **Admin view:** Active users %, workouts per day, team participation breakdown

### 7.8 Notifications (Basic)

- Round starting soon, round ending soon, daily reminder (optional)
- Push notifications: Phase 1 optional, Phase 2 required

---

## 8. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | 10,000 concurrent users; leaderboard queries < 300ms |
| **Scalability** | Horizontal backend scaling; stateless API; background job queue for scoring |
| **Security** | Data isolation per club; secure file uploads; rate limiting; audit logging |
| **Reliability** | 99% uptime; daily backup; zero data loss |

---

## 9. Data Model (High-Level)

**Entities:** User, Club, ClubMembership, Round, Team, TeamMembership, Workout, ScoreLedger, LeaderboardSnapshot

**Relationships:**

- User → ClubMembership → Club
- Club → Round
- Round → Team
- Team → TeamMembership → User
- User → Workout
- Workout → ScoreLedger

---

## 10. Technical Architecture

| Layer | Choice |
|-------|--------|
| **Backend** | FastAPI or Node.js |
| **Database** | PostgreSQL |
| **Cache** | Redis (leaderboards) |
| **Storage** | S3-compatible storage for images |
| **Workers** | Background workers (Celery or BullMQ) |
| **Frontend Web** | React |
| **Frontend Mobile** | React Native |
| **Infrastructure** | Containerized (Docker); AWS / GCP / Azure; CI/CD |

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

---

## 16. Go-To-Market Strategy

- **Phase 1:** Existing 300-member community; beta test internally; testimonials
- **Phase 2:** 5 other colleges; free pilot; case studies
- **Phase 3:** Corporate wellness outreach; paid acquisition experiments

---

## 17. Definition of Done (MVP)

The MVP is complete when:

- A new club can sign up
- Admin can create a round
- Users can log workouts
- Points are auto-calculated
- Team leaderboard works in real time
- Round completes successfully
- Results can be exported
