# Inter-club challenge rounds — data model plan

## Current model (intra-club only)

- **Club** has many **Rounds** (one club per round).
- **Round** has many **Teams**; each round has one **clubId**.
- **Team** has many **TeamMemberships** (users). Workouts and **ScoreLedger** are scoped by **roundId** (and **userId**, **teamId**).
- So: one club → many rounds → each round has its own teams and scoring. No link between two clubs in a single competition.

---

## Goal: “Club A challenges Club B”

We need to model a **single competition** that involves **two (or more) clubs**, with a clear way to:

- Define the challenge (who vs who, when, how it’s scored).
- Reuse or link existing concepts (rounds, teams, workouts, points).
- Compare results across clubs (e.g. total points per club, or per round).

Assumptions for the plan:

- Each club keeps its **own rounds and teams** (no shared round across clubs).
- “Challenge” is a **container** that links two (or N) clubs and defines how their results are compared.
- We don’t change the core **Workout / ScoreLedger / Team** model; we only add challenge-related entities and optional links.

---

## Option 1: Challenge links two clubs; each club uses “its own” round (recommended)

**Idea:** A challenge is a fixed pairing (or list) of clubs. Each participating club has **one round** that is designated as “this club’s round for this challenge.” Scoring stays per round (and per club) as today; we compare by aggregating those rounds (e.g. total points per club in their challenge round).

**New entities:**

| Model | Purpose |
|-------|--------|
| **Challenge** | The inter-club competition. `id`, `name`, `startDate`, `endDate`, `status` (draft \| active \| completed), `createdAt`, `createdByClubId?`, `scoringType?` (e.g. `total_points` \| `avg_per_member`). |
| **ChallengeParticipant** | Links a club (and optionally a round) to a challenge. `challengeId`, `clubId`, `roundId` (nullable until the club assigns a round). Unique `(challengeId, clubId)`. |

**Relations:**

- **Challenge** 1──* **ChallengeParticipant** (each row = one club in the challenge).
- **ChallengeParticipant** belongs to **Club** and optionally to **Round** (the round that club uses for this challenge).
- **Round** unchanged; we only add optional `challengeParticipantId` or keep the link only on ChallengeParticipant (`roundId`).

**Flow:**

1. Club A creates a **Challenge** (e.g. “FitClub Cup”), adds itself and Club B as **ChallengeParticipants** (roundId null for both).
2. Each club assigns **its own round** to the challenge (set `roundId` on their ChallengeParticipant). Those rounds can be existing rounds or created for the challenge; they remain normal rounds (teams, workouts, scoring per round).
3. While the challenge is active, workouts logged in those rounds count as today. At the end, we **compare** e.g. sum of points per club in their challenge round (read from existing ScoreLedger / UserStats or Round aggregates).

**Pros:** Minimal change. Rounds and teams stay per-club; no shared round. Reuses all existing round/team/workout logic. Clear “this round is our challenge round” per club.  
**Cons:** Two rounds (one per club) to manage; comparison logic lives in application code (query by challengeId → participants → roundIds → aggregate).

---

## Option 2: One “cross-club” round shared by multiple clubs

**Idea:** A **Round** can involve **multiple clubs**. So we break Round’s 1:1 with Club and introduce a many-to-many “round–club” relation.

**Schema changes:**

- **Round** loses required `clubId` (or we keep it as “owner” and add a separate participation relation).
- New **RoundClub** (`roundId`, `clubId`) with unique `(roundId, clubId)`: which clubs participate in this round.
- **Team** gets optional `clubId`: team belongs to a round and (for cross-club rounds) to one of the participating clubs. So “Team Alpha” is Club A’s team in Round R; “Team Beta” is Club B’s team in the same Round R.

**Pros:** Single round for the whole challenge; one place for start/end and scoring config.  
**Cons:** Large change: Round no longer “belongs” to one club; all round-scoped logic (leaderboard, draft, “my club’s round”) must consider multiple clubs. Risk of breaking existing intra-club flows. More complex auth (who can manage this round?).

