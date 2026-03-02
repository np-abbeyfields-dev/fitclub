# Product Context

## Problem Statement

### Current State (Manual System)

- Workout tracking via MapMyRide screenshots; manual logging in Google Sheets.
- Team assignments and leaderboards updated manually; communication via WhatsApp.
- Error-prone scoring; high admin overhead; not scalable or monetizable.
- No real-time leaderboards, anti-cheat validation, or analytics.

### Opportunity

Build a scalable SaaS platform that automates scoring, supports multiple independent clubs, reduces admin workload, and creates monetization pathways beyond the current ~300-user community.

## Solution

### What We're Building

A **community-driven, team-based fitness competition platform**. Clubs run time-bound **Rounds**; participants are assigned to **Teams** and log **Workouts**; the system calculates points and serves **Individual** and **Team Leaderboards** in near real time. Admins create rounds and manage members; participants stay motivated through team accountability and friendly competition.

### How It Works

**Core flow (Participant):** Join club (invite code) → See active round & team → Log workouts (type, duration, distance, optional proof) → Points auto-calculated → View individual + team leaderboards and personal analytics.

**Core flow (Admin):** Create club → Invite members → Create round (dates, rules, daily cap, activity types) → Assign teams (auto or manual) → Monitor leaderboards and analytics → Export results when round ends.

**Concepts:** **Club** (container: members, rounds, teams); **Round** (season with start/end, rules, teams); **Team** (belongs to round; members accumulate team points); **Workout** (activity + optional proof → points).

## User Experience Goals

### Design Principles

1. **Community-first** — Clear sense of club and team; leaderboards and streaks drive motivation.
2. **Admin-light** — Round setup and team assignment are streamlined; automation over manual work.
3. **Transparent scoring** — Rules visible; points deterministic and auditable.
4. **Mobile + Web** — Full experience on phone; web for admin and desktop use.

### Personas

- **Participant** — Wants to log workouts quickly, see rank and team standing, stay accountable.
- **Club Admin** — Wants to create rounds, set rules, assign teams, and see engagement without spreadsheets.
- **Team Captain** (optional) — Wants to see team engagement and nudge members.

---

*Detailed requirements: [FITCLUB_PRD.md](./FITCLUB_PRD.md).*