---

## Option 3: Challenge as a “virtual” comparison only (no new round concept)

**Idea:** No new entities. We only store **which two rounds** are being compared (e.g. in a small **Challenge** table: `roundIdA`, `roundIdB`, `name`, `status`). Each round stays owned by its club; “challenge” is just a link + comparison view.

**Pros:** Very small schema change (one table, two FKs).  
**Cons:** Only supports exactly two clubs (or we need roundIdC, roundIdD…). Less flexible for “challenge with 3 clubs” or “best of 2 rounds.” Naming and lifecycle (who created it, when it “starts”) are a bit ad hoc.

---

## Recommendation: **Option 1 (Challenge + ChallengeParticipant)**

- Keeps **Round** and **Team** as they are (one round per club, rounds have teams).
- Adds a clear **Challenge** concept and **ChallengeParticipant** so that:
  - A challenge has a name, dates, status.
  - Each participant is a club with an optional **roundId** (the round that club uses for this challenge).
- Comparison is done in the app: for a given challenge, load participants and their `roundId`s, then aggregate points per club from existing ScoreLedger/UserStats (or precomputed round totals).
- Later you can extend (e.g. scoring type: total points vs average per member, or “best of N” rounds) without changing the core round/team model.

---

## Option 1 — implemented (schema + migration)

**Status:** Schema and migration added. APIs and UI not yet built.

**Migration:** `backend/prisma/migrations/20260310213150_inter_club_challenge/migration.sql`

**Schema (in `backend/prisma/schema.prisma`):**

```prisma
model Challenge {
  id                String           @id @default(uuid())
  name              String
  startDate         DateTime
  endDate           DateTime
  status            ChallengeStatus  @default(draft)  // draft | active | completed
  createdByClubId   String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  CreatedByClub    Club?            @relation("ChallengeCreatedBy", fields: [createdByClubId], references: [id], onDelete: SetNull)
  Participants     ChallengeParticipant[]
}

enum ChallengeStatus {
  draft
  active
  completed
}

model ChallengeParticipant {
  id          String   @id @default(uuid())
  challengeId String
  clubId      String
  roundId     String?  // the round this club uses for this challenge (set when they “join” with a round)
  joinedAt    DateTime @default(now())

  Challenge Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  Club      Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  Round     Round?    @relation(fields: [roundId], references: [id], onDelete: SetNull)

  @@unique([challengeId, clubId])
  @@index([challengeId])
  @@index([clubId])
}
```

- **Club** gets relations: `ChallengesCreated Challenge[]` (createdByClubId), `ChallengeParticipations ChallengeParticipant[]`.
- **Round** gets optional relation: `ChallengeParticipation ChallengeParticipant?` (roundId on ChallengeParticipant). So a round can be “the round we’re using for challenge X” for at most one challenge.

**Invariants / rules (to enforce in app):**

- A challenge has exactly 2 participants (for “club vs club”); or we allow N and define comparison (e.g. leaderboard of clubs).
- When status is **active** or **completed**, each participant should have `roundId` set.
- The round’s `startDate`/`endDate` can be aligned with the challenge’s for simplicity, but we don’t require it in the schema.

---

## Summary

| Aspect | Current (intra-club) | With Option 1 (inter-club) |
|--------|----------------------|----------------------------|
| Round ownership | One club per round | Unchanged |
| Teams | Per round, per club | Unchanged |
| New concept | — | Challenge + ChallengeParticipant |
| Comparison | Per round (teams within club) | By challenge: aggregate each participant’s round (e.g. total points per club) |

Next steps (schema done):

3. Implement APIs: create challenge, invite/add second club, assign round to participant, list challenges, get challenge leaderboard (compare participants’ rounds).
4. UI: create challenge, accept/assign round, view inter-club leaderboard.

If you want to support “more than two clubs” or “best of N rounds” from day one, we can extend Option 1 (e.g. scoring type, or multiple rounds per participant) in the same plan.
